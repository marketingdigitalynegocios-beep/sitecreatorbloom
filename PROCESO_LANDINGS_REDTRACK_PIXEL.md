# 📘 Manual de Operaciones Estándar (SOP)
## Creación, Despliegue y Tracking de Landings (RedTrack + Meta Pixel + WhatsApp + Vercel)

Este documento describe el **proceso exacto y estandarizado paso a paso** para crear, desplegar y conectar landings de alta conversión con Meta Pixel, RedTrack (atribución y postbacks para CRM como Kommo) y despliegue automático en Vercel a través de GitHub.

---

## 🏗️ 1. Arquitectura del Flujo de Tráfico y Atribución

```mermaid
flowchart TD
    A[Anuncio en Meta Ads] -->|URL de Campaña RedTrack| B[RedTrack Tracker trk.accbloom.online]
    B -->|Registra visita + Genera Cookie Sesión| C[Landing Page en Vercel]
    C -->|Carga de página| D[Meta Pixel: Evento PageView]
    C -->|Usuario hace clic en WhatsApp| E[Botón CTA / Barra Fija]
    E -->|1. Dispara evento en navegador| F[Meta Pixel: Eventos Contact y Lead]
    E -->|2. Redirige a /click| G[RedTrack /click Handler]
    G -->|Genera {clickid} único y redirige| H[WhatsApp Chat con +595... y Mensaje + ClickID]
    H -->|Cliente envía mensaje| I[Kommo CRM recibe {clickid} para Atribución]
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

## 📋 3. Proceso Paso a Paso para una Nueva Landing

### 🔹 Paso 1: Preparación del Archivo HTML
1. Nombre del archivo: `landing_[nombre].html` (ej: `landing_fa.html`) o `index.html` si es la raíz.
2. **Dentro del `<head>`** colocar obligatoriamente:
   - **Meta Pixel Code**:
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
     fbq('init', 'ID_DE_TU_PIXEL');
     fbq('track', 'PageView');
     </script>
     <noscript>
       <img height="1" width="1" style="display:none"
       src="https://www.facebook.com/tr?id=ID_DE_TU_PIXEL&ev=PageView&noscript=1" />
     </noscript>
     ```
   - **Script Universal de RedTrack**:
     ```html
     <!-- RedTrack Universal Tracking Script -->
     <script type="text/javascript" src="https://trk.accbloom.online/track.js"></script>
     ```
3. **En los enlaces de los botones de WhatsApp (CTA principal y Barra fija)**:
   - **`href`**: `https://trk.accbloom.online/click`
   - **`onclick`**: Disparo de eventos del Meta Pixel:
     ```html
     <a href="https://trk.accbloom.online/click" 
        id="whatsapp-btn"  
        class="cta-button"
        onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
        Ir a WhatsApp Ahora
     </a>
     ```
   - **Barra inferior fija (Sticky Bar)**:
     ```html
     <a href="https://trk.accbloom.online/click" 
        class="bono-bar"
        onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
       🎁 BONUS EXTRA ACTIVO - ¡Solicitalo ahora por WhatsApp!
     </a>
     ```
4. **⚠️ Regla Crítica**: Asegurarse de que **NO** existan scripts de tracking obsoletos (como scripts viejos de Adveri o scripts de sobreescritura de enlaces de WhatsApp) que sobreescriban el `href` dinámicamente.

---

### 🔹 Paso 2: Despliegue en GitHub y Vercel
Una vez creado o editado el archivo HTML, ejecutar:
```bash
git add .
git commit -m "Nueva landing o actualización de tracking"
git push origin main
```
> Vercel detecta el commit automáticamente y en menos de 10 segundos queda publicada en:
> `https://sitecreatorbloom.vercel.app/nombre_del_archivo.html`

---

### 🔹 Paso 3: Configuración en RedTrack

#### 1. Crear la Oferta (Offer)
- Ve a **Offers** ➔ **New**.
- **Offer name**: `[NombreProyecto]/WhatsApp [Persona/Agente]` (ej: `Landing/WhatsApp Favio`).
- **Offer source**: `WhatsApp Direct - Kommo CRM` (o la fuente configurada).
- **URL**: 
  ```text
  https://wa.me/CODIGO_PAIS_NUMERO?text=Tu%20Mensaje%20{clickid}
  ```
  *(Ejemplo: `https://wa.me/595991596221?text=Quiero%20mi%20cuenta%20de%20ingreso%20{clickid}`)*.
- Guarda la oferta (**SAVE**).

#### 2. Crear el Lander
- Ve a **Landers** ➔ **New**.
- **Name**: `Landing [Nombre]` (ej: `Landing Vercel Favio`).
- **URL**: `https://sitecreatorbloom.vercel.app/tu_archivo.html` (o la URL raíz si es `index.html`).
- **Tracking domain**: `trk.accbloom.online`
- Guarda el lander (**SAVE**).

#### 3. Crear la Campaña (Campaign)
- Ve a **Campaigns** ➔ **New**.
- **Name**: `Meta Ads - WhatsApp [Nombre]`
- **Traffic channel**: `Facebook perfil X`
- **Domain**: `trk.accbloom.online`
- **Funnels** (a la derecha):
  - Modo: `LANDING > OFFER`
  - En **Landings**: Selecciona el Lander creado en el sub-paso 2.
  - En **Offers**: Selecciona la Offer creada en el sub-paso 1.
- Haz clic en **SAVE** (arriba a la derecha).

---

### 🔹 Paso 4: Obtención del Enlace para Anuncios de Meta Ads
En la campaña guardada, dentro de la sección **Tracking links and parameters**, copia el **Campaign tracking link**:

```text
https://trk.accbloom.online/[CAMPAIGN_ID]?sub1={{ad.id}}&sub2={{adset.id}}&sub3={{campaign.id}}&sub4={{ad.name}}&sub5={{adset.name}}&sub6={{campaign.name}}&sub7={{placement}}&sub8={{site_source_name}}&utm_source=facebook&utm_medium=paid
```
> 📌 **Este es el enlace exacto que se pega en el anuncio de Facebook / Instagram Ads.**

---

## 🧪 4. Checklist de Validación y Testing

Antes de lanzar pauta publicitaria en Meta Ads, realiza esta prueba:

1. **Abrir el enlace de campaña de RedTrack** en una pestaña nueva o ventana de incógnito:
   `https://trk.accbloom.online/[CAMPAIGN_ID]`
2. **Verificar que cargue la landing** en Vercel con los parámetros de sesión (`?rtkcid=...`).
3. **Verificar con la extensión "Meta Pixel Helper"**:
   - Que el evento `PageView` esté en verde.
4. **Hacer clic en el botón de WhatsApp**:
   - Que Meta Pixel Helper dispare `Lead` y `Contact`.
   - Que abra WhatsApp con el número correcto (ej: `+595 991 596 221`).
   - Que el mensaje contenga el código numérico/alfanumérico generado al final (el `clickid`).
5. **Verificar en RedTrack**:
   - En **Reports** / **Campaigns**, debe figurar **1 Click** (visita a la landing) y **1 LP Click** (clic hacia WhatsApp).

---

## 🤖 5. Plantilla Base de Landing One-Page de Alta Conversión

Para crear una nueva landing, basta con duplicar esta estructura:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plataforma Verificada | Titulo Landing</title>
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
    <img src="https://static.whatsapp.net/rsrc.php/yZ/r/JvsnINJ2CZv.svg" alt="WhatsApp" />
  </header>

  <main>
    <div class="logo-circle">
      <img src="URL_IMAGEN_LOGO" alt="Logo" />
    </div>

    <h1>✅ Titulo Principal ✅</h1>
    <h2>Subtitulo o Beneficio</h2>

    <div class="cta-box">
      💸 OFERTA / BONUS ACTIVO 🎰
    </div>

    <!-- Botón Principal -->
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

  <!-- Barra Fija Inferior -->
  <a href="https://trk.accbloom.online/click" 
     class="bono-bar"
     onclick="if(typeof fbq === 'function') { fbq('track', 'Contact'); fbq('track', 'Lead'); }">
    🎁 BONUS EXTRA ACTIVO - ¡Solicitalo ahora por WhatsApp!
  </a>

</body>
</html>
```
