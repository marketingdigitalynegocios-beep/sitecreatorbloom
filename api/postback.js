// Vercel Serverless Function: Parser Universales Kommo CRM -> RedTrack (Con Debug Log Completo)
export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  
  // Loguear todos los detalles de la petición en la consola de Vercel
  console.log(`=== INCOMING REQUEST [${timestamp}] ===`);
  console.log(`Method: ${req.method}`);
  console.log(`Headers:`, JSON.stringify(req.headers));
  console.log(`Query:`, JSON.stringify(req.query));
  console.log(`Body:`, typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body));

  if (req.query.action === 'logs' || (req.method === 'GET' && !req.query.clickid && !req.query.type)) {
    return res.status(200).json({ status: 'ACTIVE', message: 'Logger en activo' });
  }

  try {
    const type = req.query.type || req.body?.type || 'Lead';
    const rawBodyString = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');
    const queryClickId = req.query.clickid || '';

    // 1. Extraer Click ID (24 caracteres hexadecimales) de la URL o del cuerpo de Kommo
    let rawClickId = queryClickId;
    if (!rawClickId || rawClickId.includes('{{')) {
      rawClickId = rawBodyString;
    }

    // Buscar cualquier secuencia de 24 caracteres hexadecimales
    const match = String(rawClickId).match(/[a-f0-9]{24}/i);
    const cleanClickId = match ? match[0] : '';

    // 2. Extraer el Precio / Presupuesto
    let sum = req.query.sum || '';
    if (!sum || sum.includes('{{')) {
      const priceMatch = rawBodyString.match(/(?:price|sum)["\]=:\s]+(\d+(\.\d+)?)/i);
      if (priceMatch && priceMatch[1]) {
        sum = priceMatch[1];
      }
    }

    if (!cleanClickId) {
      console.log(`[SKIPPED] No 24-char clickid found in request. RawBody length: ${rawBodyString.length}`);
      return res.status(200).json({
        timestamp,
        status: 'SKIPPED_NO_CLICKID_FOUND',
        message: 'No 24-char hex clickid found in request body',
        received_headers: req.headers,
        received_query: req.query
      });
    }

    // Construir la URL limpia hacia RedTrack
    let redtrackUrl = `https://trk.accbloom.online/postback?clickid=${cleanClickId}&type=${type}`;
    if (sum && parseFloat(sum) > 0) {
      redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    }
    redtrackUrl += `&currency=USD`;

    console.log(`[FORWARDING TO REDTRACK] ${redtrackUrl}`);

    // Despachar a RedTrack
    const response = await fetch(redtrackUrl);
    const redtrackData = await response.json();

    console.log(`[REDTRACK RESPONSE]`, JSON.stringify(redtrackData));

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
    console.error(`[ERROR]`, error.message);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      message: error.message
    });
  }
}
