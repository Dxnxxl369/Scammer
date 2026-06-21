# HowWirelessMovile.md — Correr Flutter por Wi-Fi contra el backend en `localhost:8001`

Guía paso a paso para correr la app **Flutter** en el teléfono físico (TECNO POP 7 Pro)
por **Wireless Debugging**, haciendo que la app consuma el **backend Django en tu PC (puerto 8001)**
mediante `adb reverse`. Cada paso indica **lo que DEBE aparecer** (✅) y **qué ves si algo falla** (❌).

> **Rutas de este proyecto** (cámbialas si usas otro, p.ej. Scammer → `mobile/`):
> - Backend: `C:\Users\Usuario\Desktop\water1\backend`
> - App Flutter: `C:\Users\Usuario\Desktop\water1\flutter`
> - adb: `C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe`

---

## Concepto clave (para no confundirse con los puertos)

| Puerto | Qué es | ¿Lo configuras tú? |
|---|---|---|
| **8001** | Tu **backend** (API Django). La app lo alcanza vía `adb reverse`. | **Sí** |
| **56476** (o cualquiera) | **Dart VM Service / DevTools** de Flutter (hot reload, debug). Es **aleatorio cada `flutter run`**. | **No, ignóralo** |

El puerto raro que sale en `flutter run` (`http://127.0.0.1:XXXXX/...`) **NO es tu app ni el 8001** — es el canal de depuración de Flutter. Es normal que cambie.

---

## Requisitos previos (una sola vez)
- Teléfono y PC en la **misma red Wi-Fi**.
- En el teléfono: **Ajustes → Opciones de desarrollador → Wireless debugging = ON**.
- El primer emparejamiento ya está hecho (aparece `Usuario@WIN11HOME22H2-2` en *Paired devices*).

---

## Paso 0 — Definir adb (en PowerShell)
```powershell
$adb = "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe"
```
✅ **Debe aparecer:** nada (solo guarda la variable).
❌ Si luego `& $adb` da *"no se reconoce"*: la ruta está mal o no tienes platform-tools instalado.

---

## Paso 1 — (Solo si NO está emparejado) Emparejar
En el teléfono: *Wireless debugging → Pair device with pairing code*. Te da una **IP:PUERTO** y un **código de 6 dígitos**.
```powershell
& $adb pair 192.168.199.254:<PUERTO_PAIR> <CODIGO_6_DIGITOS>
```
✅ **Debe aparecer:** `Successfully paired to 192.168.199.254:XXXXX [guid=adb-...]`
❌ `Failed: (UNAUTHORIZED)` o timeout → código/puerto incorrectos, o la ventana del código se cerró (vuelve a abrirla).

> Si tu PC ya está en *Paired devices*, **salta este paso**.

---

## Paso 2 — Conectar al teléfono
En el teléfono mira **"IP address & Port"** (ej. `192.168.199.254:45765`). ⚠️ **Este puerto cambia** cada vez que reinicias Wireless Debugging o el teléfono.
```powershell
& $adb connect 192.168.199.254:45765
```
✅ **Debe aparecer:** `connected to 192.168.199.254:45765`
❌ `failed to connect to '192.168.199.254:45765'` → el puerto cambió (míralo de nuevo en la pantalla) o no están en la misma Wi-Fi.
ℹ️ `already connected to ...` → también está bien.

---

## Paso 3 — Verificar que el dispositivo está listo
```powershell
& $adb devices -l
```
✅ **Debe aparecer:**
```
List of devices attached
192.168.199.254:45765   device product:BF7-GL model:TECNO_BF7 device:TECNO-BF7 transport_id:1
```
La palabra clave es **`device`**.
❌ `unauthorized` → acepta el diálogo *"¿Permitir depuración USB?"* en el teléfono.
❌ `offline` → repite el Paso 2 (`adb disconnect` y vuelve a conectar).

---

## Paso 4 — Reenviar el puerto 8001 (reverse)
Hace que **`localhost:8001` del teléfono** salga hacia **`localhost:8001` de tu PC**.
```powershell
& $adb reverse tcp:8001 tcp:8001
& $adb reverse --list
```
✅ **Debe aparecer** (del `--list`):
```
host-XX tcp:8001 tcp:8001
```
El comando `reverse tcp:8001 tcp:8001` por sí solo **no imprime nada** = éxito.
❌ `error: no devices/emulators found` → no estás conectado (vuelve al Paso 2).
ℹ️ El reverse **se borra** si el teléfono se desconecta; hay que reponerlo.

---

## Paso 5 — Configurar la URL del API en la app (una vez)
Edita `flutter\.env`:
```
API_URL=http://localhost:8001/api
```
✅ **Debe quedar** apuntando a `localhost:8001` (no a una IP ni a Render).
⚠️ `.env` se empaqueta como **asset**: si lo cambias, hay que **volver a correr** `flutter run` (no basta hot reload).

---

## Paso 6 — Levantar el backend en el puerto 8001 (Terminal #1)
```powershell
cd C:\Users\Usuario\Desktop\water1\backend
.\venv\Scripts\python.exe manage.py runserver 8001
```
✅ **Debe aparecer:**
```
Watching for file changes with StatReloader
...
Starting development server at http://127.0.0.1:8001/
Quit the server with CTRL-BREAK.
```
**Deja esta terminal abierta.**
❌ `Error: That port is already in use.` → algo ocupa el 8001 (mátalo o usa otro puerto, pero entonces ajusta el reverse y el `.env`).
❌ Errores de conexión a la BD → revisa `backend\.env` (DB_*).

---

## Paso 7 — Correr la app Flutter (Terminal #2, NUEVA)
```powershell
cd C:\Users\Usuario\Desktop\water1\flutter
flutter run -d 192.168.199.254:45765
```
✅ **Debe aparecer** (tras compilar e instalar):
```
Launching lib\main.dart on TECNO BF7 in debug mode...
Running Gradle task 'assembleDebug'...
✓ Built build\app\outputs\flutter-apk\app-debug.apk
Installing build\app\outputs\...apk...
A Dart VM Service on TECNO BF7 is available at: http://127.0.0.1:XXXXX/....
Flutter run key commands.
r Hot reload. 🔥🔥🔥
R Hot restart.
q Quit.
```
El `http://127.0.0.1:XXXXX` (puerto **aleatorio**, ej. 56476) es el **debug de Flutter**, NO tu backend. Es normal.
❌ `No supported devices connected` → el teléfono se desconectó (Paso 2/3).
❌ `Gradle ... failed` → problema de build de Android (no de la red).

---

## Paso 8 — Verificar que la app SÍ llega al backend
Cuando la app haga peticiones (login, listar proyectos…), **en la Terminal #1 (backend)** deben aparecer líneas como:
```
[fecha] "POST /api/auth/login HTTP/1.1" 200 1234
[fecha] "GET /api/projects/ HTTP/1.1" 200 5678
```
✅ Si ves esos logs → **el teléfono está llegando al backend** por el reverse. 🎉
❌ Si en la app sale *"error de red / connection refused"* y el backend NO registra nada:
  1. ¿Hiciste el `adb reverse tcp:8001 tcp:8001`? (Paso 4 — se borra al desconectar)
  2. ¿El backend está corriendo en **8001**? (Paso 6)
  3. ¿`flutter\.env` dice `http://localhost:8001/api`? ¿Reiniciaste `flutter run` tras cambiarlo? (Paso 5)

---

## Resumen rápido (orden de comandos)
```powershell
$adb = "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb connect 192.168.199.254:45765          # -> connected to ...
& $adb devices -l                            # -> ... device model:TECNO_BF7
& $adb reverse tcp:8001 tcp:8001             # (sin salida)
& $adb reverse --list                        # -> host-XX tcp:8001 tcp:8001

# Terminal #1 (backend):
cd C:\Users\Usuario\Desktop\water1\backend
.\venv\Scripts\python.exe manage.py runserver 8001   # -> Starting development server at http://127.0.0.1:8001/

# Terminal #2 (app):
cd C:\Users\Usuario\Desktop\water1\flutter
flutter run -d 192.168.199.254:45765            # -> Dart VM Service ... + Flutter run key commands
```

---

## Comandos útiles extra
| Comando | Para qué | Resultado esperado |
|---|---|---|
| `& $adb disconnect` | Soltar todas las conexiones Wi-Fi | `disconnected everything` |
| `& $adb reverse --remove-all` | Borrar todos los reverse | (sin salida) |
| `& $adb shell ip route` | Ver la IP del teléfono | línea con `192.168.199.254` |
| `flutter devices` | Confirmar que Flutter ve el teléfono | `TECNO BF7 (mobile) • 192.168.199.254:45765 • android-arm64` |
| Tecla `r` en `flutter run` | Hot reload | `Reloaded ... in NNNms` |
| Tecla `q` en `flutter run` | Cerrar la app | termina `flutter run` |

> **Cada vez que reinicias el teléfono o Wireless Debugging:** el puerto de *"IP address & Port"* cambia → repite **Paso 2** (connect) y **Paso 4** (reverse). El emparejamiento NO se repite.
