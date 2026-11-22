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

## Fase 2: cuentas, ingresos y transferencias

### Alcance

- Cuentas de tipo efectivo, cuenta bancaria y tarjeta de crédito. Cada una tiene una o dos monedas.
- Movimientos de tipo gasto, ingreso, transferencia y saldo inicial.
- Saldo de cada cuenta por moneda. En tarjetas: deuda del ciclo, deuda total, línea disponible y fechas de corte y pago.
- Pantalla "Cuentas": lista con saldos, detalle con movimientos, y crear, editar o archivar.
- El inicio no cambia: solo muestra los gastos del día. Un resumen de saldos puede ir más adelante en otra pestaña.
- No se reconstruye el historial: cada cuenta arranca con su saldo inicial del día en que se crea.

### Cuentas del usuario (las crea él desde la app)

| Cuenta | Tipo | Monedas |
|---|---|---|
| Efectivo | Efectivo | PEN |
| BCP | Cuenta bancaria | PEN y USD (pueden ser una cuenta bimoneda o dos cuentas) |
| Interbank | Cuenta bancaria | PEN |
| 3 tarjetas | Tarjeta de crédito | PEN y USD |
| 1 tarjeta | Tarjeta de crédito | PEN |

- La cuenta "Efectivo PEN" pasa a llamarse "Efectivo". "Efectivo USD" se elimina porque no tiene movimientos.
- La línea de crédito de las tarjetas está en soles. La línea disponible es la línea menos la deuda en PEN, menos la deuda en USD convertida con el tipo de cambio de referencia definido en Ajustes.

### Categorías

- Gasto: Comida, Combustible, Pago de servicios, Suscripciones, Comisión de billetera.
- Ingreso: Sueldo, Freelance, Devoluciones, Otros.

### Comisión de billetera

El ciclo es: Ahorros → pago de la tarjeta → recarga desde la tarjeta a una billetera → transferencia de la billetera a Ahorros. La billetera no se registra como cuenta.

- Se registra como transferencia Tarjeta → Ahorros, con un campo opcional "Comisión".
- Si sale X de la tarjeta y la comisión es C, se guardan: una salida de la tarjeta por X − C, una entrada a Ahorros por X − C y un gasto de C en la tarjeta con la categoría "Comisión de billetera". El total que sale de la tarjeta es X.
- Las transferencias no cuentan como gasto, así que el reporte de esa categoría da exactamente lo que costaron las billeteras.

### Formulario de movimiento

1. Tipo: Gasto / Ingreso / Transferencia.
2. Cuenta (por defecto la última usada). En transferencias: cuenta origen y cuenta destino.
3. Moneda, solo si la cuenta es bimoneda (por defecto PEN).
4. Monto. En transferencias entre monedas distintas, también el monto que llega; el tipo de cambio se calcula.
5. Categoría, solo en gastos e ingresos.
6. Comisión (opcional), solo en transferencias.
7. Descripción (opcional).
8. Fecha y hora.

### Modelo de datos

- `amount_cents` pasa a guardarse con signo: positivo cuando el dinero entra a la cuenta y negativo cuando sale. El saldo de una cuenta en una moneda es `SUM(amount_cents)`. En pantalla se muestra sin signo. Los gastos existentes se convierten a negativos.
- Una transferencia son dos movimientos (`transfer_out` y `transfer_in`) enlazados por `transfer_id`. La comisión es un `expense` con el mismo `transfer_id`, así se edita y se borra junto con la transferencia.

```
account_kind (enum): cash | bank | credit_card
category_kind (enum): expense | income

financial_accounts
  + kind          account_kind NOT NULL
  + currencies    currency[] NOT NULL (1 o 2)
  + institution   text NULL
  + archived_at   timestamptz NULL
  + updated_at    timestamptz NOT NULL
  - currency

credit_card_details
  account_id          uuid PK FK -> financial_accounts.id
  credit_limit_cents  bigint NOT NULL (> 0, en PEN)
  statement_day       smallint NOT NULL (1-31)
  payment_due_day     smallint NOT NULL (1-31)

transfers
  id             uuid PK
  user_id        text FK -> user.id
  exchange_rate  numeric(12,6) NULL
  created_at     timestamptz NOT NULL

transactions
  type            expense | income | transfer_out | transfer_in | opening_balance
  amount_cents    con signo según el tipo
  category_id     obligatoria solo en expense e income
  + transfer_id   uuid NULL FK -> transfers.id (obligatoria en transfer_out y transfer_in)
  + INDEX (financial_account_id, occurred_at)

categories
  + kind  category_kind NOT NULL

user_settings
  user_id                  text PK FK -> user.id
  usd_pen_reference_rate   numeric(10,4) NULL
  updated_at               timestamptz NOT NULL
```

### Migración

Se hace en tres pasos para no perder datos:

1. `0001`: agregar enums, tablas y columnas nuevas.
2. `0002` (SQL propio): pasar los datos existentes (tipo y monedas de las cuentas, renombrar "Efectivo", eliminar "Efectivo USD", gastos a negativo, categorías de ingreso, `user_settings`).
3. `0003`: quitar `financial_accounts.currency`, volver obligatorias las columnas nuevas y agregar las restricciones de signo, categoría y transferencia.

La base de datos es compartida entre desarrollo y producción. La migración rompe el código de la fase 1, así que se aplica justo antes de desplegar el código de la fase 2.

### Estado de la fase 2

Código escrito el 2026-11-21, sin probar:
- Rutas: `/movements/new` y `/movements/[id]` (reemplazan a `/expenses/*`), `/accounts`, `/accounts/new`, `/accounts/[id]` y `/accounts/[id]/edit`. Ajustes incluye el tipo de cambio de referencia.
- El script `npm run user:create` ya crea las categorías de ingreso, la cuenta "Efectivo" (PEN) y `user_settings`.

Orden para salir a producción:
1. Revisar tipos (`npm run check`).
2. Aplicar las migraciones 0001 a 0003 (`npm run db:migrate`). Desde ese momento, producción con el código de la fase 1 deja de funcionar.
3. Probar en local.
4. Commit y push a `main`.
