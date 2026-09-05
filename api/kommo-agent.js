// Vercel Serverless Function: Motor Agente IA Multi-Tenant Kommo CRM + Gemini AI + Supabase + RedTrack
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase con Service Role Key para permisos de escritura
const supabaseUrl = process.env.SUPABASE_URL || 'https://tvikvqlbpolxgbkqfmup.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();

  // Permite solicitudes GET para estado / prueba
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ONLINE',
      engine: 'Agencia CRM Multi-Tenant AI Agent',
      timestamp
    });
  }

  try {
    // 1. Identificar el cliente (ej: ?client=bettbit o ?client=fabri)
    const clientId = req.query.client || req.query.client_id || 'bettbit';
    const rawBody = req.body || {};

    console.log(`[KOMMO AGENT] Incoming Webhook for Client: ${clientId}`);

    // 2. Obtener configuración del cliente desde Supabase
    const { data: clientConfig, error: clientErr } = await supabase
      .from('agency_crm_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (clientErr || !clientConfig || !clientConfig.is_active) {
      console.error(`[KOMMO AGENT] Cliente "${clientId}" no encontrado o inactivo.`);
      return res.status(400).json({ error: `Cliente "${clientId}" no configurado en Supabase.` });
    }

    // 3. Parsear el cuerpo del webhook enviado por Kommo
    // Kommo puede enviar arreglos tipo: message[add][0][text] o JSON directo
    const rawBodyString = typeof rawBody === 'object' ? JSON.stringify(rawBody) : String(rawBody);
    
    // Extraer lead_id y texto del mensaje
    let leadId = req.query.lead_id || rawBody?.lead_id || '';
    let userMessage = req.query.message || rawBody?.message || '';

    if (!leadId) {
      const leadMatch = rawBodyString.match(/lead_id["\]=:\s]+(\d+)/i) || rawBodyString.match(/leads\[add\]\[0\]\[id\]["\]=:\s]+(\d+)/i);
      if (leadMatch) leadId = leadMatch[1];
    }

    if (!userMessage) {
      const msgMatch = rawBodyString.match(/text["\]=:\s]+["']?([^"'}]+)/i);
      if (msgMatch) userMessage = msgMatch[1];
    }

    if (!leadId || !userMessage) {
      return res.status(200).json({
        status: 'SKIPPED_NO_LEAD_OR_MESSAGE',
        message: 'No lead_id or message text extracted from payload',
        received: { leadId, userMessage }
      });
    }

    // 4. Buscar o Crear la sesión del Lead en Supabase
    let { data: session } = await supabase
      .from('lead_sessions')
      .select('*')
      .eq('client_id', clientId)
      .eq('kommo_lead_id', String(leadId))
      .single();

    // Extraer ClickID de 24 caracteres hexadecimales de RedTrack si viene en el texto/payload
    let clickIdMatch = rawBodyString.match(/[a-f0-9]{24}/i);
    let clickId = clickIdMatch ? clickIdMatch[0] : (session?.redtrack_clickid || '');

    if (!session) {
      const { data: newSession } = await supabase
        .from('lead_sessions')
        .insert([{
          client_id: clientId,
          kommo_lead_id: String(leadId),
          redtrack_clickid: clickId,
          status: 'AI_ACTIVE',
          chat_history: []
        }])
        .select()
        .single();
      session = newSession;
    }

    // 5. Verificar si el chat fue tomado por un Asesor Humano (Handover)
    if (session?.status === 'HUMAN_TAKEOVER') {
      console.log(`[KOMMO AGENT] Lead ${leadId} en HUMAN_TAKEOVER. La IA se omite.`);
      return res.status(200).json({ status: 'SKIPPED_HUMAN_TAKEOVER' });
    }

    // 6. Detectar solicitud de transferencia a Asesor Humano
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('humano') || lowerMessage.includes('asesor') || lowerMessage.includes('persona') || lowerMessage.includes('soporte')) {
      await supabase
        .from('lead_sessions')
        .update({ status: 'HUMAN_TAKEOVER' })
        .eq('id', session.id);

      console.log(`[KOMMO AGENT] Lead ${leadId} solicitó humano. Estado cambiado a HUMAN_TAKEOVER.`);
      return res.status(200).json({ status: 'TRANSFERRED_TO_HUMAN' });
    }

    // 7. Preparar URL de Afiliado Personalizada con ClickID de RedTrack
    const formattedCasinoLink = clientConfig.casino_offer_url.replace('{clickid}', clickId || 'REPLACE_CLICKID');

    // 8. Construir el Prompt del Sistema para Gemini AI
    const systemInstruction = `${clientConfig.system_prompt}

REGLAS OBLIGATORIAS DE RESPUESTA:
- Responde de forma muy natural, corta y amigable (máximo 2 a 3 oraciones por mensaje), ideal para WhatsApp.
- Si el usuario pide el enlace para registrarse, jugar o reclamar su bono, entriégale EXACTAMENTE esta URL: ${formattedCasinoLink}
- No inventes enlaces distintos.
- Si te pregunta algo técnico que no sabes, invítalo a escribir la palabra "asesor" para comunicarlo con soporte humano.`;

    // Historial para Gemini
    const chatHistory = session?.chat_history || [];
    const contents = [
      ...chatHistory.slice(-6), // Mantener los últimos 6 mensajes para contexto
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    // 9. Llamar a la API de Gemini AI
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    let aiResponseText = "¡Hola! Bienvenido. Haz clic aquí para registrarte y obtener tu bono exclusivo: " + formattedCasinoLink;

    if (geminiApiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
      const aiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents
        })
      });
      const aiData = await aiResponse.json();
      const generatedCandidate = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedCandidate) {
        aiResponseText = generatedCandidate;
      }
    }

    // 10. Actualizar historial de sesión en Supabase
    const updatedHistory = [
      ...chatHistory,
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: aiResponseText }] }
    ];

    await supabase
      .from('lead_sessions')
      .update({
        chat_history: updatedHistory,
        redtrack_clickid: clickId,
        last_interaction: new Date().toISOString()
      })
      .eq('id', session.id);

    // 11. Guardar Log en Supabase
    await supabase.from('ai_logs').insert([{
      client_id: clientId,
      kommo_lead_id: String(leadId),
      user_message: userMessage,
      ai_response: aiResponseText,
      clickid_delivered: clickId
    }]);

    // 12. Despachar mensaje de respuesta hacia Kommo CRM API
    const kommoSubdomain = clientConfig.kommo_subdomain;
    const kommoToken = clientConfig.kommo_api_token;

    if (kommoSubdomain && kommoToken && kommoToken !== 'COLOCAR_AQUI_TOKEN_KOMMO') {
      const kommoNoteUrl = `https://${kommoSubdomain}/api/v4/leads/${leadId}/notes`;
      await fetch(kommoNoteUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kommoToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          note_type: 'common',
          params: { text: `🤖 [IA AGENT]: ${aiResponseText}` }
        }])
      });
    }

    return res.status(200).json({
      status: 'SUCCESS',
      client_id: clientId,
      lead_id: leadId,
      clickid: clickId,
      ai_response: aiResponseText
    });

  } catch (error) {
    console.error('[KOMMO AGENT ERROR]', error);
    return res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
}
