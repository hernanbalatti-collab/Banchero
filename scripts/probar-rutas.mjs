// Recorre las páginas con cada rol y verifica códigos de respuesta.
// Uso: con el servidor corriendo, `node scripts/probar-rutas.mjs [url-base]`
import "dotenv/config";
import { createClient } from "@libsql/client";
import { SignJWT } from "jose";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
const fila = async (sql, ...args) => (await db.execute({ sql, args })).rows[0];
const clave = new TextEncoder().encode(process.env.SESSION_SECRET);
const uno = async (sql) => (await fila(sql))?.id;

const tokens = {};
for (const u of (await db.execute("select id, rol from Usuario")).rows) {
  tokens[u.rol] = await new SignJWT({ userId: u.id, rol: u.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(clave);
}

const choferUsuario = (await fila("select choferId from Usuario where rol = 'CHOFER'")).choferId;
const clienteUsuario = (await fila("select clienteId from Usuario where rol = 'CLIENTE'")).clienteId;
const delCliente = async (tabla, propio, extra = "") =>
  (await fila(`select id from ${tabla} where clienteId ${propio ? "=" : "<>"} ? ${extra}`, clienteUsuario))?.id;
const ids = {
  viaje: await uno("select id from Viaje where estado = 'EN_TRANSITO' and clienteId is not null"),
  viajeLinea: await uno("select id from Viaje where depositoOrigenId is not null and estado = 'ASIGNADO'"),
  viajePropio: (await fila("select id from Viaje where choferId = ?", choferUsuario))?.id,
  viajeAjeno: (await fila("select id from Viaje where choferId <> ?", choferUsuario))?.id,
  factura: await uno("select id from Factura"),
  cliente: await uno("select id from Cliente"),
  vehiculo: await uno("select id from Vehiculo"),
  chofer: await uno("select id from Chofer"),
  usuario: await uno("select id from Usuario"),
  envio: await uno("select id from Envio where estado = 'EN_DESTINO'"),
  envioPropio: await delCliente("Envio", true),
  envioAjeno: await delCliente("Envio", false),
  fletePropio: await delCliente("Viaje", true),
  fleteAjeno: await delCliente("Viaje", false),
  facturaPropia: await delCliente("Factura", true, "and estado <> 'ANULADA'"),
  facturaAjena: await delCliente("Factura", false),
  pedido: await uno("select id from Pedido"),
  pedidoFlete: await uno("select id from Pedido where tipo = 'FLETE' and estado = 'PENDIENTE'"),
  pedidoEncomienda: await uno("select id from Pedido where tipo = 'ENCOMIENDA' and estado = 'PENDIENTE'"),
  pedidoPropio: await delCliente("Pedido", true),
  pedidoAjeno: await delCliente("Pedido", false),
};
const codigo = (await fila("select codigo from Envio where estado = 'EN_TRANSITO'")).codigo;

const privadas = [
  "/", "/viajes", "/viajes/nuevo", `/viajes/${ids.viaje}`, `/viajes/${ids.viaje}/editar`, `/viajes/${ids.viajeLinea}`,
  "/envios", "/envios?estado=TODOS&deposito=dep_caba", "/envios/nuevo", `/envios/${ids.envio}`,
  "/depositos", "/depositos?deposito=dep_caba", "/envios/entregas", "/envios/entregas/exportar",
  "/clientes", `/clientes/${ids.cliente}`, "/flota/vehiculos", `/flota/vehiculos/${ids.vehiculo}`,
  "/flota/choferes", `/flota/choferes/${ids.chofer}`, "/facturacion", "/facturacion/nueva", `/facturacion/${ids.factura}`,
  "/pedidos", "/pedidos?estado=TODOS", `/pedidos/${ids.pedido}`,
  `/viajes/nuevo?pedido=${ids.pedidoFlete}`, `/envios/nuevo?pedido=${ids.pedidoEncomienda}`,
  "/reportes", "/usuarios", `/usuarios/${ids.usuario}`, "/mis-viajes", `/viajes/${ids.viajePropio}`, `/viajes/${ids.viajeAjeno}`,
  "/portal", "/portal/envios", "/portal/envios?estado=TODOS", "/portal/fletes", "/portal/facturas",
  "/portal/pedidos", "/portal/pedidos/nuevo?tipo=FLETE", "/portal/pedidos/nuevo?tipo=ENCOMIENDA", `/portal/pedidos/${ids.pedidoPropio}`,
  `/portal/envios/${ids.envioPropio}`, `/portal/fletes/${ids.fletePropio}`, `/portal/facturas/${ids.facturaPropia}`,
  // Del portal, de otro cliente: tienen que dar 404
  `/portal/pedidos/${ids.pedidoAjeno}`, `/portal/envios/${ids.envioAjeno}`, `/portal/fletes/${ids.fleteAjeno}`, `/portal/facturas/${ids.facturaAjena}`,
];
const publicas = [
  "/seguimiento", `/seguimiento/${codigo}`, `/seguimiento/${codigo.toLowerCase().replace("-", "")}`,
  "/seguimiento?codigo=" + encodeURIComponent(codigo.toLowerCase()), "/seguimiento/ZZZZ-ZZZZ", "/seguimiento?codigo=abc",
];

async function pedir(ruta, token) {
  const r = await fetch(BASE + ruta, { headers: token ? { cookie: `sesion=${token}` } : {}, redirect: "manual" });
  const html = r.status === 200 ? await r.text() : "";
  const error = /Application error|Internal Server Error/.test(html) ? "  ← ERROR" : "";
  const destino = r.headers.get("location")?.replace(BASE, "");
  return `${r.status}${destino ? ` → ${destino}` : ""}${error}`;
}

const corto = (ruta) => ruta.replace(/[a-z0-9]{25}/g, ":id");
for (const rol of ["ADMIN", "OPERADOR", "CHOFER", "CLIENTE"]) {
  console.log(`\n== ${rol}`);
  for (const ruta of privadas) console.log(`${(await pedir(ruta, tokens[rol])).padEnd(22)} ${corto(ruta)}`);
}
console.log("\n== Sin sesión");
for (const ruta of [...publicas, "/envios"]) console.log(`${(await pedir(ruta)).padEnd(34)} ${ruta}`);
