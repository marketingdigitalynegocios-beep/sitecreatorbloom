import { D1Helper } from '../lib/d1.js';
import { KommoClient } from '../lib/kommo.js';
import { RedTrackClient } from '../lib/redtrack.js';

export async function handleMercadoPagoWebhook(request, env) {
  try {
    let paymentId = '';
    let externalReference = '';

    // Soporte para GET y POST webhook IPN de Mercado Pago
    const url = new URL(request.url);
    if (request.method === 'GET') {
      paymentId = url.searchParams.get('id') || url.searchParams.get('data.id') || '';
    } else {
      const body = await request.json().catch(() => ({}));
      paymentId = body.data?.id || body.id || url.searchParams.get('id') || '';
      externalReference = body.external_reference || body.data?.external_reference || '';
    }

    if (!paymentId && !externalReference) {
      // Si es un ping de prueba de MP
      return new Response(JSON.stringify({ status: 'ok', message: 'Webhook recibido' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const d1 = new D1Helper(env.DB);
    const kommo = new KommoClient(env.KOMMO_SUBDOMAIN, env.KOMMO_API_TOKEN);
    const redtrack = new RedTrackClient(env.REDTRACK_API_KEY, env.META_PIXEL_ID);

    // 1. Generar credenciales únicas de acceso para el jugador
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const credentials = {
      username: `VIP_PLAYER_${randomNum}`,
      password: `CASINO_${Math.floor(10000 + Math.random() * 90000)}`
    };

    // 2. Actualizar estado a PAID en Cloudflare D1
    const targetId = externalReference || paymentId;
    await d1.markAsPaid(targetId, credentials);

    // 3. Buscar la sesión para obtener el click_id y monto
    const session = await d1.getSessionById(targetId);
    if (session) {
      // 4. Actualizar Kommo CRM
      await kommo.markAsPaid(session);
      // 5. Disparar Evento Purchase S2S a RedTrack & Meta CAPI
      await redtrack.trackPurchase(session, session.amount || 2000);
    }

    return new Response(JSON.stringify({ success: true, message: 'Pago procesado e informado' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    console.error('Error en Webhook Mercado Pago:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
