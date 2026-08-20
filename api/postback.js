// Vercel Serverless Function: Parser Universales Kommo CRM -> RedTrack (Ultra Robusto)
export default async function handler(req, res) {
  const timestamp = new Date().toISOString();

  if (req.query.action === 'logs' || (req.method === 'GET' && !req.query.clickid && !req.query.type)) {
    return res.status(200).json({ status: 'ACTIVE', message: 'Logger en activo' });
  }

  try {
    const type = req.query.type || req.body?.type || 'Lead';
    const rawBodyString = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');
    const queryClickId = req.query.clickid || '';

    // 1. Sanitizar el texto eliminando barras /, guiones, espacios y dos puntos que puedan romper la secuencia hex de 24 caracteres
    let searchString = queryClickId;
    if (!searchString || searchString.includes('{{')) {
      searchString = rawBodyString;
    }

    // Buscar coincidencia directa de 24 caracteres hex
    let match = String(searchString).match(/[a-f0-9]{24}/i);

    // Si no encuentra por tener barras // o guiones interpuestos, limpiar simbolos y reintentar
    if (!match) {
      const sanitizedString = String(searchString).replace(/[\/\s:\-\\]/g, '');
      match = sanitizedString.match(/[a-f0-9]{24}/i);
    }

    const cleanClickId = match ? match[0] : '';

    // 2. Extraer el Precio / Presupuesto
    let sum = req.query.sum || '';
    if (!sum || sum.includes('{{')) {
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
        message: 'No 24-char hex clickid found in request body',
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
