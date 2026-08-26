import { D1Helper } from '../lib/d1.js';
import { MercadoPagoClient } from '../lib/mercadopago.js';
import { KommoClient } from '../lib/kommo.js';
import { RedTrackClient } from '../lib/redtrack.js';

export async function handleCheckout(request, env) {
  try {
    const body = await request.json();
    const { session_id, name, whatsapp, amount, click_id } = body;

    if (!name || !whatsapp || !amount) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const sessionId = session_id || 'SESS-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const d1 = new D1Helper(env.DB);
    const mp = new MercadoPagoClient(env.MERCADOPAGO_ACCESS_TOKEN);
    const kommo = new KommoClient(env.KOMMO_SUBDOMAIN, env.KOMMO_API_TOKEN);
    const redtrack = new RedTrackClient(env.REDTRACK_API_KEY, env.META_PIXEL_ID);

    // 1. Guardar o actualizar sesión en Cloudflare D1
    const sessionObj = {
      id: sessionId,
      click_id: click_id || '',
      name,
      whatsapp,
      amount: Number(amount),
      status: 'CHECKOUT_STARTED'
    };
    await d1.createSession(sessionObj);

    // 2. Registrar Lead en Kommo CRM
    await kommo.createOrUpdateLead(sessionObj);

    // 3. Disparar Evento Lead a RedTrack & Meta CAPI S2S
    await redtrack.trackLead(sessionObj);

    // 4. Crear Cobro / QR en Mercado Pago API
    const mpData = await mp.createPreference(sessionObj, amount);

    // 5. Actualizar Cloudflare D1 con el ID de Pago de Mercado Pago
    await d1.updateCheckout(sessionId, {
      amount,
      status: 'CHECKOUT_STARTED',
      payment_id: mpData.payment_id,
      payment_url: mpData.payment_url,
      qr_code_base64: mpData.qr_code_base64
    });

    return new Response(JSON.stringify({
      success: true,
      session_id: sessionId,
      payment_id: mpData.payment_id,
      payment_url: mpData.payment_url,
      qr_code_base64: mpData.qr_code_base64,
      is_mock: mpData.is_mock
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    console.error('Error en Handler /api/checkout:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
