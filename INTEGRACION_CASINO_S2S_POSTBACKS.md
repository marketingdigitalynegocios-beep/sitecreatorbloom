# 📋 Especificaciones Técnicas de Integración S2S Postback
## Server-to-Server (S2S) Technical Integration Specifications
### RedTrack S2S ➔ Meta Ads CAPI ➔ BettBit Casino

---

## 🇪🇸 ESPAÑOL: Guía de Integración para el Casino

### 📌 Resumen de la Integración
Este documento contiene las especificaciones para realizar la integración Servidor a Servidor (S2S Callback / Postback) entre el backend del Casino y nuestro servidor de seguimiento RedTrack, el cual está enlazado directamente a la API de Conversiones (CAPI) de Meta Ads.

---

### 1. Captura del Click ID en el Enlace de Afiliado
Cuando entregamos a un jugador el enlace de registro, este incluye nuestro identificador único de seguimiento en el parámetro `clickid`:

**URL Ejemplo:**
`https://bettbit.com/?clickid={REDTRACK_CLICK_ID}&id=JO8420`

> **Requisito para el Backend del Casino:**
> Al aterrizar el usuario en el sitio, su backend debe capturar el parámetro `clickid` de la URL, guardarlo en la sesión o registro del jugador y asociarlo al ID de usuario en su base de datos.

---

### 2. Endpoints de Callback / Postback S2S
El backend del casino debe ejecutar una solicitud **HTTP GET** a las siguientes URLs cuando se confirmen los eventos:

#### 📌 Evento 1: Registro Exitoso del Jugador (`CompleteRegistration`)
Ejecutar cuando el usuario complete el formulario de registro:
```http
https://trk.accbloom.online/postback?clickid={clickid}&type=CompleteRegistration
```

#### 📌 Evento 2: Primer Depósito Confirmado - FTD (`Purchase`)
Ejecutar cuando se acredite con éxito el primer depósito del jugador:
```http
https://trk.accbloom.online/postback?clickid={clickid}&type=Purchase&sum={deposit_amount}&currency=USD
```

---

### 3. Reemplazo de Macros por el Backend
- `{clickid}`: Debe ser reemplazado dinámicamente por el backend con el ID de clic recibido en la URL de afiliado.
- `{deposit_amount}`: Debe ser reemplazado con el valor numérico del primer depósito (ejemplo: `20.00` o `50.00`) para poder optimizar en Meta Ads por Valor de Conversión (ROAS).

---

### ✉️ Plantilla de Correo / Mensaje para Enviar (Español):

```text
Hola equipo de BettBit,

De acuerdo con lo conversado sobre la integración Servidor a Servidor (S2S Callback), aquí tienen la especificación técnica para enviarnos las notificaciones de registros y depósitos (FTDs) a nuestro servidor de seguimiento RedTrack:

1. Parámetro de Tracking en Enlaces de Afiliado:
A los usuarios les entregaremos el enlace de registro pasando nuestro identificador único de clic en el parámetro clickid:
URL Ejemplo: https://bettbit.com/?clickid={REDTRACK_CLICK_ID}&id=JO8420
Por favor asegúrense de que su backend guarde este parámetro clickid en la sesión o registro del jugador.

2. Endpoints de Postback / Callbacks S2S (HTTP GET):

📌 Evento 1: Registro Exitoso del Jugador (CompleteRegistration)
https://trk.accbloom.online/postback?clickid={clickid}&type=CompleteRegistration

📌 Evento 2: Primer Depósito Confirmado - FTD (Purchase)
https://trk.accbloom.online/postback?clickid={clickid}&type=Purchase&sum={deposit_amount}&currency=USD

3. Reemplazo de Macros por su Backend:
- {clickid}: ID de clic único recibido en la URL de afiliado.
- {deposit_amount}: Monto numérico del primer depósito (ej: 20.00 o 50.00) para optimización de ROAS en Meta Ads.

Quedamos atentos a su confirmación para realizar una prueba de trazabilidad en cuanto lo tengan configurado en su backend.
```

---

<br>

---

## 🇬🇧 ENGLISH: Integration Guide for Casino Tech Team

### 📌 Integration Overview
This document specifies the Server-to-Server (S2S Callback / Postback) integration between the Casino backend and our RedTrack tracking server, which is directly connected to Meta Ads Conversions API (CAPI).

---

### 1. Click ID Capture in Affiliate Link
When we direct a player to the registration link, it will include our unique tracking identifier in the `clickid` parameter:

**Example URL:**
`https://bettbit.com/?clickid={REDTRACK_CLICK_ID}&id=JO8420`

> **Casino Backend Requirement:**
> Upon user arrival, your backend must capture the `clickid` URL parameter, save it in the player's session or database record, and link it to the player's account ID.

---

### 2. S2S Callback / Postback Endpoints
The casino backend must execute an **HTTP GET** request to the following URLs when events occur:

#### 📌 Event 1: Player Registration (`CompleteRegistration`)
Trigger when a player successfully completes the registration form:
```http
https://trk.accbloom.online/postback?clickid={clickid}&type=CompleteRegistration
```

#### 📌 Event 2: First Time Deposit - FTD (`Purchase`)
Trigger when the player's first deposit is successfully credited:
```http
https://trk.accbloom.online/postback?clickid={clickid}&type=Purchase&sum={deposit_amount}&currency=USD
```

---

### 3. Macro Replacement by Backend
- `{clickid}`: Must be dynamically replaced by your backend with the click ID received in the affiliate link.
- `{deposit_amount}`: Must be replaced with the numerical value of the first deposit (e.g., `20.00` or `50.00`) for Meta Ads Conversion Value (ROAS) optimization.

---

### ✉️ Email / Message Template to Send (English):

```text
Hi BettBit Tech & Affiliate Team,

Following up on our discussion regarding the Server-to-Server (S2S Callback) integration, here are the technical specifications to send registration and First Time Deposit (FTD) callbacks to our RedTrack server:

1. Affiliate Link Tracking Parameter:
When delivering registration links to players, we will append our unique click ID in the clickid parameter:
Example URL: https://bettbit.com/?clickid={REDTRACK_CLICK_ID}&id=JO8420
Please ensure your backend captures and stores this clickid parameter in the player's account session/record.

2. S2S Callback / Postback Endpoints (HTTP GET):

📌 Event 1: Player Registration (CompleteRegistration)
https://trk.accbloom.online/postback?clickid={clickid}&type=CompleteRegistration

📌 Event 2: First Time Deposit - FTD (Purchase)
https://trk.accbloom.online/postback?clickid={clickid}&type=Purchase&sum={deposit_amount}&currency=USD

3. Backend Macro Replacement:
- {clickid}: Unique click ID received in the affiliate link.
- {deposit_amount}: Numerical amount of the first deposit (e.g., 20.00 or 50.00) for Meta Ads ROAS optimization.

Please let us know once this is configured on your backend so we can run a test conversion.
```
