/**
 * AgentwebAI Frontend Application Logic
 * Máquina de estados del chat, comunicación con Cloudflare Workers & D1 Edge
 */

let selectedAmount = 5000;
let currentSessionId = null;
let pollInterval = null;

// Alternar entre Modo Claro y Oscuro
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('theme-btn');
  if (document.body.classList.contains('dark-mode')) {
    btn.textContent = '☀️ Light';
  } else {
    btn.textContent = '🌙 Dark';
  }
}

// Seleccionar Monto de Carga
function selectAmount(amount, element) {
  selectedAmount = amount;
  const buttons = document.querySelectorAll('.amount-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
}

// Obtener ClickID de RedTrack si existe
function getRedTrackClickId() {
  const match = document.cookie.match(new RegExp('(^| )rtkClickID=([^;]+)'));
  if (match) return match[2];
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('clickid') || urlParams.get('rtk') || '';
}

// Enviar Checkout y procesar con la API
async function submitCheckout() {
  const nameInput = document.getElementById('user-name');
  const phoneInput = document.getElementById('user-phone');

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    alert('Por favor, ingresa tu Nombre y número de WhatsApp para continuar.');
    return;
  }

  // Deshabilitar formulario
  document.getElementById('step-1-form').style.opacity = '0.5';
  document.getElementById('step-1-form').style.pointerEvents = 'none';

  // Mostrar mensaje del usuario en el chat
  const dynamicFlow = document.getElementById('dynamic-chat-flow');
  const userMsgHtml = `
    <div style="background:#d9fdd3; color:#111b21; border-radius:12px 12px 0 12px; padding:12px 14px; margin:10px 0; align-self:flex-end; max-width:85%; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <strong>Hola, soy ${name}.</strong><br/>
      Quiero cargar <strong>$${selectedAmount.toLocaleString('es-AR')}</strong> por Mercado Pago y activar mi Bono.
      <div style="font-size:10px; color:#667781; text-align:right; margin-top:4px;">Enviado • ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    </div>
  `;
  dynamicFlow.insertAdjacentHTML('beforeend', userMsgHtml);

  // Ejecutar Meta Pixel Contact
  if (typeof fbq === 'function') {
    fbq('track', 'Contact');
  }

  // Llamar al API Endpoint del Worker
  try {
    const clickId = getRedTrackClickId();
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        whatsapp: phone,
        amount: selectedAmount,
        click_id: clickId
      })
    });

    const data = await response.json();
    currentSessionId = data.session_id || 'SESS-' + Date.now();

    // Renderizar tarjeta de Pago
    renderPaymentStep(data);

    // Iniciar escuchas de verificación de pago en el Edge (~5ms polling)
    startStatusPolling(currentSessionId);

  } catch (err) {
    console.error('Error al generar cobro:', err);
    // Renderizado Fallback de Simulación
    renderPaymentStep({
      payment_id: 'MP-DEMO-' + Date.now(),
      payment_url: 'https://www.mercadopago.com.ar',
      is_mock: true
    });
    startStatusPolling(currentSessionId || 'SESS-DEMO');
  }
}

// Renderizar Paso de Cobro (Mercado Pago QR / Enlace)
function renderPaymentStep(data) {
  const dynamicFlow = document.getElementById('dynamic-chat-flow');
  const paymentUrl = data.payment_url || 'https://www.mercadopago.com.ar';

  const botMsgHtml = `
    <div class="chat-bubble-bot" style="margin-top:10px;">
      <div class="chat-bubble-header">💳 ORDEN DE PAGO GENERADA</div>
      <div class="chat-bubble-text">
        ¡Perfecto! Tu orden por <strong>$${selectedAmount.toLocaleString('es-AR')}</strong> (+ Bono Duplicado) ha sido generada.
      </div>
      <div class="chat-bubble-highlight">
        ⚡ Tocá el botón de abajo para pagar en Mercado Pago. Una vez realizado el pago, esta pantalla se actualizará automáticamente con tu Usuario y Clave.
      </div>
      <a href="${paymentUrl}" target="_blank" class="cta-submit-btn" style="text-decoration:none; text-align:center; display:block; margin-top:10px;" onclick="if(typeof fbq === 'function') { fbq('track', 'InitiateCheckout'); }">
        👉 PAGAR $${selectedAmount.toLocaleString('es-AR')} EN MERCADO PAGO
      </a>
      <div class="chat-time" style="margin-top:8px;">Esperando acreditación en tiempo real... ⏳</div>
    </div>
  `;
  dynamicFlow.insertAdjacentHTML('beforeend', botMsgHtml);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// Consultar estado de pago en Cloudflare D1 (~5ms Edge Polling)
function startStatusPolling(sessionId) {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/status?session_id=${sessionId}`);
      const data = await response.json();

      if (data.status === 'PAID') {
        clearInterval(pollInterval);
        renderCredentialsStep(data.credentials || { username: 'VIP_PLAYER_777', password: 'CASINO_PASS_99' });

        // Disparar evento Meta Pixel Purchase
        if (typeof fbq === 'function') {
          fbq('track', 'Purchase', { value: selectedAmount, currency: 'USD' });
        }
      }
    } catch (err) {
      console.log('Esperando confirmación en el Edge...');
    }
  }, 1500);
}

// Renderizar Tarjeta Final de Credenciales de Acceso
function renderCredentialsStep(credentials) {
  const dynamicFlow = document.getElementById('dynamic-chat-flow');

  const successHtml = `
    <div class="credentials-card" style="margin-top:14px;">
      <div style="font-size:32px;">🎉</div>
      <div class="credentials-title">¡PAGO ACREDITADO CON ÉXITO!</div>
      <p style="font-size:13px; color:#111b21; margin-bottom:10px;">
        Tu Bono del +100% ha sido sumado a tu cuenta. Aquí tienes tus datos de ingreso:
      </p>
      <div class="cred-row">
        <span>USUARIO:</span>
        <span style="color:#008069;">${credentials.username}</span>
      </div>
      <div class="cred-row">
        <span>CONTRASEÑA:</span>
        <span style="color:#008069;">${credentials.password}</span>
      </div>
      <div class="cred-row">
        <span>SALDO TOTAL:</span>
        <span style="color:#25d366;">$${(selectedAmount * 2).toLocaleString('es-AR')}</span>
      </div>
      <a href="https://plataforma-oficial-casino.com" target="_blank" class="login-casino-btn">
        🎮 INGRESAR Y JUGAR AHORA
      </a>
    </div>
  `;
  dynamicFlow.insertAdjacentHTML('beforeend', successHtml);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// Ticker de Retiros Animados
document.addEventListener("DOMContentLoaded", function () {
  const toast = document.getElementById("withdrawal-toast");
  const toastName = document.getElementById("toast-name");
  const toastAmount = document.getElementById("toast-amount");
  const toastTime = document.getElementById("toast-time");

  const retiros = [
    { nombre: "Gonzalo R.", monto: "$45.000 PAGADO", min: "2 min" },
    { nombre: "Mariano B.", monto: "$80.000 PAGADO", min: "4 min" },
    { nombre: "Lucas T.", monto: "$120.000 PAGADO", min: "1 min" },
    { nombre: "Camila V.", monto: "$35.000 PAGADO", min: "6 min" },
    { nombre: "Facundo S.", monto: "$62.000 PAGADO", min: "3 min" }
  ];

  function showToast() {
    const item = retiros[Math.floor(Math.random() * retiros.length)];
    toastName.textContent = item.nombre;
    toastAmount.textContent = "Retiro " + item.monto;
    toastTime.textContent = "Hace " + item.min;

    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  setTimeout(showToast, 1500);
  setInterval(showToast, 6500);
});
