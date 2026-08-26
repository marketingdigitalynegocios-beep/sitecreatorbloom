const fs = require('fs');
const path = require('path');

const PIXEL_ID = '1279024090875797';
const ACCESS_TOKEN = 'EAAVlfqeSIyYBSItXQUJgQbJxsvqTcbuDZBlz3nJ9K1mu7ugeC9adUlyTureZBpY39WbtjoLDODeZBpwaMz9Pp9maUeBFEiedXZCvANlmdXelHBpG6AZABSEjOIhnTZBaipo9xBchAD6FCcpZCzkSi5o8ZBWB5sC9lPQoefeW6C30natWzOmwoZBM24uR10oxZBXKkRKAZDZD';
const META_CAPI_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

async function run() {
  console.log('🚀 Iniciando script de despacho masivo CAPI para Meta...');
  
  const csvPath = path.join(__dirname, 'reporte conversiones redtrack.csv');
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  const rows = lines.slice(1).map((l, idx) => {
    const vals = parseCSVLine(l);
    const obj = { _line: idx + 2 };
    headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
    return obj;
  });

  console.log(`📋 Total registros en CSV: ${rows.length}`);

  const validEvents = [];
  let skippedTest333Count = 0;

  for (const r of rows) {
    // 1. Filtrar el evento de prueba de $333
    if (r.payout === '333.0000') {
      console.log(`⚠️ Ignorando evento de prueba $333 (Línea ${r._line}, ID: ${r.id})`);
      skippedTest333Count++;
      continue;
    }

    // 2. Mapear tipo de evento
    let eventName = '';
    if (r.type === 'conversion') {
      eventName = 'Lead';
    } else if (r.type === 'InitiateCheckout') {
      eventName = 'InitiateCheckout';
    } else if (r.type === 'Purchase') {
      eventName = 'Purchase';
    } else {
      console.log(`⚠️ Tipo de evento no reconocido "${r.type}", omitiendo línea ${r._line}`);
      continue;
    }

    // 3. Convertir fecha/hora a Unix Timestamp en segundos
    const convDate = new Date(r.conv_time);
    const eventTime = Math.floor(convDate.getTime() / 1000);

    if (isNaN(eventTime)) {
      console.log(`⚠️ Fecha inválida "${r.conv_time}" en línea ${r._line}`);
      continue;
    }

    // 4. Construir user_data de Meta
    const userData = {};
    if (r.ip) userData.client_ip_address = r.ip;
    if (r.user_agent) userData.client_user_agent = r.user_agent;
    
    if (r.clicksub19) {
      userData.fbp = r.clicksub19;
    }
    
    if (r.clicksub20) {
      userData.fbc = r.clicksub20;
    } else if (r.clicksub11) {
      // Si tenemos fbclid directo
      userData.fbc = `fb.1.${convDate.getTime()}.${r.clicksub11}`;
    }

    // 5. Construir objeto evento Meta
    const eventPayload = {
      event_name: eventName,
      event_time: eventTime,
      event_id: r.id, // RedTrack Conversion ID para deduplicación
      event_source_url: 'https://sitecreatorbloom.vercel.app/landing_fa_v2.html',
      action_source: 'website',
      user_data: userData
    };

    if (eventName === 'Purchase') {
      const payoutVal = parseFloat(r.payout) || 0;
      eventPayload.custom_data = {
        currency: 'USD',
        value: payoutVal
      };
    }

    validEvents.push({
      _line: r._line,
      redtrack_id: r.id,
      payload: eventPayload
    });
  }

  console.log(`✅ Eventos listos para enviar a Meta CAPI: ${validEvents.length}`);

  // Enviar en lotes (batches de hasta 10 eventos por request CAPI)
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < validEvents.length; i += batchSize) {
    const chunk = validEvents.slice(i, i + batchSize);
    const metaPayload = {
      data: chunk.map(item => item.payload)
    };

    console.log(`\n📤 Enviando Lote ${Math.floor(i / batchSize) + 1} (${chunk.length} eventos)...`);

    try {
      const response = await fetch(META_CAPI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaPayload)
      });

      const resData = await response.json();
      console.log(`📥 Respuesta Meta API: Status ${response.status}`, resData);

      results.push({
        batch: Math.floor(i / batchSize) + 1,
        http_status: response.status,
        meta_response: resData,
        events: chunk.map(c => ({ line: c._line, id: c.redtrack_id, name: c.payload.event_name }))
      });
    } catch (err) {
      console.error(`❌ Error enviando lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      results.push({
        batch: Math.floor(i / batchSize) + 1,
        error: err.message
      });
    }
  }

  const logPath = path.join(__dirname, 'capi_upload_results.json');
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total_processed: validEvents.length,
    skipped_test_333: skippedTest333Count,
    results
  }, null, 2));

  console.log(`\n🎉 Proceso completado. Log guardado en: ${logPath}`);
}

run();
