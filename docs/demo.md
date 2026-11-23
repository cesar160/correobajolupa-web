# Guion del video demostrativo

**Duración objetivo:** 4 minutos (rango aceptable: 3–5 min).
**Formato:** 1920×1080, 30 fps, voz en español + subtítulos.
**Regla de oro:** usar solo **datos sintéticos**. Nada de correos, nombres ni contraseñas reales.

> **Nota para grabar con la API real:** hoy el back sirve M0–M6. Las rutas de **M7**
> (`/audit`, `/incidents/{id}/actions`, `/incidents/{id}/quarantine`, `/actions/{id}/restore`)
> devuelven **404**. Por eso, con API real **omite el bloque de auditoría (3:35–4:00)** del
> guion y cierra en el incidente. Si quieres mostrar cuarentena/auditoría, espera a que M7
> esté integrado o graba ese tramo con el servidor simulado, aclarando en el video que es una
> simulación.

---

## 1. Checklist antes de grabar

### Entorno
- [ ] Front corriendo: `npm run dev` en `correobajolupa-web` (puerto 5173).
- [ ] API corriendo en `127.0.0.1:3000` (back real con su Compose, o el mock).
- [ ] Si usas el mock, **oculta la terminal** y no muestres sus respuestas.
- [ ] Navegador al 110–125 % de zoom, sin pestañas de más, sin bookmarks bar.
- [ ] Notificaciones del sistema desactivadas / modo no molestar.
- [ ] OBS Studio: `Windows Capture` → pestaña del navegador → **capturar cursor activado**.

### Datos de prueba (sintéticos)
- [ ] Cuenta: `cesar.toledo@ejemplo.invalid` / contraseña de prueba larga.
- [ ] Archivo `C1-combinado-reglas-1-2-5.eml` copiado al escritorio como `becas-institucionales.eml`.
- [ ] 1 indicador confirmado con al menos 1 candidato.
- [ ] 1 incidente en estado `analyzing`.
- [ ] Opcional (si el back ya tiene M7): 1 acción de cuarentena + 2 eventos de auditoría.

### Verificación rápida (antes de dar play)
- [ ] Login funciona.
- [ ] El detalle muestra pestañas y el visor HTML carga (si el correo trae HTML).
- [ ] Los enlaces se ven como `hxxps://...[.]...`, nunca como enlaces clicables.
- [ ] No hay 404s ni errores en la consola (no hace falta mostrarla, pero revísalo).

---

## 2. Guion palabra por palabra

### 0:00 – 0:20 · Apertura

**Acción:** Pantalla del login. No hagas nada todavía; deja que se vea el split negro/gris y la esfera.

**Di:**
> "CorreoBajoLupa es una plataforma web que analiza correos sospechosos con reglas explicables. En este video veremos el recorrido completo: subir un mensaje, entender los hallazgos y actuar sobre una campaña, siempre con datos sintéticos."

**Texto en pantalla (OBS):** `CorreoBajoLupa · Análisis explicable de correos sospechosos`

---

### 0:20 – 0:50 · Acceso

**Acciones:**
1. Escribe el correo de prueba.
2. Escribe la contraseña (usa placeholder; no hace falta que se vea real).
3. Click en **Iniciar sesión**.
4. Espera a que cargue el **Panel principal**.

**Di:**
> "Entramos con una cuenta de demostración. La sesión se mantiene con una cookie HttpOnly y cada acción que modifica datos envía un token CSRF, para proteger el flujo."

---

### 0:50 – 1:25 · Enviar un correo a análisis

**Archivo a usar (sintético):**
`correobajolupa-api/test/fixtures/emails/C1-combinado-reglas-1-2-5.eml`
Cópialo antes a un lugar visible del escritorio, por ejemplo `becas-institucionales.eml`.

**Acciones:**
1. Click en **Analizar correo** en el sidebar.
2. Muestra las dos opciones: **Subir archivo .eml** y **Pegar mensaje original**.
3. En la pestaña **Subir archivo .eml**, click en **Explorar archivos** y selecciona el `.eml`.
4. Espera a que aparezca la fila del archivo con el check de "archivo listo".
5. Click en **Analizar correo ↗**.
6. El front navega al detalle del reporte nuevo con estado **En cola**; espera a que pase a **Completado** (el polling actualiza solo).

**Di:**
> "Vamos a subir el mensaje original, un archivo `.eml` sintético. También podríamos pegar el texto, pero el archivo conserva los encabezados y da más evidencia. El análisis es asíncrono: al enviar queda en cola y esta pantalla se actualiza sola cuando termina. En ningún momento visitamos los enlaces del correo."

**Consejo:** la espera suele ser de pocos segundos; si se alarga, acelera ese tramo en la edición. Sigue usando **este reporte recién creado** para los bloques de hallazgos, informe e incidente, para que el video tenga continuidad.

---

### 1:25 – 2:10 · Hallazgos y visor seguro

**Acciones:**
1. En el detalle, muestra la pestaña **Hallazgos** con una regla (R2 o R3) y su evidencia.
2. Click en **Enlaces**: muestra el destino en formato `hxxps://dominio[.]test`.
3. Click en **Texto**: muestra el cuerpo como texto plano.
4. Click en **HTML saneado**: muestra el iframe con el correo.

**Di:**
> "Cada hallazgo explica la regla, qué significa y la evidencia que la originó. Los enlaces siempre se entregan desactivados, así que no se pueden abrir. El HTML del correo se sanea en la API y se muestra dentro de un iframe sin permisos: no puede ejecutar scripts ni acceder a la página."

---

### 2:10 – 2:50 · Informe y guía

**Acciones:**
1. Click en **Ver informe ↗** (arriba del detalle).
2. Recorre con el cursor: resumen, **Cómo protegerte**, indicadores y notas.

**Di:**
> "El informe reúne el resumen, las acciones recomendadas y los indicadores observados. El lenguaje es deliberadamente prudente: ninguna regla prueba phishing por sí sola, y un correo sin hallazgos no significa que sea seguro."

---

### 2:50 – 3:35 · Correlación y respuesta

**Acciones:**
1. Sidebar → **Indicadores**. Muestra un dominio confirmado y su enlace **Ver candidatos ↗**.
2. Click en **Ver candidatos**: muestra 1 mensaje con sus razones.
3. Sidebar → **Incidentes** → abre uno.
4. Muestra el selector de estado y la pestaña **Cuarentena** (si el back ya tiene M7, selecciona un mensaje y ejecuta la acción).

**Di:**
> "Los indicadores confirmados nos dan candidatos, no campañas confirmadas: cada mensaje muestra la razón de la coincidencia. Agrupamos todo en un incidente, y desde ahí se aprueba la cuarentena mensaje por mensaje. La acción es reversible."

---

### 3:35 – 4:00 · Cierre (versión API real)

**Acciones:**
1. Desde el incidente, vuelve al **Panel principal**.
2. Deja el título final en pantalla 3 segundos.

**Di:**
> "Con esto cerramos: análisis explicable, contenido aislado y correlación de indicadores en un incidente. La cuarentena y la auditoría quedan como siguiente etapa del proyecto. Gracias."

**Texto en pantalla:** `CorreoBajoLupa · Proyecto académico de Seguridad Informática`

> Si M7 ya está integrado, recupera el bloque original: Sidebar → **Auditoría**, muestra los
> eventos y di: *"Todas las acciones quedan registradas, sin asuntos ni direcciones completas"*.

---

## 3. Si necesitas exactamente 3 minutos

Recorta, en este orden:
1. Quita el recorrido por **Texto** y **HTML saneado** (20 s).
2. Acelera la espera del análisis a 2× (15 s).
3. Acorta el informe al resumen y "Cómo protegerte" (20 s).

## 4. Si tienes 5 minutos

Añade 30 s al final mostrando:
- La **pestaña Adjuntos** del detalle con el `scanStatus` (detectado / sin detectar).
- La **pestaña Acciones** del incidente y el botón **Restaurar**.

## 5. Edición

- Corta los silencios y las esperas; no dejes cargas de más de 2 s.
- Subtítulos en español, fuente legible, contraste alto.
- Títulos de sección con el nombre de la vista.
- Sin música o muy baja: que no tape la voz.
- Exporta en H.264, 1080p, 30 fps.

## 6. Errores comunes

| Error | Cómo evitarlo |
|---|---|
| Mostrar correos reales | Usa solo `.invalid` y dominios de ejemplo |
| Ver el mock respondiendo | Oculta la terminal; graba solo el navegador |
| Enlaces clicables en pantalla | Verifica que se vean `hxxp` y `[.]` |
| Prometer M7 si no está | Di "en preparación" o espera al merge |
| Texto demasiado pequeño | Zoom 110–125 % y subtítulos grandes |
