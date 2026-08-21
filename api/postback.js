// Vercel Serverless Function: Handler de Webhooks a Nivel de Cuenta Kommo CRM -> RedTrack
export default async function handler(req, res) {
  const timestamp = new Date().toISOString();

  if (req.query.action === 'logs' || (req.method === 'GET' && !req.query.clickid && !req.query.type)) {
    return res.status(200).json({ status: 'ACTIVE', message: 'Logger en activo' });
  }

  try {
    const rawBodyString = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');
    const queryClickId = req.query.clickid || '';

    // 1. Detección Inteligente del Tipo de Evento (Lead, InitiateCheckout, Purchase)
    let type = req.query.type || req.body?.type || '';

    if (!type) {
      if (rawBodyString.includes('add') || rawBodyString.includes('message')) {
        type = 'Lead';
      } else if (rawBodyString.includes('status')) {
        // Si cambió de estado y tiene precio > 0 es una Compra, si no es Inicio de Checkout
        const priceMatch = rawBodyString.match(/(?:price|sum)["\]=:\s]+(\d+(\.\d+)?)/i);
        if (priceMatch && parseFloat(priceMatch[1]) > 0) {
          type = 'Purchase';
        } else {
          type = 'InitiateCheckout';
        }
      } else {
        type = 'Lead';
      }
    }

    // 2. Extraer Click ID (24 caracteres hexadecimales) sanitizando barras y espacios
    let searchString = queryClickId;
    if (!searchString || searchString.includes('{{')) {
      searchString = rawBodyString;
    }

    let match = String(searchString).match(/[a-f0-9]{24}/i);
    if (!match) {
      const sanitizedString = String(searchString).replace(/[\/\s:\-\\]/g, '');
      match = sanitizedString.match(/[a-f0-9]{24}/i);
    }

    const cleanClickId = match ? match[0] : '';

    // 3. Extraer Presupuesto / Precio
    let sum = req.query.sum || '';
    if (!sum || sum.includes('{{')) {
      const priceMatch = rawBodyString.match(/(?:price|sum)["\]=:\s]+(\d+(\.\d+)?)/i);
      if (priceMatch && priceMatch[1]) {
        sum = priceMatch[1];
      }
    }

    console.log(`[KOMMO ACCOUNT WEBHOOK] ${timestamp} | Event: ${type} | ClickID: "${cleanClickId}" | Sum: "${sum}"`);

    if (!cleanClickId) {
      return res.status(200).json({
        timestamp,
        status: 'SKIPPED_NO_CLICKID_FOUND',
        message: 'Kommo account webhook received but no 24-char clickid was found in payload'
      });
    }

    // 4. Construir la URL limpia hacia RedTrack
    let redtrackUrl = `https://trk.accbloom.online/postback?clickid=${cleanClickId}&type=${type}`;
    if (sum && parseFloat(sum) > 0) {
      redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    }
    redtrackUrl += `&currency=USD`;

    // 5. Despachar a RedTrack
    const response = await fetch(redtrackUrl);
    const redtrackData = await response.json();

    const result = {
      timestamp,
      status: 'SUCCESS',
      clean_clickid: cleanClickId,
      type,
      sum: sum || '0',
      redtrack_url: redtrackUrl,
      redtrack_response: redtrackData
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      message: error.message
    });
  }
}
