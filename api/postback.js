// Vercel Serverless Function: Parser Automático de Webhooks Nativos de Kommo CRM -> RedTrack
export default async function handler(req, res) {
  // Inspección de logs si se solicita ?action=logs
  if (req.query.action === 'logs' || (req.method === 'GET' && !req.query.clickid && !req.query.type)) {
    return res.status(200).json({ message: 'Logger en activo' });
  }

  try {
    const timestamp = new Date().toISOString();
    const type = req.query.type || req.body?.type || 'Lead';
    const rawBodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const queryClickId = req.query.clickid || '';

    // 1. Extraer Click ID (24 caracteres hexadecimales) de la URL o del cuerpo de Kommo
    let rawClickId = queryClickId;
    if (!rawClickId || rawClickId.includes('{{')) {
      rawClickId = rawBodyString;
    }

    const match = String(rawClickId).match(/[a-f0-9]{24}/i);
    const cleanClickId = match ? match[0] : '';

    // 2. Extraer el Precio / Presupuesto (en formato JSON o Form-encoded de Kommo)
    let sum = req.query.sum || '';
    if (!sum || sum.includes('{{')) {
      // Expresión regular robusta para capturar price o sum en JSON o form-url-encoded de Kommo
      const priceMatch = rawBodyString.match(/(?:price|sum)["\]=:\s]+(\d+(\.\d+)?)/i);
      if (priceMatch && priceMatch[1]) {
        sum = priceMatch[1];
      }
    }

    console.log(`[KOMMO WEBHOOK] ${timestamp} | Type: ${type} | Clean ClickID: "${cleanClickId}" | Sum: "${sum}"`);

    if (!cleanClickId) {
      return res.status(200).json({
        timestamp,
        status: 'SKIPPED_NO_CLICKID_FOUND',
        message: 'Kommo webhook received but no 24-char clickid was found in payload',
        received_query: req.query
      });
    }

    // Construir la URL limpia hacia RedTrack
    let redtrackUrl = `https://trk.accbloom.online/postback?clickid=${cleanClickId}&type=${type}`;
    if (sum && parseFloat(sum) > 0) {
      redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    }
    redtrackUrl += `&currency=USD`;

    // Despachar a RedTrack
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
