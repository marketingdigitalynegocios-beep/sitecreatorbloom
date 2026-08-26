import { handleCheckout } from './handlers/checkout.js';
import { handleMercadoPagoWebhook } from './handlers/mercadopago-webhook.js';
import { handleStatus } from './handlers/status.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Soporte para CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Router de Endpoints API
    if (pathname === '/api/checkout' && request.method === 'POST') {
      return await handleCheckout(request, env);
    }

    if ((pathname === '/api/mercadopago-webhook' || pathname === '/api/webhook') && (request.method === 'POST' || request.method === 'GET')) {
      return await handleMercadoPagoWebhook(request, env);
    }

    if (pathname === '/api/status' && request.method === 'GET') {
      return await handleStatus(request, env);
    }

    // Salud del Worker
    if (pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', worker: 'AgentwebAI', cloudflare: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
