/**
 * Helper de Base de Datos Cloudflare D1 SQL
 */

export class D1Helper {
  constructor(dbBinding) {
    this.db = dbBinding;
  }

  // Crear nueva sesión de chat
  async createSession(session) {
    const query = `
      INSERT INTO chat_sessions (id, click_id, name, whatsapp, amount, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    if (this.db && typeof this.db.prepare === 'function') {
      await this.db.prepare(query).bind(
        session.id,
        session.click_id || '',
        session.name || '',
        session.whatsapp || '',
        session.amount || 0,
        session.status || 'INIT'
      ).run();
    }
    return session;
  }

  // Actualizar checkout con datos de cobro de Mercado Pago
  async updateCheckout(id, checkoutData) {
    const query = `
      UPDATE chat_sessions
      SET amount = ?,
          status = ?,
          payment_id = ?,
          payment_url = ?,
          qr_code_base64 = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `;
    if (this.db && typeof this.db.prepare === 'function') {
      await this.db.prepare(query).bind(
        checkoutData.amount,
        checkoutData.status || 'CHECKOUT_STARTED',
        checkoutData.payment_id || '',
        checkoutData.payment_url || '',
        checkoutData.qr_code_base64 || '',
        id
      ).run();
    }
  }

  // Marcar estado como PAGADO (PAID) y asignar credenciales
  async markAsPaid(paymentId, credentials) {
    const query = `
      UPDATE chat_sessions
      SET status = 'PAID',
          credentials_username = ?,
          credentials_password = ?,
          updated_at = datetime('now')
      WHERE payment_id = ? OR id = ?
    `;
    if (this.db && typeof this.db.prepare === 'function') {
      await this.db.prepare(query).bind(
        credentials.username,
        credentials.password,
        paymentId,
        paymentId
      ).run();
    }
  }

  // Obtener sesión por ID en ~5ms
  async getSessionById(id) {
    if (!this.db || typeof this.db.prepare !== 'function') {
      return null;
    }
    const query = `SELECT * FROM chat_sessions WHERE id = ? LIMIT 1`;
    const result = await this.db.prepare(query).bind(id).first();
    return result || null;
  }
}
