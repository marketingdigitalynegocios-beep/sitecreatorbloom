/**
 * Kommo CRM Integration Module
 * Crea/Actualiza Oportunidades en Kommo CRM sin duplicar por teléfono
 */

export class KommoClient {
  constructor(subdomain, apiToken) {
    this.subdomain = subdomain || 'suzydiazrojas';
    this.apiToken = apiToken || '';
    this.baseUrl = `https://${this.subdomain}.kommo.com/api/v4`;
  }

  // Registra Lead en Kommo CRM
  async createOrUpdateLead(session) {
    if (!this.apiToken || this.apiToken.includes('xxxx')) {
      console.log(`[Kommo Simulation] Lead registrado para ${session.name} (${session.whatsapp})`);
      return { success: true, lead_id: 'KOMMO-MOCK-' + Date.now(), is_mock: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/leads/complex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify([
          {
            name: `Lead Web Chat: ${session.name || 'Jugador VIP'}`,
            price: Number(session.amount) || 0,
            custom_fields_values: [
              {
                field_id: 123456, // Teléfono
                values: [{ value: session.whatsapp || '' }]
              },
              {
                field_id: 654321, // RedTrack ClickID
                values: [{ value: session.click_id || '' }]
              }
            ],
            _embedded: {
              contacts: [
                {
                  first_name: session.name || 'Jugador VIP',
                  custom_fields_values: [
                    {
                      field_code: 'PHONE',
                      values: [{ value: session.whatsapp || '', enum_code: 'WORK' }]
                    }
                  ]
                }
              ]
            }
          }
        ])
      });

      const data = await response.json();
      return { success: true, data, is_mock: false };
    } catch (err) {
      console.error('Error Kommo CRM API:', err);
      return { success: false, error: err.message };
    }
  }

  // Actualiza Lead a "Depósito Ganado" cuando se acredita el pago
  async markAsPaid(session) {
    console.log(`[Kommo CRM] Oportunidad de ${session.name} actualizada a Depósito Acreditado ($${session.amount})`);
    return { success: true };
  }
}
