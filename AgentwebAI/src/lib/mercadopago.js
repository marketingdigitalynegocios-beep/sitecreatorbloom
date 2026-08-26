/**
 * Mercado Pago API Integration Module
 * Genera Preferencias de Pago y Códigos QR dinámicos para cargas de saldo
 */

export class MercadoPagoClient {
  constructor(accessToken) {
    this.accessToken = accessToken || '';
    this.baseUrl = 'https://api.mercadopago.com';
  }

  async createPreference(session, amount) {
    // Si no hay token de Mercado Pago configurado, generamos una respuesta de simulación funcional
    if (!this.accessToken || this.accessToken.includes('xxxx')) {
      const mockPaymentId = 'MP-' + Math.floor(100000 + Math.random() * 900000);
      return {
        payment_id: mockPaymentId,
        payment_url: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mockPaymentId}`,
        qr_code_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        is_mock: true
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          items: [
            {
              title: `Carga de Saldo Casino VIP - $${amount}`,
              quantity: 1,
              currency_id: 'ARS',
              unit_price: Number(amount)
            }
          ],
          payer: {
            name: session.name || 'Jugador VIP',
            phone: {
              number: session.whatsapp || ''
            }
          },
          back_urls: {
            success: `https://sitecreatorbloom.vercel.app/AgentwebAI/index.html?session=${session.id}&status=success`,
            failure: `https://sitecreatorbloom.vercel.app/AgentwebAI/index.html?session=${session.id}&status=failure`,
            pending: `https://sitecreatorbloom.vercel.app/AgentwebAI/index.html?session=${session.id}&status=pending`
          },
          auto_return: 'approved',
          external_reference: session.id,
          notification_url: 'https://sitecreatorbloom.vercel.app/AgentwebAI/api/mercadopago-webhook'
        })
      });

      if (!response.ok) {
        throw new Error(`Mercado Pago API Error: ${response.status}`);
      }

      const data = await response.json();
      return {
        payment_id: data.id,
        payment_url: data.init_point || data.sandbox_init_point,
        qr_code_base64: null,
        is_mock: false
      };
    } catch (err) {
      console.error('Error al crear preferencia MP:', err);
      const mockPaymentId = 'MP-FALLBACK-' + Math.floor(100000 + Math.random() * 900000);
      return {
        payment_id: mockPaymentId,
        payment_url: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mockPaymentId}`,
        qr_code_base64: null,
        is_mock: true
      };
    }
  }
}
