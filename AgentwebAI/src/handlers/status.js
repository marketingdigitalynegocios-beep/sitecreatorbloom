import { D1Helper } from '../lib/d1.js';

export async function handleStatus(request, env) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || url.searchParams.get('id') || '';

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Falta session_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const d1 = new D1Helper(env.DB);
    const session = await d1.getSessionById(sessionId);

    if (!session) {
      // Si la sesión aún no se ha guardado en D1 o está en memoria local
      return new Response(JSON.stringify({ status: 'INIT', found: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({
      found: true,
      status: session.status,
      amount: session.amount,
      payment_id: session.payment_id,
      credentials: session.status === 'PAID' ? {
        username: session.credentials_username || 'VIP_PLAYER_777',
        password: session.credentials_password || 'CASINO_998877'
      } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    console.error('Error en Handler /api/status:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
