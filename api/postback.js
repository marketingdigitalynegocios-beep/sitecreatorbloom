// Vercel Serverless Function: Limpiador de ClickID para Kommo CRM -> RedTrack
export default async function handler(req, res) {
  try {
    const rawClickId = req.query.clickid || req.body?.clickid || '';
    const type = req.query.type || req.body?.type || 'Lead';
    const sum = req.query.sum || req.body?.sum || '';
    const currency = req.query.currency || req.body?.currency || 'USD';

    // Extraer exactamente los 24 caracteres hexadecimales del Click ID
    const match = rawClickId.match(/[a-f0-9]{24}/i);
    const cleanClickId = match ? match[0] : rawClickId.trim();

    if (!cleanClickId || cleanClickId.length < 15) {
      return res.status(400).json({
        status: 0,
        message: 'No valid 24-character clickid found in payload',
        received: rawClickId
      });
    }

    // Construir la URL limpia hacia RedTrack
    let redtrackUrl = `https://trk.accbloom.online/postback?clickid=${cleanClickId}&type=${type}`;
    if (sum) redtrackUrl += `&sum=${encodeURIComponent(sum)}`;
    if (currency) redtrackUrl += `&currency=${encodeURIComponent(currency)}`;

    // Despachar a RedTrack
    const response = await fetch(redtrackUrl);
    const data = await response.json();

    return res.status(200).json({
      status: 1,
      message: 'Cleaned and forwarded to RedTrack successfully',
      clean_clickid: cleanClickId,
      redtrack_response: data
    });
  } catch (error) {
    return res.status(500).json({
      status: 0,
      message: error.message
    });
  }
}
