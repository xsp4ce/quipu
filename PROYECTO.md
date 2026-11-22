# Quipu

App personal de finanzas, totalmente customizada, de uso desde el celular (iPhone).

El nombre viene del quipu, el sistema de cuerdas y nudos que usaban los incas para llevar cuentas.

## Contexto

- Usuario único: solo yo.
- Monedas: soles (PEN) y dólares (USD).
- Carga de datos: manual.
- Alcance: gastos, ingresos, cuentas bancarias, tarjetas de crédito, presupuestos, deudas, préstamos y ahorro.

## Tipo de app

**PWA (Progressive Web App)**, instalable en la pantalla de inicio del iPhone.

Opciones descartadas:

- App nativa iOS (SwiftUI + SwiftData): requiere la cuenta de Apple Developer (US$99 al año) o reinstalar cada 7 días, además de aprender Swift.
- Google Sheets / AppSheet: poco personalizable e incómodo en el celular.
- Bot de Telegram/WhatsApp: malo para ver reportes (puede evaluarse más adelante como complemento para registrar rápido).

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Framework (frontend + backend) | SvelteKit con `adapter-node` |
| Estilos | Tailwind CSS |
| ORM y migraciones | Drizzle ORM |
| Base de datos | PostgreSQL en Railway (instancia ya existente) |
| Autenticación | Better Auth |
| Deploy | Railway (mismo proyecto que la BD, conexión por red privada) |
| Gráficos (fases 6 y 7) | LayerChart u otra librería similar |
| IA (fases 5 y 8) | API de Claude, con el SDK oficial de TypeScript |

Decisiones:

- El navegador no puede conectarse directo a Postgres, así que SvelteKit funciona como backend.
- Sin modo offline al inicio: sincronizar datos locales (IndexedDB/Dexie) con un backend propio es complejo. Se puede reevaluar más adelante.
- Python no hace falta, salvo que en el futuro se quieran entrenar modelos propios de machine learning.

## Autenticación

- Better Auth, usando el Postgres de Railway.
- Passkeys como método principal, con verificación obligatoria (`userVerification: 'required'`): el dispositivo o el gestor (iCloud, 1Password) siempre pide Face ID o el código. Se crean, listan y eliminan desde Ajustes.
- Contraseña como respaldo.
- 2FA (TOTP): queda para una fase posterior.
- Registro deshabilitado en la fase 1; el usuario inicial se crea con un script.
- Sesión en cookie `httpOnly` de larga duración.
- Futuro multiusuario (amigos): registro solo por invitación, con Better Auth. No hace falta migrar a Clerk ni a Auth0.

### Comparación con alternativas

| | Better Auth | Clerk | Auth0 |
|---|---|---|---|
| Tipo | Librería en tu propio backend | Servicio externo | Servicio externo |
| Dónde quedan los datos | Postgres propio | Servidores de Clerk | Servidores de Auth0 |
| Costo | Gratis | Plan gratuito amplio | Plan gratuito limitado |
| Soporte para SvelteKit | Oficial | SDK de la comunidad | SDK genérico |
| Dependencia del proveedor | Ninguna | Alta | Alta |

Se eligió Better Auth porque los datos quedan en la BD propia y no hay dependencia de terceros. Además, las ventajas de Clerk y Auth0 (gestionar miles de usuarios, SSO) no aplican a este proyecto.

## Reglas de diseño

- Los montos nunca se guardan como decimales (`float`). Se guardan como enteros en céntimos (S/ 12.50 se guarda como `1250`), siempre junto a su moneda (`PEN` o `USD`).
- Las transferencias entre monedas guardan el tipo de cambio usado.
- El resumen consolida en una moneda base, con un tipo de cambio ingresado manualmente.
- Cada movimiento pertenece a una cuenta desde la fase 1 (por ejemplo "Efectivo PEN" y "Efectivo USD"), para no tener que migrar datos en la fase 2.
- Las categorías existen desde la fase 1, para que los reportes de la fase 6 tengan historia.

## Fases de desarrollo

1. **Gastos manuales:** registrar gastos con monto, moneda, categoría, fecha y cuenta.
2. **Cuentas:** cuentas bancarias y tarjetas de crédito (fecha de corte, fecha de pago, deuda del ciclo).
3. **Deudas con bancos:** créditos y préstamos personales.
4. **Préstamos a terceros:** dinero prestado a amigos u otras personas.
5. **Estados de cuenta:** cargar estados de cuenta y compararlos con lo registrado para detectar ajustes. Los bancos peruanos suelen entregarlos en PDF, así que conviene adelantar aquí la IA para extraer los movimientos.
6. **Reportes por categoría:** con categorías propias, para saber en qué se va el dinero.
7. **Proyección:** proyección real de gastos e ingresos, ajustes posibles y estrategia para pagar más las deudas.
8. **IA:** potenciar todo lo anterior con categorización automática de gastos, extracción de estados de cuenta y recomendaciones sobre la proyección.

## Multiusuario

El modelo queda preparado para varios usuarios desde la fase 1, pero el registro y las invitaciones no se construyen todavía.

- Todas las tablas propias tienen `user_id`.
- Todas las consultas filtran por el usuario de la sesión, sin excepción. Como capa extra se puede activar Row Level Security en Postgres.
- Al crear un usuario se le copian las categorías iniciales y se le crean sus cuentas de efectivo.
- A tener en cuenta a futuro: la Ley 29733 de Protección de Datos Personales (Perú), respaldos, el costo por usuario de Railway y la IA, y los formatos de estados de cuenta de otros bancos.

## Fase 1: alcance

La fase 1 está terminada cuando se puede, desde el celular:

1. Abrir la app (PWA instalada en el iPhone).
2. Iniciar sesión con passkey (Face ID) o contraseña.
3. Registrar, editar y eliminar gastos.
4. Ver los gastos del día y navegar entre días.

### Pantallas

**Login**
- Passkey o contraseña.

**Inicio**
- Fecha del día seleccionado, con flechas ← → para pasar de un día a otro. Al abrir la app se muestra el día actual.
- Total del día en PEN y en USD, por separado.
- Lista de los gastos de ese día, ordenados por hora.
- Al tocar un gasto se abre para editarlo o eliminarlo.
- Botón "+ Registrar", que lleva al formulario.

**Formulario de gasto** (sirve para crear y para editar)
1. Moneda: PEN o USD (por defecto PEN).
2. Monto.
3. Categoría.
4. Descripción (opcional).
5. Fecha y hora: por defecto "ahora", editable.

Al editar, el formulario incluye la opción Eliminar, con confirmación.

### Categorías iniciales

1. Comida
2. Combustible
3. Pago de servicios
4. Suscripciones
5. Comisión de billetera

### Modelo de datos

Tablas de Better Auth (las genera la librería): `user`, `session`, `account`, `verification`, `passkey`.

Better Auth ya usa el nombre `account`, por eso las cuentas de dinero se llaman `financial_accounts`.

```
currency (enum): PEN | USD

categories
  id            uuid PK
  user_id       text FK -> user.id NOT NULL
  name          text NOT NULL
  sort_order    int NOT NULL
  created_at    timestamptz NOT NULL
  UNIQUE (user_id, name)

financial_accounts
  id            uuid PK
  user_id       text FK -> user.id NOT NULL
  name          text NOT NULL
  currency      currency NOT NULL
  created_at    timestamptz NOT NULL

transactions
  id                    uuid PK
  user_id               text FK -> user.id NOT NULL
  type                  text NOT NULL CHECK (type IN ('expense'))
  amount_cents          bigint NOT NULL CHECK (amount_cents > 0)
  currency              currency NOT NULL
  category_id           uuid FK -> categories.id NOT NULL
  financial_account_id  uuid FK -> financial_accounts.id NOT NULL
  description           text NULL
  occurred_at           timestamptz NOT NULL
  created_at            timestamptz NOT NULL
  updated_at            timestamptz NOT NULL
  INDEX (user_id, occurred_at)
```

Datos iniciales por usuario:
- Las 5 categorías iniciales.
- Las cuentas "Efectivo PEN" y "Efectivo USD".

### Reglas de la fase 1

- En el formulario no se elige cuenta: se asigna sola según la moneda ("Efectivo PEN" o "Efectivo USD"). El selector de cuenta aparece en la fase 2.
- La tabla se llama `transactions` y tiene una columna `type` para que los ingresos y las transferencias de las fases siguientes entren en la misma tabla.
- Los días y los totales se calculan en hora de Lima (`America/Lima`).
- Las categorías van en una tabla y no fijas en el código, para poder agregar más sin cambiar la estructura.
- Eliminar un gasto lo borra definitivamente (`DELETE`), previa confirmación en la interfaz.

## Configuración

- Credenciales en `quipu/.env` (no se versiona).
- `DATABASE_URL`: para migraciones desde la máquina local se usa la URL pública de Railway (`DATABASE_PUBLIC_URL`). En producción, dentro de Railway, se usa la URL privada.

## Próximo paso

**Fase 1 completa (2026-11-21).** Probada desde Safari en el iPhone, en la red local: login con contraseña y registro de gastos funcionando.

Hecho:
- Estructura del proyecto y migración `0000_phase1_initial` aplicada en Railway.
- Better Auth configurado y usuario inicial creado con `npm run user:create`.
- Pantallas de login, inicio, formulario (crear, editar, eliminar) y ajustes.

Pendiente, fuera del alcance de la fase 1:
1. ~~Configuración de la PWA (manifest e íconos) para instalarla en la pantalla de inicio.~~
2. Deploy en Railway. Las passkeys solo funcionan con HTTPS y un dominio, así que Face ID se prueba después del deploy.

Deploy:
- Repositorio privado en GitHub. Railway despliega automáticamente con cada push a `main`.
- Servicio en el mismo proyecto de Railway que el Postgres.
- Variables del servicio: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y `ORIGIN` (ambas con la URL pública `https://...`).
- Build: `npm run build`. Start: `npm start` (`node build`).
- Por ahora, producción y desarrollo comparten la misma base de datos.

Desarrollo local desde el celular:
- WSL está en modo NAT, así que el puerto 5173 se redirige con `netsh interface portproxy` hacia la IP de WSL. Esa IP cambia al reiniciar WSL.
- `BETTER_AUTH_URL=http://<IP de la PC>:5173` y `npm run dev -- --host`.

Siguiente: fase 2 (cuentas bancarias y tarjetas de crédito).
