# 📘 Guía Maestra de Implementación: Atribución Server-Side & Meta CAPI
## Manual de Operaciones Estándar (SOP) Técnico Paso a Paso
### Cobertura Completa: Shopify E-commerce, WooCommerce, Formularios Lead Gen y WhatsApp CRM

Este documento es una **guía técnica de ejecución paso a paso (Runbook)** sin ambigüedades. Cada sección contiene las instrucciones exactas, configuración de servidores, código para copiar y pegar, variables de servidor y protocolos de prueba para entregar un sistema de rastreo de 1ª persona con **Event Match Quality (EMQ) de 8.5 a 10/10** en Meta Ads y Google Ads.

---

## 📑 Índice de Módulos
1. [Infraestructura Base: Creación del Servidor sGTM y Subdominio de 1ª Persona](#-módulo-0-infraestructura-del-servidor-sgtm-y-dns)
2. [Módulo 1: Implementación Exhaustiva en SHOPIFY (Customer Events + Webhooks)](#-módulo-1-implementación-paso-a-paso-en-shopify)
3. [Módulo 2: Implementación Exhaustiva en WOOCOMMERCE](#-módulo-2-implementación-paso-a-paso-en-woocommerce)
4. [Módulo 3: Implementación en LEAD GEN (Formularios Embebidos / Landings)](#-módulo-3-implementación-en-lead-gen-formularios-y-landings)
5. [Módulo 4: Implementación en WHATSAPP & CRM (Kommo / HubSpot)](#-módulo-4-implementación-en-whatsapp--crm)
6. [Protocolo de Validación, Deduplicación y Diagnóstico](#-módulo-5-protocolo-de-validación-y-testing)

---

## 🌐 MÓDULO 0: Infraestructura del Servidor sGTM y DNS

Para que las cookies no sean bloqueadas por iOS 14+ y Safari ITP, todo el rastreo debe pasar por un **subdominio propio** del cliente (ej: `trk.tutienda.com` o `data.tutienda.com`).

### Paso 0.1: Crear el Contenedor Server en Google Tag Manager
1. Entra a [tagmanager.google.com](https://tagmanager.google.com).
2. Haz clic en **Crear cuenta** (o dentro de una cuenta existente, clic en **Crear contenedor**).
3. Nombre del contenedor: `[Cliente] - Server Side`.
4. Plataforma de destino: Selecciona **Servidor** (*Server*).
5. En la ventana emergente, selecciona **Aprovisionar automáticamente el servidor de etiquetas** (puedes usar Google Cloud o vincular con [Stape.io](https://stape.io) para ahorrar costos: $10-20 USD/mes).

### Paso 0.2: Configurar el Subdominio Propio (DNS)
1. Ve al proveedor de dominio del cliente (GoDaddy, Cloudflare, Namecheap, etc.).
2. Agrega un nuevo registro DNS:
   - **Tipo:** `CNAME`
   - **Nombre / Host:** `data` (o `trk`) ➔ Esto crea `data.tutienda.com`.
   - **Destino / Valor:** La URL que te da Stape o GCP (ej: `xxxx.eu.stape.io` o `appengine.google.com`).
   - **TTL:** Automático o 3600.
3. En el panel de Stape o GTM Server, agrega el dominio personalizado `https://data.tutienda.com` y espera que el certificado SSL se emita en verde (tarda de 5 a 15 minutos).

---

## 🛍️ MÓDULO 1: Implementación Paso a Paso en SHOPIFY

Shopify eliminó el acceso directo al `checkout.liquid` en la mayoría de planes. La forma oficial y moderna para rastreo sin fallas combina **Shopify Web Pixels (Customer Events API)** + **GTM Web / Server** + **Webhooks de Servidor**.

---

### Paso 1.1: Configurar Shopify Customer Events (Web Pixel)

1. En el panel de Shopify, ve a **Configuración (Settings)** ➔ **Eventos de clientes (Customer events)**.
2. Haz clic en el botón verde **Agregar píxel personalizado (Add custom pixel)**.
3. Nombre del píxel: `Meta CAPI & GTM Server Pixel`.
4. En la configuración de permisos:
   - **Privacidad del cliente (Permission):** *Not required* (o según políticas del país).
   - **Venta de datos (Data sale):** *Data collected does not qualify as data sale*.
5. Pega el siguiente código en el editor del Web Pixel:

```javascript
// Inicializar escucha de eventos del cliente en Shopify
analytics.subscribe('page_viewed', async (event) => {
  sendToTrackingServer('page_view', {
    page_location: event.context.document.location.href,
    page_title: event.context.document.title,
    client_id: event.clientId
  }, event);
});

analytics.subscribe('product_viewed', async (event) => {
  sendToTrackingServer('view_item', {
    currency: event.data.productVariant.price.currencyCode,
    value: event.data.productVariant.price.amount,
    items: [{
      item_id: event.data.productVariant.id,
      item_name: event.data.productVariant.title,
      price: event.data.productVariant.price.amount
    }]
  }, event);
});

analytics.subscribe('product_added_to_cart', async (event) => {
  sendToTrackingServer('add_to_cart', {
    currency: event.data.cartLine.cost.totalAmount.currencyCode,
    value: event.data.cartLine.cost.totalAmount.amount,
    items: [{
      item_id: event.data.cartLine.merchandise.id,
      item_name: event.data.cartLine.merchandise.title,
      price: event.data.cartLine.cost.totalAmount.amount,
      quantity: event.data.cartLine.quantity
    }]
  }, event);
});

analytics.subscribe('checkout_started', async (event) => {
  sendToTrackingServer('begin_checkout', {
    currency: event.data.checkout.totalPrice.currencyCode,
    value: event.data.checkout.totalPrice.amount,
    email: event.data.checkout.email || '',
    phone: event.data.checkout.phone || '',
    items: event.data.checkout.lineItems.map(item => ({
      item_id: item.variant.id,
      item_name: item.title,
      price: item.finalPrice.amount,
      quantity: item.quantity
    }))
  }, event);
});

analytics.subscribe('checkout_completed', async (event) => {
  sendToTrackingServer('purchase', {
    transaction_id: event.data.checkout.order.id || event.data.checkout.token,
    currency: event.data.checkout.totalPrice.currencyCode,
    value: event.data.checkout.totalPrice.amount,
    email: event.data.checkout.email,
    phone: event.data.checkout.phone,
    first_name: event.data.checkout.shippingAddress?.firstName || '',
    last_name: event.data.checkout.shippingAddress?.lastName || '',
    city: event.data.checkout.shippingAddress?.city || '',
    country: event.data.checkout.shippingAddress?.countryCode || '',
    zip: event.data.checkout.shippingAddress?.zip || '',
    items: event.data.checkout.lineItems.map(item => ({
      item_id: item.variant.id,
      item_name: item.title,
      price: item.finalPrice.amount,
      quantity: item.quantity
    }))
  }, event);
});

// Función de despacho hacia tu servidor sGTM
function sendToTrackingServer(eventName, eventData, rawEvent) {
  const payload = {
    event_name: eventName,
    event_id: rawEvent.id || ('evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
    event_time: Math.floor(Date.now() / 1000),
    user_data: {
      client_id: rawEvent.clientId,
      email: eventData.email || '',
      phone: eventData.phone || '',
      first_name: eventData.first_name || '',
      last_name: eventData.last_name || '',
      city: eventData.city || '',
      country: eventData.country || '',
      zip: eventData.zip || ''
    },
    custom_data: eventData
  };

  fetch('https://data.tutienda.com/shopify-event', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}
```
6. Haz clic en **Guardar** y luego en **Conectar (Connect)**.

---

### Paso 1.2: Configurar el Webhook de Backup en Shopify (`orders/paid`)
Para capturar compras si el cliente cierra la pestaña antes de la página de agradecimiento:

1. Ve a **Configuración** ➔ **Notificaciones** ➔ Baja hasta **Webhooks**.
2. Clic en **Crear webhook**:
   - **Evento:** `Creación de pedido (Order creation)` o `Pedido pagado (Order payment)`.
   - **Formato:** `JSON`.
   - **URL:** `https://data.tutienda.com/webhook/shopify-order`.
   - **Versión de la API:** La más reciente (ej: `2024-07` o superior).
3. Haz clic en **Guardar**.

---

### Paso 1.3: Configuración del Contenedor Server en GTM (Para Shopify)

1. En tu contenedor **GTM Server**:
2. En **Plantillas (Templates)** ➔ Busca e instala la plantilla oficial:
   - **Meta Conversions API (by Meta)** o **Facebook Incubator CAPI**.
3. En **Etiquetas (Tags)** ➔ **Nueva etiqueta**:
   - **Tipo de etiqueta:** *Meta Conversions API*.
   - **Pixel ID:** Pega el ID del Píxel de Meta del cliente.
   - **API Access Token:** Pega el token generado en Meta Events Manager.
   - **Event Name Setup:** `Inherit from client` (heredar nombre del evento).
   - **Server Event Data Override:** Activar *Generate event_id if missing* para deduplicación.
4. En **Activadores (Triggers)**:
   - **Tipo:** Personalizado.
   - **Condición:** Se activa en todas las solicitudes (`Client Name equals Data Client` o `Path equals /shopify-event`).
5. Publica el contenedor de GTM Server.

---

## 🛒 MÓDULO 2: Implementación Paso a Paso en WOOCOMMERCE

### Paso 2.1: Instalación del Plugin de Captura de 1ª Parte
En WordPress / WooCommerce, la vía más robusta y sin plugins pesados es usar el snippet en `functions.php` (o mediante el plugin *Code Snippets*):

```php
<?php
// Capturar y persistir fbclid y generar ClickID en WooCommerce
add_action('wp_head', 'omnitrack_capture_script');
function omnitrack_capture_script() {
    ?>
    <script>
    (function() {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) {
            document.cookie = "_omni_fbclid=" + fbclid + "; path=/; max-age=15552000; SameSite=Lax";
        }
        let clickId = localStorage.getItem('_omni_cid');
        if (!clickId || fbclid) {
            clickId = 'wc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
            localStorage.setItem('_omni_cid', clickId);
            document.cookie = "_omni_cid=" + clickId + "; path=/; max-age=15552000; SameSite=Lax";
        }
    })();
    </script>
    <?php
}

// Enviar Webhook automático al completar la orden en WooCommerce
add_action('woocommerce_payment_complete', 'omnitrack_send_purchase_capi');
add_action('woocommerce_order_status_completed', 'omnitrack_send_purchase_capi');

function omnitrack_send_purchase_capi($order_id) {
    if (!$order_id) return;
    $order = wc_get_order($order_id);
    
    // Evitar envíos duplicados
    if (get_post_meta($order_id, '_omnitrack_sent', true)) return;

    $click_id = isset($_COOKIE['_omni_cid']) ? sanitize_text_field($_COOKIE['_omni_cid']) : ('wc_ord_' . $order_id);
    $fbclid = isset($_COOKIE['_omni_fbclid']) ? sanitize_text_field($_COOKIE['_omni_fbclid']) : '';

    $body = array(
        'event_name' => 'Purchase',
        'event_id'   => 'wc_order_' . $order_id,
        'event_time' => time(),
        'user_data'  => array(
            'email'      => hash('sha256', strtolower(trim($order->get_billing_email()))),
            'phone'      => hash('sha256', preg_replace('/[^0-9]/', '', $order->get_billing_phone())),
            'first_name' => hash('sha256', strtolower(trim($order->get_billing_first_name()))),
            'last_name'  => hash('sha256', strtolower(trim($order->get_billing_last_name()))),
            'city'       => hash('sha256', strtolower(trim($order->get_billing_city()))),
            'client_ip'  => $order->get_customer_ip_address(),
            'user_agent' => $order->get_customer_user_agent(),
            'fbc'        => $fbclid ? ('fb.1.' . time() . '.' . $fbclid) : ''
        ),
        'custom_data' => array(
            'currency' => $order->get_currency(),
            'value'    => (float) $order->get_total(),
            'order_id' => $order_id
        )
    );

    wp_remote_post('https://data.tutienda.com/webhook/woocommerce', array(
        'method'  => 'POST',
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => json_encode($body),
        'timeout' => 10
    ));

    update_post_meta($order_id, '_omnitrack_sent', true);
}
```

---

## 📝 MÓDULO 3: Implementación en LEAD GEN (Formularios y Landings)

Para capturar leads en Elementor, Typeform, Webflow o HubSpot sin perder el anuncio de origen:

### Paso 3.1: Configurar los Campos Ocultos en el Formulario
En el constructor de formularios, agrega 4 campos ocultos:
- `tracking_click_id`
- `fbclid`
- `utm_source`
- `utm_campaign`

### Paso 3.2: Inyector Universal en la Landing Page
Pega este script en el `<head>` o antes de `</body>`:
```html
<script>
document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid') || localStorage.getItem('_trk_fbclid') || '';
  const utmSource = urlParams.get('utm_source') || '';
  const utmCampaign = urlParams.get('utm_campaign') || '';

  // Generar o recuperar ID
  let clickId = localStorage.getItem('_trk_cid');
  if (!clickId || urlParams.get('fbclid')) {
    clickId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    localStorage.setItem('_trk_cid', clickId);
  }
  if (fbclid) localStorage.setItem('_trk_fbclid', fbclid);

  // Rellenar campos en cualquier formulario de la página
  function fillFields() {
    const inputs = {
      'tracking_click_id': clickId,
      'click_id': clickId,
      'fbclid': fbclid,
      'utm_source': utmSource,
      'utm_campaign': utmCampaign
    };

    for (const [name, val] of Object.entries(inputs)) {
      document.querySelectorAll(`input[name="${name}"], input[name*="${name}"]`).forEach(input => {
        input.value = val;
      });
    }
  }

  fillFields();
  setTimeout(fillFields, 1000); // Reintento para formularios dinámicos (Typeform/HubSpot)

  // Escuchar el submit para disparar el evento en el navegador
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function() {
      if (typeof fbq === 'function') {
        fbq('track', 'Lead', {
          content_name: document.title
        }, { eventID: clickId });
      }
    });
  });
});
</script>
```

---

## 💬 MÓDULO 4: Implementación en WHATSAPP & CRM

### Paso 4.1: Script del Botón de WhatsApp
En la landing page, el botón de WhatsApp no va directo a `wa.me`, sino que llama a esta función:
```html
<a href="#" class="cta-whatsapp-btn" onclick="goToWhatsApp(event)">Pedir Información por WhatsApp</a>

<script>
function goToWhatsApp(e) {
  e.preventDefault();
  let clickId = localStorage.getItem('_trk_cid');
  if (!clickId) {
    clickId = 'wa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    localStorage.setItem('_trk_cid', clickId);
  }

  // 1. Disparar evento de navegador con eventID para deduplicación
  if (typeof fbq === 'function') {
    fbq('track', 'Contact', {}, { eventID: clickId });
    fbq('track', 'Lead', {}, { eventID: clickId });
  }

  // 2. Redirigir con el ClickID inyectado al final
  const telefono = "595991596221"; // Número del asesor
  const texto = encodeURIComponent("Hola, quiero información sobre el servicio " + clickId);
  window.location.href = `https://wa.me/${telefono}?text=${texto}`;
}
</script>
```

### Paso 4.2: Webhooks en el CRM (Kommo / HubSpot / ActiveCampaign)
Configura en el embudo los Webhooks en cada etapa hacia tu servidor o RedTrack:

| Columna del CRM | Parámetro `type=` | URL del Webhook |
| :--- | :--- | :--- |
| **Lead Recibido** | `Lead` | `https://data.tutienda.com/postback?clickid={{lead.custom_fields.clickId}}&type=Lead` |
| **CBU / Presupuesto Enviado** | `InitiateCheckout` | `https://data.tutienda.com/postback?clickid={{lead.custom_fields.clickId}}&type=InitiateCheckout` |
| **Venta Ganada / Depósito** | `Purchase` | `https://data.tutienda.com/postback?clickid={{lead.custom_fields.clickId}}&sum={{lead.price}}&type=Purchase` |

---

## 🧪 MÓDULO 5: Protocolo de Validación y Testing

Ejecuta este protocolo antes de encender campañas publicitarias:

```
[1. Abrir con UTMs & fbclid] ➔ [2. Verificar Cookies y LocalStorage] ➔ [3. Ejecutar Conversión] ➔ [4. Meta Events Manager Test Tool] ➔ [5. Validar Deduplicación]
```

### Paso 5.1: Prueba con el "Test Code" de Meta
1. Ve a **Meta Events Manager** ➔ Selecciona el Píxel ➔ Pestaña **Probar eventos (Test Events)**.
2. Copia el código de prueba (ej: `TEST12345`).
3. En tu llamada de servidor o sGTM, añade el parámetro `"test_event_code": "TEST12345"`.
4. Ejecuta una compra o completa un lead de prueba.

### Paso 5.2: Qué debes ver en la pantalla de Meta:
- **Evento Navegador:** Aparece con el ícono del globo terráqueo 🌐.
- **Evento Servidor:** Aparece con el ícono del servidor 🖥️.
- **Estado de Deduplicación:** *"Deduplicado (Recibido vía Navegador y Servidor con mismo ID)"*.
- **Puntuación de Coincidencia (EMQ):** Debe figurar en **Verde (8.0 a 9.5 / 10)**.

---

## 💰 Resumen de Tiempos y Cobro del Servicio

| Tipo de Proyecto | Tiempo de Implementación | Precio de Venta Recomendado |
| :--- | :--- | :--- |
| **Shopify / E-commerce CAPI** | 2 a 3 horas | **$500 - $900 USD** |
| **Lead Gen (Forms + CRM)** | 2 a 4 horas | **$600 - $1,200 USD** |
| **WhatsApp + CRM + Split Testing** | 3 a 5 horas | **$800 - $1,800 USD** |
| **Mantenimiento Mensual (Retainer)** | 1 hora/mes de auditoría | **$150 - $350 USD / mes** |
