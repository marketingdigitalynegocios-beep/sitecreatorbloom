// Vercel Serverless Function: Limpiador + Registro de Eventos Kommo -> RedTrack
let recentLogs = []; // Almacenamiento en memoria para inspección rápida

export default async function handler(req, res) {
  // Si la petición es GET a /api/logs o /api/postback?action=logs, retornar los registros guardados
  if (req.query.action === 'logs' || req.method === 'GET' && !req.query.clickid) {
    return res.status(200).json({
      total_logs: recentLogs.length,
      logs: recentLogs
    });
  }

  try {
    const rawClickId = req.query.clickid || req.body?.clickid || req.body?.['lead[custom_fields][clickId]'] || '';
    const type = req.query.type || req.body?.type || 'Lead';
    const sum = req.query.sum || req.body?.sum || req.body?.['lead[price]'] || '';
    const currency = req.query.currency || req.body?.currency || 'USD';

    // Extraer exactamente los 24 caracteres hexadecimales del Click ID
    const match = String(rawClickId).match(/[a-f0-9]{24}/i);
    const cleanClickId = match ? match[0] : String(rawClickId).trim();

    const timestamp = new Date().toISOString();

    // Construir la URL limpia hacia RedTrack
    let redtrackUrl = `https://trk.accbloom.online/postback?clickid=${cleanClickId}&type=${type}`;
    if (sum) redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    if (currency) redtrackUrl += `&currency=${encodeURIComponent(currency)}`;

    let redtrackData = null;
    let status = 'SUCCESS';

    if (cleanClickId && cleanClickId.length >= 15) {
      try {
        const response = await fetch(redtrackUrl);
        redtrackData = await response.json();
      } catch (err) {
        status = 'REDTRACK_FETCH_ERROR';
        redtrackData = { error: err.message };
      }
    } else {
      status = 'INVALID_CLICKID';
    }

    const logEntry = {
      id: recentLogs.length + 1,
      timestamp,
      status,
      raw_clickid_from_kommo: rawClickId,
      clean_clickid_extracted: cleanClickId,
      type,
      sum,
      redtrack_response: redtrackData
    };

    // Guardar los últimos 30 registros
    recentLogs.unshift(logEntry);
    if (recentLogs.length > 30) recentLogs.pop();

    return res.status(200).json(logEntry);
  } catch (error) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      message: error.message
    });
  }
}
