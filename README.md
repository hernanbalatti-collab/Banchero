# Expreso Banchero · Gestión de Cargas

Aplicación web de Expreso Banchero: fletes, encomiendas entre
depósitos (Chivilcoy ⇄ CABA), flota, choferes, clientes, facturación y reportes.
Los clientes siguen sus envíos en una página pública, sin cuenta, o ingresan a su portal
con usuario propio.

**Stack:** Next.js 16 (App Router, server actions) · Prisma 7 + SQLite/libSQL (Turso en
producción) · Tailwind 4 · zod.

## Puesta en marcha

```bash
npm install
cp .env.example .env          # completar SESSION_SECRET (el comando para generarlo está en el archivo)
npx prisma migrate dev        # crea la base (incluye los depósitos Chivilcoy y CABA)
npm run db:seed               # datos de ejemplo
npm run dev                   # http://localhost:3000
```

Usuarios del seed:

| Rol           | Email                   | Contraseña     |
| ------------- | ----------------------- | -------------- |
| Administrador | `admin@cargas.local`    | `admin1234`    |
| Operador      | `operador@cargas.local` | `operador1234` |
| Chofer        | `chofer@cargas.local`   | `chofer1234`   |
| Cliente       | `cliente@cargas.local`  | `cliente1234`  |

## Módulos

- **Panel**: indicadores, viajes activos, encomiendas por depósito y vencimientos (VTV,
  seguro, licencias, LiNTI) de los próximos 30 días.
- **Viajes**: dos tipos.
  - *Flete*: para un cliente, con tarifa propia; se factura.
  - *Entre depósitos*: lleva encomiendas de varios clientes; el ingreso son las encomiendas.
  - Estados: Pendiente → Asignado (automático al tener chofer y vehículo) → En tránsito →
    Entregado / Cancelado. Historial de novedades con ubicación, gastos y margen por viaje.
    Al salir y al llegar se actualiza el estado de las unidades.
- **Envíos**: se registran al recibirlos en un depósito y generan un código de seguimiento
  (ej. `K7PM-X3QA`) con comprobante imprimible. Se cargan en un viaje entre depósitos y
  acompañan al viaje: salen con él, quedan en el depósito de destino cuando llega, y desde
  ahí se marcan en reparto (si son a domicilio) y entregados (con quién recibió).
- **Depósitos**: qué paquetes hay en cada depósito (por despachar y para entregar o
  retirar), cuántos días llevan, cuáles están en reparto y con quién. Se imprime como
  planilla para el control físico del stock.
- **Entregas**: al salir a reparto se asigna el chofer, que ve sus repartos en «Mis viajes»
  y registra la entrega desde el celular. Cada entrega guarda fecha y hora, quién entregó,
  quién recibió (nombre y DNI) y quién la registró. El **Registro de entregas** filtra por
  período y depósito y se exporta a Excel (CSV).
- **Seguimiento público** (`/seguimiento`): el cliente ingresa el código y ve en qué etapa
  está su paquete. No muestra precios, notas internas ni el apellido del destinatario.
- **Clientes, Vehículos, Choferes**: altas y ediciones con validación de CUIT, patente y DNI.
- **Facturación**: agrupa fletes entregados de un cliente (A/B con IVA 21 %, C sin IVA),
  cobro y anulación (que libera los viajes). Es un comprobante interno: la factura
  electrónica ante ARCA no está integrada.
- **Reportes**: ingresos, gastos y margen por mes, cliente, vehículo y chofer.
- **Portal de clientes** (`/portal`): cada cliente ingresa con su usuario y ve solo sus
  envíos (estado, recorrido, comprobante y quién recibió), sus fletes (estado, ubicaciones y
  tarifa) y sus facturas. No ve gastos, márgenes, notas internas, choferes ni datos de otros
  clientes. Los usuarios se crean desde la ficha del cliente o desde Usuarios.
- **Usuarios** (solo administrador): roles Administrador, Operador, Chofer y Cliente. El chofer
  solo ve sus viajes y puede iniciarlos, entregarlos, registrar novedades y cargar gastos. El
  usuario Cliente se vincula a un cliente (puede haber varios por cliente).

## Publicar en Vercel + Turso

La app usa el adaptador libSQL de Prisma: en desarrollo apunta al archivo
`prisma/dev.db` y en producción a una base de [Turso](https://turso.tech).

1. **Base en Turso.** Con la CLI de Turso (en Windows se instala en WSL, o usá el panel web):
   ```bash
   turso db create banchero
   turso db show banchero --url        # → libsql://banchero-<usuario>.turso.io
   turso db tokens create banchero     # → token de acceso
   ```
2. **Migraciones y primer administrador**, desde tu máquina (PowerShell):
   ```powershell
   $env:DATABASE_URL="libsql://banchero-<usuario>.turso.io"
   $env:DATABASE_AUTH_TOKEN="<token>"
   npm run db:migrar-remoto                                  # crea tablas y depósitos
   npm run crear-admin -- tu@email.com "Tu Nombre"            # muestra la contraseña generada
   ```
   `db:migrar-remoto` se vuelve a correr cada vez que haya migraciones nuevas. **No corras
   `db:seed` contra Turso**: borra todos los datos (el script lo impide).
3. **Proyecto en Vercel.** En vercel.com → *Add New → Project*, importá el repositorio de
   GitHub y cargá las variables de entorno `DATABASE_URL`, `DATABASE_AUTH_TOKEN` y
   `SESSION_SECRET` (una nueva, distinta de la local). Deploy. Cada push a la rama
   principal se publica solo.

> El plan gratuito de Vercel (Hobby) es para uso no comercial. Para uso diario de la
> empresa corresponde el plan Pro u otro proveedor.

## Estructura

```
prisma/            schema, migraciones y seed
src/actions/       server actions (validan con zod y verifican permisos)
src/app/(app)/     pantallas con sesión (portal/ = portal de clientes)
src/app/seguimiento/  seguimiento público
src/app/login/
src/lib/           acceso a datos (dal.ts), sesión, reglas de viajes y envíos, formatos
src/components/    UI compartida (formularios, tablas, gráfico)
src/proxy.ts       redirige a /login si no hay sesión (chequeo optimista)
scripts/probar-rutas.mjs  recorre todas las páginas con cada rol (con el servidor corriendo)
scripts/migrar-remoto.mjs aplica las migraciones en Turso
scripts/crear-admin.mts   crea un administrador (primer ingreso en producción)
```

La autorización real se hace en `src/lib/dal.ts` (`requerirUsuario`), que cada página y
cada acción llaman antes de leer o modificar datos.

## Marca

Las imágenes de `public/marca/` y los íconos de `src/app/` (`favicon.ico`, `icon.png`,
`apple-icon.png`) vienen de expresobanchero.com. El logo se reconstruyó con colores sólidos
a partir del encabezado del sitio. Paleta y tipografías (Montserrat / Open Sans) en
`src/app/globals.css`.

## Comandos útiles

- `npm run db:migrate`: aplica cambios del schema
- `npm run db:reset`: borra la base, reaplica migraciones y corre el seed
- `npm run db:studio`: explorador de la base
- `node scripts/probar-rutas.mjs http://localhost:3000`: verificación rápida de páginas y permisos

## Pendientes sugeridos

- Factura electrónica (ARCA) y facturación de encomiendas en cuenta corriente.
- Aviso al destinatario por email o WhatsApp en cada cambio de estado del envío.
- Dirección y teléfono de los depósitos (se muestran en el seguimiento para retirar).
