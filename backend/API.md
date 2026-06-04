# API Reference

Base URL: `http://localhost:8000/api`

## Health

`GET /health/` — Público
```json
{ "backend": "ok", "mongodb": "ok", "supabase": "ok" }
```

## Auth (requieren JWT Supabase: `Authorization: Bearer <token>`)

`POST /auth/registro/` — Sincroniza usuario de Supabase a MongoDB
```json
{ "correo": "a@b.com", "nombre_usuario": "user1", "nombre_completo": "Juan", "pais": "BO" }
→ 201 { "exito": true, "datos": { ...usuario } }
→ 409 { "exito": false, "error": { "codigo": "CORREO_DUPLICADO", "mensaje": "..." } }
```

`GET /auth/yo/` — Perfil del usuario autenticado
```json
→ 200 { "exito": true, "datos": { ...usuario } }
→ 404 { "exito": false, "error": { "codigo": "NO_REGISTRADO" } }
```

`PATCH /auth/yo/` — Actualiza perfil (solo nombre_completo y pais)
```json
{ "nombre_completo": "Juan Pérez", "pais": "AR" }
→ 200 { "exito": true, "datos": { ...usuario }, "mensaje": "Perfil actualizado" }
```

## Sesiones Anónimas (públicos)

`POST /anonimos/sesion/` — Crea sesión anónima
```json
→ 201 { "exito": true, "datos": { "id_sesion": "uuid", "intentos_usados": 0, ... } }
```

`GET /anonimos/sesion/<id_sesion>/` — Obtiene sesión
```json
→ 200 { "exito": true, "datos": { ... } }
→ 404 { "exito": false, "error": { "codigo": "SESION_NO_ENCONTRADA" } }
```

`POST /anonimos/sesion/<id_sesion>/intento/` — Incrementa contador de intentos
```json
→ 200 { "exito": true, "datos": { "intentos_usados": 1, ... } }
```

## Admin (requieren JWT + rol administrador)

`GET /admin/usuarios/?rol=&plan=&bloqueado=&q=&pagina=&por_pagina=`
`PATCH /admin/usuarios/<id_supabase>/bloquear/`
`PATCH /admin/usuarios/<id_supabase>/desbloquear/`
`PATCH /admin/usuarios/<id_supabase>/plan/` — body: `{ "plan": "pro" }`
`PATCH /admin/usuarios/<id_supabase>/rol/` — body: `{ "rol": "administrador" }`
`GET /admin/estadisticas/`
