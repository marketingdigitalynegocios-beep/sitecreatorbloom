/**
 * RedTrack & Meta CAPI S2S Postback Integration Module
 * Envía eventos S2S de conversión (Lead, InitiateCheckout, Purchase) con ClickID
 */

export class RedTrackClient {
  constructor(apiKey, metaPixelId) {
    this.apiKey = apiKey || '';
    this.metaPixelId = metaPixelId || '1279024090875797';
    this.redtrackPostbackUrl = 'https://trk.accbloom.online/postback';
  }

  // Disparar Evento S2S de Lead
  async trackLead(session) {
    if (!session.click_id) return { success: false, reason: 'No click_id' };

    try {
      const url = `${this.redtrackPostbackUrl}?clickid=${session.click_id}&type=Lead`;
      await fetch(url, { method: 'GET' });
      console.log(`[RedTrack S2S] Lead registrado para clickid=${session.click_id}`);
      return { success: true };
    } catch (err) {
      console.error('Error RedTrack Lead S2S:', err);
      return { success: false, error: err.message };
    }
  }

  // Disparar Evento S2S de Purchase (Depósito Ganado)
  async trackPurchase(session, amount) {
    if (!session.click_id) return { success: false, reason: 'No click_id' };

    try {
      const url = `${this.redtrackPostbackUrl}?clickid=${session.click_id}&type=Purchase&sum=${amount}&currency=USD`;
      await fetch(url, { method: 'GET' });
      console.log(`[RedTrack S2S] Purchase $${amount} registrado para clickid=${session.click_id}`);
      return { success: true };
    } catch (err) {
      console.error('Error RedTrack Purchase S2S:', err);
      return { success: false, error: err.message };
    }
  }
}
