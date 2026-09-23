// Recorre las páginas con cada rol y verifica códigos de respuesta.
// Uso: con el servidor corriendo, `node scripts/probar-rutas.mjs [url-base]`
import "dotenv/config";
import Database from "better-sqlite3";
import { SignJWT } from "jose";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new Database("prisma/dev.db", { readonly: true });
const clave = new TextEncoder().encode(process.env.SESSION_SECRET);
const uno = (sql) => db.prepare(sql).get()?.id;

const tokens = {};
for (const u of db.prepare("select id, rol from Usuario").all()) {
  tokens[u.rol] = await new SignJWT({ userId: u.id, rol: u.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(clave);
}

const choferUsuario = db.prepare("select choferId from Usuario where rol = 'CHOFER'").get().choferId;
const ids = {
  viaje: uno("select id from Viaje where estado = 'EN_TRANSITO' and clienteId is not null"),
  viajeLinea: uno("select id from Viaje where depositoOrigenId is not null and estado = 'ASIGNADO'"),
  viajePropio: db.prepare("select id from Viaje where choferId = ?").get(choferUsuario)?.id,
  viajeAjeno: db.prepare("select id from Viaje where choferId <> ?").get(choferUsuario)?.id,
  factura: uno("select id from Factura"),
  cliente: uno("select id from Cliente"),
  vehiculo: uno("select id from Vehiculo"),
  chofer: uno("select id from Chofer"),
  usuario: uno("select id from Usuario"),
  envio: uno("select id from Envio where estado = 'EN_DESTINO'"),
};
const codigo = db.prepare("select codigo from Envio where estado = 'EN_TRANSITO'").get().codigo;

const privadas = [
  "/", "/viajes", "/viajes/nuevo", `/viajes/${ids.viaje}`, `/viajes/${ids.viaje}/editar`, `/viajes/${ids.viajeLinea}`,
  "/envios", "/envios?estado=TODOS&deposito=dep_caba", "/envios/nuevo", `/envios/${ids.envio}`,
  "/clientes", `/clientes/${ids.cliente}`, "/flota/vehiculos", `/flota/vehiculos/${ids.vehiculo}`,
  "/flota/choferes", `/flota/choferes/${ids.chofer}`, "/facturacion", "/facturacion/nueva", `/facturacion/${ids.factura}`,
  "/reportes", "/usuarios", `/usuarios/${ids.usuario}`, "/mis-viajes", `/viajes/${ids.viajePropio}`, `/viajes/${ids.viajeAjeno}`,
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
for (const rol of ["ADMIN", "OPERADOR", "CHOFER"]) {
  console.log(`\n== ${rol}`);
  for (const ruta of privadas) console.log(`${(await pedir(ruta, tokens[rol])).padEnd(22)} ${corto(ruta)}`);
}
console.log("\n== Sin sesión");
for (const ruta of [...publicas, "/envios"]) console.log(`${(await pedir(ruta)).padEnd(34)} ${ruta}`);
