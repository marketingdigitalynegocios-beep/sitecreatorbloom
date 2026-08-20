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

    // 1. Buscar en la URL primero
    let rawClickId = queryClickId;

    // 2. Si no viene en la URL o viene como etiqueta {{...}}, buscar en todo el payload POST de Kommo
    if (!rawClickId || rawClickId.includes('{{')) {
      rawClickId = rawBodyString;
    }

    // Extraer cualquier secuencia de 24 caracteres hexadecimales (Click ID de RedTrack)
    const match = String(rawClickId).match(/[a-f0-9]{24}/i);
    const cleanClickId = match ? match[0] : '';

    // Intentar extraer el precio/monto si es una compra
    let sum = req.query.sum || '';
    if (!sum && req.body) {
      // Buscar campo 'price' de Kommo
      const priceMatch = rawBodyString.match(/"price":\s*"?(\d+(\.\d+)?)"?/i);
      if (priceMatch) sum = priceMatch[1];
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
    if (sum) redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    redtrackUrl += `&currency=USD`;

    // Despachar a RedTrack
    const response = await fetch(redtrackUrl);
    const redtrackData = await response.json();

    const result = {
      timestamp,
      status: 'SUCCESS',
      clean_clickid: cleanClickId,
      type,
      sum,
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
