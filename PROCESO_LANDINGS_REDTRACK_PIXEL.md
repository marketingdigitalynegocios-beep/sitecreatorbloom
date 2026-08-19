# 📘 Manual de Operaciones Estándar (SOP) & Guía de Implementación
## Creación, Despliegue, A/B Testing (Split URL) y Tracking de Landings
### Stack: RedTrack + Meta Pixel + WhatsApp + Kommo CRM + GitHub + Vercel

Este manual detalla el **proceso secuencial y estandarizado de inicio a fin** para crear, desplegar, rotar mediante **Split URL A/B Testing** y medir con precisión las conversiones de tus páginas de aterrizaje hacia WhatsApp y CRM.

---

## 🏗️ 1. Arquitectura del Flujo de Tráfico y Split Testing

```mermaid
flowchart TD
    A[Anuncio en Meta Ads] -->|Campaign Tracking Link Único| B[RedTrack Tracker trk.accbloom.online]
    
    subgraph SPLIT_URL_ENGINE [Motor de Rotación A/B RedTrack]
        B -->|50% Tráfico / Peso 50| C1[Landing A: Enfoque Oferta]
        B -->|50% Tráfico / Peso 50| C2[Landing B: Enfoque Beneficios]
    end
    
    C1 -->|PageView en Vercel| D1[Meta Pixel Helper: PageView]
    C2 -->|PageView en Vercel| D2[Meta Pixel Helper: PageView]
    
    C1 -->|Clic en Botón CTA /click| E1[Dispara Contact + Lead]
    C2 -->|Clic en Botón CTA /click| E2[Dispara Contact + Lead]
    
    E1 --> G[RedTrack /click Handler]
    E2 --> G
    
    G -->|Asigna {clickid} único y redirige| H[WhatsApp Chat con +595... + Mensaje con ClickID]
    H -->|Cliente envía mensaje| I[Kommo CRM recibe {clickid} para Atribución de Ventas]
```

---

## 🌐 2. Infraestructura Fija (Configurada una sola vez)

| Elemento | Configuración / Valor |
| :--- | :--- |
| **Repositorio GitHub** | `https://github.com/marketingdigitalynegocios-beep/sitecreatorbloom.git` |
| **Hosting & Despliegue** | [Vercel](https://vercel.com) (Proyecto: `sitecreatorbloom`) |
| **URL Base de Producción** | `https://sitecreatorbloom.vercel.app` |
| **Dominio de Tracking RedTrack** | `trk.accbloom.online` |
| **Registro DNS en GoDaddy** | `CNAME` -> `trk` -> `sweud.ttrk.io` |
| **Meta Pixel Principal** | `3319413524888816` |

---

## 📋 3. Guía de Implementación Secuencial (Paso a Paso)

Sigue rigurosamente este orden cronológico desde el archivo local hasta la optimización en vivo:

```
[Paso 1: Archivos HTML] ➡️ [Paso 2: Git & Vercel] ➡️ [Paso 3: RedTrack Setup] ➡️ [Paso 4: Meta Ads] ➡️ [Paso 5: Testing] ➡️ [Paso 6: Optimización]
```

---

### 🔹 PASO 1: Preparación y Creación de los Archivos HTML (Variaciones A y B)

Crea dos archivos HTML distintos en el repositorio local (o uno solo si no vas a hacer Split Test):
- Variación A: `landing_fa_a.html` (ej: diseño con enfoque en bono/oferta directa).
- Variación B: `landing_fa_b.html` (ej: diseño con enfoque en prueba social/seguridad).

#### Requisitos obligatorios dentro del `<head>` de AMBAS versiones:
1. **Código del Meta Pixel**:
   ```html
   <!-- Meta Pixel Code -->
   <script>
   !function(f,b,e,v,n,t,s)
   {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
   n.callMethod.apply(n,arguments):n.queue.push(arguments)};
   if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
   n.queue=[];t=b.createElement(e);t.async=!0;
   t.src=v;s=b.getElementsByTagName(e)[0];
   s.parentNode.insertBefore(t,s)}(window, document,'script',
   'https://connect.facebook.net/en_US/fbevents.js');
   fbq('init', '3319413524888816');
   fbq('track', 'PageView');
   </script>
   <noscript>
     <img height="1" width="1" style="display:none"
     src="https://www.facebook.com/tr?id=3319413524888816&ev=PageView&noscript=1" />
   </noscript>
   ```
2. **Script Universal de RedTrack**:
   ```html
   <!-- RedTrack Universal Tracking Script -->
   <script type="text/javascript" src="https://trk.accbloom.online/track.js"></script>
   ```

#### Requisitos obligatorios en TODOS los botones de WhatsApp (CTA Principal y Barra Fija):
- **`href`**: `https://trk.accbloom.online/click` (Siempre apunta a la ruta de clic de RedTrack).
- **`onclick`**: Disparo de eventos del Meta Pixel.
```html
<!-- Botón Principal -->
<a href="https://trk.accbloom.online/click" 
   id="whatsapp-btn"  
   class="cta-button"
   onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
   ¡Quiero mi cuenta por WhatsApp!
</a>

<!-- Barra Fija Inferior (Sticky Bar) -->
<a href="https://trk.accbloom.online/click" 
   class="bono-bar"
   onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
  🎁 BONUS EXTRA ACTIVO - ¡Solicitalo ahora por WhatsApp!
</a>
```
> ⚠️ **Regla de Oro:** No uses enlaces directos a `wa.me` en el HTML. Todo debe pasar por `https://trk.accbloom.online/click` para que RedTrack capture el `clickid` e identifique qué landing generó la interacción.

---

### 🔹 PASO 2: Despliegue en GitHub y Publicación Automática en Vercel

Sube los cambios al repositorio remoto para generar las URLs públicas:

```bash
git add .
git commit -m "feat: Agregar landing_fa_a y landing_fa_b para A/B testing"
git push origin main
```

**Verificación de URLs de Producción:**
- Landing A: `https://sitecreatorbloom.vercel.app/landing_fa_a.html`
- Landing B: `https://sitecreatorbloom.vercel.app/landing_fa_b.html`

---

### 🔹 PASO 3: Configuración Secuencial en RedTrack

Sigue estrictamente este orden dentro del panel de RedTrack:

#### 1. Configurar la Oferta (Offer)
*(Si ya la tienes creada para ese asesor/número de WhatsApp, puedes reutilizarla).*
1. Ve a **Offers** ➔ **New**.
2. **Offer name**: `Landing/WhatsApp Favio`
3. **Offer source**: `WhatsApp Direct - Kommo CRM`
4. **URL**:
   ```text
   https://wa.me/595991596221?text=Quiero%20mi%20cuenta%20de%20ingreso%20{clickid}
   ```
5. Haz clic en **SAVE**.

#### 2. Registrar los Landers (Landing A y Landing B)
1. Ve a **Landers** ➔ **New** (para la primera versión):
   - **Name**: `Landing Favio - Versión A (Oferta)`
   - **URL**: `https://sitecreatorbloom.vercel.app/landing_fa_a.html`
   - **Tracking domain**: `trk.accbloom.online`
   - Haz clic en **SAVE**.
2. Ve a **Landers** ➔ **New** (para la segunda versión):
   - **Name**: `Landing Favio - Versión B (Beneficios)`
   - **URL**: `https://sitecreatorbloom.vercel.app/landing_fa_b.html`
   - **Tracking domain**: `trk.accbloom.online`
   - Haz clic en **SAVE**.

#### 3. Configurar la Campaña con Split Test (Rotación A/B)
1. Ve a **Campaigns** ➔ **New** (o edita la campaña existente).
2. **General Settings**:
   - **Name**: `Meta Ads - WhatsApp Favio [Split A/B]`
   - **Traffic channel**: `Facebook perfil X`
   - **Domain**: `trk.accbloom.online`
3. **Funnels / Stream Settings** (Sección derecha):
   - **Modo del Funnel**: `LANDING > OFFER`
   - **Sección Landings**:
     - Agrega **`Landing Favio - Versión A`** ➔ Asigna **Weight (Peso): `50`** (o 100).
     - Agrega **`Landing Favio - Versión B`** ➔ Asigna **Weight (Peso): `50`** (o 100).
   - **Sección Offers**:
     - Agrega **`Landing/WhatsApp Favio`** ➔ Asigna **Weight: `100`**.
4. Haz clic en **SAVE** (arriba a la derecha).

#### 4. Obtener el Enlace de Campaña para Meta Ads
Dentro de la campaña guardada, en **Tracking links and parameters**, copia el enlace generado:

```text
https://trk.accbloom.online/[CAMPAIGN_ID]?sub1={{ad.id}}&sub2={{adset.id}}&sub3={{campaign.id}}&sub4={{ad.name}}&sub5={{adset.name}}&sub6={{campaign.name}}&sub7={{placement}}&sub8={{site_source_name}}&utm_source=facebook&utm_medium=paid
```

---

### 🔹 PASO 4: Implementación en Meta Ads Manager

1. Ve a tu administrador de anuncios de Meta (**Meta Ads Manager**).
2. A nivel de **Anuncio (Ad)**:
   - En el campo **URL del sitio web / Destino**: Pega el enlace de campaña copiado en el Paso 3.4.
   - No necesitas crear dos anuncios separados para probar las dos páginas; el enlace de RedTrack se encargará de rotar el 50% del tráfico a la Versión A y el 50% a la Versión B de manera transparente.

---

### 🔹 PASO 5: Protocolo de Validación y Testing Pre-Lanzamiento

Antes de activar el presupuesto publicitario, ejecuta estas pruebas:

1. **Prueba de Rotación (Split Test):**
   - Abre una ventana en modo incógnito y pega el enlace de campaña de RedTrack.
   - Observa si carga `landing_fa_a.html`.
   - Cierra y abre otra ventana de incógnito nueva; pega el enlace nuevamente. Debe alternar a `landing_fa_b.html`.
2. **Prueba del Meta Pixel:**
   - Abre **Meta Pixel Helper**: Verifica que el evento `PageView` esté en verde.
3. **Prueba del Botón de WhatsApp:**
   - Haz clic en el botón principal o barra fija.
   - Verifica que Meta Pixel Helper registre los eventos `Contact` y `Lead`.
   - Verifica que se abra WhatsApp con el número correspondiente y que el mensaje incluya el `{clickid}` al final.
4. **Verificación en RedTrack Reports:**
   - En **Campaigns** > **Reports** > Agrupar por **Lander**:
   - Debes ver 1 visita (`Clicks`) y 1 clic a WhatsApp (`LP Clicks`) asignado a la landing correspondiente.

---

### 🔹 PASO 6: Monitoreo, Análisis y Declaración de la Landing Ganadora

Una vez que la campaña acumule tráfico (recomendado: mínimo 100 clics por variación):

1. Ve a **RedTrack** ➔ **Reports** ➔ Selecciona tu campaña.
2. Agrupa el reporte por **Lander**.
3. **Evalúa las métricas clave:**
   - **LP CTR (Click-Through Rate):** % de visitantes que hicieron clic hacia WhatsApp.
   - **CR% (Conversion Rate):** % de personas que se convirtieron en Leads/Ventas en Kommo CRM.
   - **CPA (Costo por Adquisición):** Cuánto costó cada contacto o cliente cerrado por landing.
4. **Declarar la Ganadora (Pasar al 100%):**
   - Cuando una versión supere claramente a la otra, entra a la Campaña en RedTrack.
   - En **Funnels**:
     - Cambia el peso de la landing perdedora a **`0`** (o elimínala del stream).
     - Cambia el peso de la landing ganadora a **`100`**.
   - Haz clic en **SAVE**.
   - *Nota: Todo esto se hace sin pausar el anuncio en Meta Ads y sin pasar nuevamente por revisión publicitaria.*

---

## 🤖 4. Plantilla Base HTML para Nuevas Variaciones

Utiliza esta plantilla limpia y optimizada para cualquier variación nueva que desees crear:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plataforma Verificada | Landing Variación A</title>
  <link rel="icon" type="image/png" href="URL_FAVICON" />

  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '3319413524888816');
  fbq('track', 'PageView');
  </script>
  <noscript>
    <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=3319413524888816&ev=PageView&noscript=1" />
  </noscript>

  <!-- RedTrack Universal Tracking Script -->
  <script type="text/javascript" src="https://trk.accbloom.online/track.js"></script>

  <style>
    /* Estilos CSS Responsive y Optimizados para Móvil */
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, sans-serif; }
    body { background-color: #ffffff; color: #111b21; min-height: 100vh; display: flex; flex-direction: column; }
    header { padding: 18px 20px; text-align: center; border-bottom: 1px solid #e0e0e0; background-color: #ffffff; }
    header img { height: 38px; width: auto; }
    main { max-width: 480px; width: 100%; margin: 30px auto; padding: 20px; text-align: center; flex: 1; }
    .logo-circle { width: 120px; height: 120px; margin: 0 auto 18px; border-radius: 50%; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.12); border: 3px solid #25d366; }
    .logo-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #111b21; }
    h2 { color: #25d366; font-size: 18px; font-weight: 600; margin-bottom: 18px; }
    .cta-box { background-color: #eef6f3; padding: 14px 18px; border-radius: 12px; margin-bottom: 18px; font-size: 15px; font-weight: 600; color: #0f5132; border: 1px solid #c3e6cb; }
    .cta-button { background-color: #25d366; color: #ffffff; padding: 16px 32px; font-size: 17px; font-weight: bold; border: none; border-radius: 30px; text-decoration: none; display: inline-block; width: 100%; max-width: 320px; margin: 10px auto; box-shadow: 0 4px 15px rgba(37,211,102,0.4); animation: pulse 1.6s infinite ease-in-out; cursor: pointer; transition: transform 0.2s, background-color 0.2s; }
    .cta-button:hover, .cta-button:active { background-color: #20ba59; transform: scale(1.02); color: #ffffff; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.04); } 100% { transform: scale(1); } }
    .bono-bar { position: fixed; bottom: 0; left: 0; width: 100%; background: linear-gradient(90deg, #16a34a, #25d366); color: #ffffff; text-align: center; padding: 12px 10px; font-weight: bold; font-size: 14px; text-decoration: none; display: block; z-index: 999; box-shadow: 0 -2px 10px rgba(0,0,0,0.15); animation: flash 2.5s infinite; cursor: pointer; }
    @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
    footer { text-align: center; font-size: 12px; color: #888; margin-top: 30px; padding-bottom: 75px; }
  </style>
</head>
<body>

  <header>
    <div class="whatsapp-logo-header" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
      <svg width="34" height="34" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M19.5 0C8.73 0 0 8.73 0 19.5C0 23.08 0.96 26.54 2.76 29.56L0.21 38.79L9.67 36.32C12.57 37.95 15.93 38.89 19.5 38.89C30.27 38.89 39 30.16 39 19.5C39 8.73 30.27 0 19.5 0ZM32.32 27.67C31.81 29.11 29.8 30.24 28.27 30.56C27.23 30.77 25.87 30.93 21.28 29.03C15.42 26.61 11.64 20.67 11.35 20.28C11.06 19.89 8.97 17.11 8.97 14.23C8.97 11.35 10.43 9.94 11.02 9.34C11.5 8.85 12.28 8.64 13.06 8.64C13.31 8.64 13.53 8.65 13.72 8.66C14.29 8.69 14.58 8.72 14.95 9.61C15.42 10.74 16.56 13.53 16.7 13.82C16.84 14.11 16.98 14.5 16.79 14.89C16.6 15.28 16.46 15.44 16.17 15.78C15.88 16.12 15.6 16.35 15.31 16.7C15.05 16.99 14.76 17.31 15.09 17.88C15.42 18.44 16.56 20.31 18.24 21.81C20.41 23.74 22.17 24.36 22.8 24.62C23.27 24.82 23.83 24.77 24.17 24.41C24.6 23.94 25.13 23.17 25.67 22.42C26.05 21.89 26.54 21.82 27.02 22.01C27.51 22.19 30.13 23.49 30.67 23.76C31.2 24.03 31.56 24.16 31.69 24.39C31.81 24.62 31.81 25.75 32.32 27.67Z" fill="#25D366"/>
      </svg>
      <span style="font-size: 22px; font-weight: 700; color: #111b21; letter-spacing: -0.5px;">WhatsApp</span>
    </div>
  </header>

  <main>
    <div class="logo-circle">
      <img src="URL_IMAGEN_LOGO" alt="Logo" />
    </div>

    <h1>✅ Titulo Principal Variación ✅</h1>
    <h2>Subtitulo o Beneficio Diferenciado</h2>

    <div class="cta-box">
      💸 OFERTA / BONUS ACTIVO 🎰
    </div>

    <!-- Botón Principal RedTrack -->
    <a href="https://trk.accbloom.online/click" 
       id="whatsapp-btn"  
       class="cta-button"
       onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
       Ir a WhatsApp Ahora
    </a>
  </main>

  <footer>
    © 2025 Empresa. Todos los derechos reservados.
  </footer>

  <!-- Barra Fija Inferior RedTrack -->
  <a href="https://trk.accbloom.online/click" 
     class="bono-bar"
     onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
    🎁 BONUS EXTRA ACTIVO - ¡Solicitalo ahora por WhatsApp!
  </a>

</body>
</html>
```

