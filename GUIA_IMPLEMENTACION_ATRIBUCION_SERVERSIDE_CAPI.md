# 📘 Guía Maestra de Implementación: Atribución Server-Side & Meta CAPI
## Manual de Operaciones Estándar (SOP) para Agencias y Media Buyers
### Cobertura: E-Commerce (Shopify/WooCommerce), Generación de Leads (Formularios/CRM) y WhatsApp

Este documento detalla el **paso a paso técnico y operativo universal** para implementar un sistema de rastreo de primera persona (*1st Party Data*), atribución multicanal y envío de conversiones por servidor (*Server-Side Conversions API - CAPI*) hacia Meta Ads, Google Ads y TikTok Ads para cualquier tipo de negocio.

---

## 🏗️ 1. Arquitectura Universal del Flujo de Datos

```mermaid
flowchart TD
    subgraph TRAFICO [1. Captura de Tráfico Publicitario]
        A1[Meta Ads / Google / TikTok] -->|URL con fbclid, gclid, UTMs| B[Landing / Web / E-commerce]
        B -->|Universal JS Script / 1st Party Cookie| C[Almacenamiento Local de Sesión: {click_id, fbp, fbc, IP, UA, UTMs}]
    end

    subgraph CANALES_CONVERSION [2. Tipos de Conversión]
        C -->|Caso A: E-commerce| D1[Shopify / WooCommerce: Compra Web]
        C -->|Caso B: Formulario Web| D2[Landing / Typeform / HubSpot: Enviar Lead]
        C -->|Caso C: WhatsApp / CRM| D3[Kommo / CRM: Cierre Offline por Asesor]
    end

    subgraph PROCESAMIENTO [3. Servidor de Atribución / sGTM / Router]
        D1 -->|Webhook de Pedido con Session ID| E[Servidor de Atribución / Webhook Engine]
        D2 -->|API / Webhook con Session ID| E
        D3 -->|Postback de CRM con {clickid}| E
    end

    subgraph CAPI_DISPATCHER [4. Retroalimentación a Plataformas de Anuncios]
        E -->|Meta Graph API v20.0 CAPI| F1[Meta Ads Manager: ROAS & CPA Real]
        E -->|Enhanced Conversions API| F2[Google Ads]
        E -->|Events API| F3[TikTok Ads]
    end
```

---

## 🌐 2. Infraestructura Base Requerida

| Componente | Opción Estándar (sGTM) | Opción Serverless / Código Propio |
| :--- | :--- | :--- |
| **Servidor de Rastreo** | Stape.io o Google Cloud Platform (sGTM) | Cloudflare Worker / Vercel Edge Function |
| **Subdominio de 1ª Parte** | `trk.tudominio.com` o `data.tudominio.com` | `api-trk.tudominio.com` |
| **Registro DNS** | `CNAME` apuntando al endpoint del servidor | `CNAME` apuntando a Cloudflare / Vercel |
| **Persistencia de Sesión** | Cookies de 1ª parte (`HttpOnly`, `SameSite=Lax`) | LocalStorage + Cookie `_track_cid` (Duración 90-180 días) |

---

## 📋 3. Implementación por Tipo de Negocio (Paso a Paso)

---

### 🛍️ CASO 1: E-Commerce (Shopify y WooCommerce)

El objetivo es capturar el 100% de las compras reales, incluyendo compras con métodos de pago externos (Mercado Pago, Stripe, PayPal, Transferencia) y pagos contra entrega.

#### Paso 1.1: Captura de Parámetros en el Frontend
Colocar en el `<head>` del tema (o mediante GTM Web):
```html
<script>
  (function() {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    const gclid = params.get('gclid');
    const ttclid = params.get('ttclid');
    
    // Generar ID único de sesión si no existe
    let clickId = localStorage.getItem('_trk_cid');
    if (!clickId || fbclid) {
      clickId = 'cid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('_trk_cid', clickId);
      document.cookie = "_trk_cid=" + clickId + "; path=/; max-age=15552000; SameSite=Lax";
    }

    if (fbclid) localStorage.setItem('_trk_fbclid', fbclid);
    if (gclid) localStorage.setItem('_trk_gclid', gclid);
  })();
</script>
```

#### Paso 1.2: Inyección de Metadatos en el Carrito / Pedido
- **En Shopify:** Inyectar el `_trk_cid` en los `attributes` del checkout mediante cart attributes:
  ```javascript
  fetch('/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributes: {
        'tracking_click_id': localStorage.getItem('_trk_cid'),
        'fbclid': localStorage.getItem('_trk_fbclid')
      }
    })
  });
  ```
- **En WooCommerce:** Guardar el `_trk_cid` como metadato del pedido (`order_meta`) en un campo oculto del checkout.

#### Paso 1.3: Webhook de Pedido Creado / Pagado
1. Configurar un Webhook en Shopify (`orders/paid`) o WooCommerce (`woocommerce_order_status_completed`).
2. Enviar el payload al Servidor de Atribución.
3. **El Servidor extrae:**
   - `event_name`: `"Purchase"`
   - `event_id`: Número de Orden (para deduplicación con el navegador)
   - `value`: Total pagado (ej: `49.99`)
   - `currency`: `"USD"`, `"ARS"`, `"COP"`, etc.
   - `user_data`: Email (hasheado SHA256), Teléfono (hasheado SHA256), IP del cliente y User Agent.
   - `custom_data`: Contenido de la orden, IDs de productos.

---

### 📝 CASO 2: Generación de Leads (Formularios Web / Landings / Typeform)

Para servicios, B2B, inmobiliarias, clínicas, academias o cursos con formularios embebidos.

#### Paso 2.1: Campos Ocultos en el Formulario (Hidden Fields)
En cualquier formulario (Elementor Forms, HubSpot, Typeform, Gravity Forms, etc.), añadir 4 campos ocultos:
- `click_id`
- `fbclid`
- `utm_source`
- `utm_campaign`

#### Paso 2.2: Relleno Automático de Campos Ocultos
Añadir este script en la landing page para autocompletar los campos antes de enviar:
```javascript
document.addEventListener("DOMContentLoaded", function() {
  const clickId = localStorage.getItem('_trk_cid') || '';
  const fbclid = localStorage.getItem('_trk_fbclid') || '';

  const inputClickId = document.querySelector('input[name="click_id"], input[name="tracking_id"]');
  if (inputClickId) inputClickId.value = clickId;

  const inputFbclid = document.querySelector('input[name="fbclid"]');
  if (inputFbclid) inputFbclid.value = fbclid;
});
```

#### Paso 2.3: Disparo Dual (Navegador + Servidor)
1. **Frontend:** El formulario dispara el evento estándar de Meta Pixel `fbq('track', 'Lead', {}, {eventID: clickId})`.
2. **Backend:** El CRM o el Webhook del formulario envía el evento `Lead` al servidor con el mismo `event_id = clickId`.
3. **Resultado:** Meta deduplica el evento y sube la puntuación de calidad de coincidencia (*Event Quality Score*) a 9.0+/10.

---

### 💬 CASO 3: Ventas por WhatsApp & CRM (Kommo, HubSpot, Zoho, ActiveCampaign)

Para negocios de iGaming, afiliados, servicios de ticket alto o ventas consultivas donde el cierre ocurre por chat.

#### Paso 3.1: Enrutador del Botón de WhatsApp
El enlace de WhatsApp no debe ser directo a `wa.me`, sino pasar por la función generadora de Click ID:
```html
<a href="#" id="cta-whatsapp" class="btn-whatsapp">Contactar por WhatsApp</a>

<script>
  document.getElementById("cta-whatsapp").addEventListener("click", function(e) {
    e.preventDefault();
    const clickId = localStorage.getItem('_trk_cid');
    const mensaje = encodeURIComponent("Hola, quiero información " + clickId);
    const telefono = "595991596221"; // Número oficial
    
    // Disparar evento de clic en navegador
    if (typeof fbq === 'function') {
      fbq('track', 'Contact', {}, {eventID: clickId});
    }
    
    // Redirigir a WhatsApp
    window.location.href = `https://wa.me/${telefono}?text=${mensaje}`;
  });
</script>
```

#### Paso 3.2: Captura en el CRM (Kommo / HubSpot)
1. Al recibir el primer mensaje, el Salesbot o la integración extrae el código alfanumérico al final del texto y lo guarda en el campo del Lead: `clickId`.
2. **Importante:** Asegurar que ningún bot posterior sobreescriba o limpie este campo.

#### Paso 3.3: Webhooks por Etapa del Embudo (Pipeline)
Configurar los Webhooks en cada columna del CRM:
- **Etapa 1 (Lead Calificado):**
  `https://tu-servidor.com/postback?clickid={{lead.clickId}}&type=Lead`
- **Etapa 2 (Propuesta / CBU / Pago Iniciado):**
  `https://tu-servidor.com/postback?clickid={{lead.clickId}}&type=InitiateCheckout`
- **Etapa 3 (Venta Ganada / Depósito Confirmado):**
  `https://tu-servidor.com/postback?clickid={{lead.clickId}}&sum={{lead.price}}&type=Purchase`

---

## 🛡️ 4. Formato de Envío a Meta Conversions API (CAPI)

Cuando el servidor recibe el Webhook o Postback, ejecuta la llamada oficial a Meta Graph API:

**Endpoint:**
`POST https://graph.facebook.com/v20.0/{PIXEL_ID}/events?access_token={API_ACCESS_TOKEN}`

**Payload JSON Estándar (Máxima Calidad de Coincidencia):**
```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1724075400,
      "event_id": "cid_1724075400_abc123",
      "action_source": "website",
      "user_data": {
        "client_ip_address": "191.127.216.249",
        "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "fbc": "fb.1.1724075400.IwAR2...",
        "fbp": "fb.1.1724075400.123456789",
        "em": ["4f729227c8a32a68cfb93db0a46cb32087eb41935c13fe68c92a95c960309e3a"],
        "ph": ["99b114d48f76e3381a1795c65cd094a974ea9ba7a1758c0dfae62e92c21966a2"]
      },
      "custom_data": {
        "currency": "USD",
        "value": 45.00
      }
    }
  ]
}
```

---

## 🧪 5. Protocolo de Verificación y Diagnóstico

1. **En Meta Events Manager (Administrador de Eventos):**
   - Ve a **Historial del Píxel** ➔ Pestaña **Probar Eventos (Test Events)**.
   - Pega tu código `TESTXXXXX` en el payload del servidor para ver los eventos llegar en vivo en la consola de Meta.
2. **Puntuación de Calidad (Event Match Quality - EMQ):**
   - Meta evaluará la calidad de tus eventos del 1 al 10.
   - Con `fbc`, `fbp`, IP y User-Agent tu puntuación estará en **7.0 - 8.5/10**.
   - Si agregas Email y Teléfono hasheados (SHA-256), la puntuación alcanzará **8.5 - 9.5/10**.
3. **Deduplicación:**
   - Verifica que Meta indique: *"Evento recibido del navegador y del servidor - Deduplicado correctamente"*.

---

## 💼 6. Cómo Vender este Servicio como Agencia / Media Buyer

### Paquetes Sugeridos:

| Nivel de Servicio | Alcance | Precio Recomendado |
| :--- | :--- | :--- |
| **Setup CAPI Básico (Lead Gen)** | 1 Dominio + Formularios Web + Meta CAPI | $350 - $600 USD (Único) |
| **Setup CAPI E-commerce Pro** | Shopify / WooCommerce + Recuperación de Carrito + CAPI | $600 - $1,200 USD (Único) |
| **Setup Omnicanal CRM + WhatsApp** | CRM (Kommo/HubSpot) + WhatsApp + Split Testing + CAPI | $800 - $1,800 USD (Único) |
| **Retainer de Atribución & Data** | Auditoría continua, ROAS real, calibración EMQ | $150 - $350 USD / mes |
