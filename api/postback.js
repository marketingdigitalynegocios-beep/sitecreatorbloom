// Vercel Serverless Function: Limpiador de ClickID para Kommo CRM -> RedTrack + Logger
const logs = []; // Memoria temporal para registrar peticiones recibidas

export default async function handler(req, res) {
  try {
    const rawClickId = req.query.clickid || req.body?.clickid || req.body?.['lead[custom_fields][clickId]'] || '';
    const type = req.query.type || req.body?.type || 'Lead';
    const sum = req.query.sum || req.body?.sum || req.body?.['lead[price]'] || '';
    const currency = req.query.currency || req.body?.currency || 'USD';

    // Extraer exactamente los 24 caracteres hexadecimales del Click ID
    const match = String(rawClickId).match(/[a-f0-9]{24}/i);
    const cleanClickId = match ? match[0] : String(rawClickId).trim();

    const timestamp = new Date().toISOString();

    console.log(`[POSTBACK] ${timestamp} | Type: ${type} | Raw: "${rawClickId}" | Clean: "${cleanClickId}" | Sum: "${sum}"`);

    if (!cleanClickId || cleanClickId.length < 15) {
      const errorLog = {
        timestamp,
        status: 'FAILED_INVALID_CLICKID',
        raw_clickid: rawClickId,
        type,
        sum
      };
      return res.status(400).json(errorLog);
    }

    // Construir la URL limpia hacia RedTrack
    let redtrackUrl = `https://trk.accbloom.online/postback?clickid=${cleanClickId}&type=${type}`;
    if (sum) redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    if (currency) redtrackUrl += `&currency=${encodeURIComponent(currency)}`;

    // Despachar a RedTrack
    const response = await fetch(redtrackUrl);
    const redtrackData = await response.json();

    const successLog = {
      timestamp,
      status: 'SUCCESS',
      clean_clickid: cleanClickId,
      type,
      sum,
      redtrack_url: redtrackUrl,
      redtrack_response: redtrackData
    };

    return res.status(200).json(successLog);
  } catch (error) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      message: error.message
    });
  }
}
