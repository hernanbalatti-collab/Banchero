// Datos de ejemplo. Se ejecuta con `npm run db:seed` (o al hacer db:reset).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { EstadoEnvio, EstadoViaje, TipoGasto } from "../src/generated/prisma/enums";
import { generarCodigo } from "../src/lib/envios";

// Borra TODOS los datos antes de cargar los de ejemplo: nunca correrlo contra producción
if (process.env.DATABASE_URL?.startsWith("libsql://")) {
  console.error("El seed borra todos los datos: no se corre contra una base remota (Turso).");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL! }) });

// Generador pseudoaleatorio con semilla: el seed da siempre los mismos datos
let semilla = 42;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
const entre = (min: number, max: number) => Math.floor(min + azar() * (max - min + 1));
const elegir = <T,>(xs: readonly T[]) => xs[Math.floor(azar() * xs.length)];

const DIA = 86_400_000;
const hoy = (() => {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  return new Date(`${s}T00:00:00Z`);
})();
const dias = (n: number) => new Date(hoy.getTime() + n * DIA);

const RUTAS = [
  { origen: "Chivilcoy, BA", destino: "CABA", km: 160 },
  { origen: "Chivilcoy, BA", destino: "Rosario, SF", km: 330 },
  { origen: "Rosario, SF", destino: "Córdoba, CBA", km: 400 },
  { origen: "CABA", destino: "Mar del Plata, BA", km: 410 },
  { origen: "Chivilcoy, BA", destino: "Bahía Blanca, BA", km: 560 },
  { origen: "Pergamino, BA", destino: "Mendoza, MZA", km: 890 },
  { origen: "Junín, BA", destino: "Zárate, BA", km: 250 },
  { origen: "Chivilcoy, BA", destino: "Santa Fe, SF", km: 470 },
  { origen: "Bragado, BA", destino: "La Plata, BA", km: 270 },
  { origen: "Córdoba, CBA", destino: "Tucumán, TUC", km: 560 },
];
const CARGAS = [
  "Pallets de alimentos secos",
  "Bolsas de cemento",
  "Cereal a granel (soja)",
  "Maquinaria agrícola",
  "Bobinas de acero",
  "Electrodomésticos",
  "Fertilizante en big bags",
  "Carga general consolidada",
];

async function main() {
  // Limpieza en orden de dependencias (los depósitos los crea la migración)
  await db.eventoEnvio.deleteMany();
  await db.envio.deleteMany();
  await db.eventoViaje.deleteMany();
  await db.gasto.deleteMany();
  await db.viaje.deleteMany();
  await db.factura.deleteMany();
  await db.usuario.deleteMany();
  await db.chofer.deleteMany();
  await db.vehiculo.deleteMany();
  await db.cliente.deleteMany();

  const clientes = await Promise.all(
    [
      ["Agroexport del Oeste S.A.", "30-71234567-1", "RESPONSABLE_INSCRIPTO"],
      ["Cementos Pampeanos S.R.L.", "30-70987654-2", "RESPONSABLE_INSCRIPTO"],
      ["Distribuidora La Estrella S.A.", "30-69876543-3", "RESPONSABLE_INSCRIPTO"],
      ["Metalúrgica Chivilcoy S.A.", "30-71555222-4", "RESPONSABLE_INSCRIPTO"],
      ["Cooperativa Agrícola Unión", "30-50111222-5", "EXENTO"],
      ["Juan Pérez (Ferretería)", "20-25111333-6", "MONOTRIBUTO"],
    ].map(([razonSocial, cuit, condicionIva], i) =>
      db.cliente.create({
        data: {
          razonSocial,
          cuit,
          condicionIva: condicionIva as "RESPONSABLE_INSCRIPTO",
          email: `contacto${i + 1}@ejemplo.com`,
          telefono: `(02346) 4${entre(10000, 99999)}`,
          direccion: `Av. Principal ${entre(100, 3000)}`,
        },
      }),
    ),
  );

  const choferes = await Promise.all(
    [
      ["Carlos", "Gómez", "25123456", 200],
      ["Martín", "Rodríguez", "28987654", 20],
      ["Diego", "Fernández", "31456789", 400],
      ["Lucas", "Sosa", "33222111", -5],
      ["Ramón", "Acosta", "22555666", 150],
    ].map(([nombre, apellido, dni, venceEn]) =>
      db.chofer.create({
        data: {
          nombre: nombre as string,
          apellido: apellido as string,
          dni: dni as string,
          telefono: `11-${entre(4000, 6999)}-${entre(1000, 9999)}`,
          categoriaLicencia: "E1",
          vencimientoLicencia: dias(venceEn as number),
          vencimientoLinti: dias((venceEn as number) + 60),
        },
      }),
    ),
  );

  const tractores = await Promise.all(
    [
      ["AB123CD", "TRACTOR", "Scania", "R450", 2019, 25],
      ["AC456EF", "TRACTOR", "Mercedes-Benz", "Actros 2046", 2020, 180],
      ["AD789GH", "TRACTOR", "Iveco", "Stralis 490", 2018, 300],
      ["AE321JK", "TRACTOR", "Volvo", "FH 460", 2021, -3],
      ["OKL472", "CAMION", "Ford", "Cargo 1723", 2014, 90],
    ].map(([patente, tipo, marca, modelo, anio, venceEn]) =>
      db.vehiculo.create({
        data: {
          patente: patente as string,
          tipo: tipo as "TRACTOR",
          marca: marca as string,
          modelo: modelo as string,
          anio: anio as number,
          capacidadKg: tipo === "CAMION" ? 12000 : null,
          vencimientoVtv: dias(venceEn as number),
          vencimientoSeguro: dias((venceEn as number) + 45),
        },
      }),
    ),
  );
  const semis = await Promise.all(
    ["AA111BB", "AA222CC", "AA333DD", "AF444EE"].map((patente, i) =>
      db.vehiculo.create({
        data: {
          patente,
          tipo: "SEMIRREMOLQUE",
          marca: elegir(["Helvética", "Sola y Brusa", "Montenegro"]),
          modelo: "Sider 3 ejes",
          anio: 2016 + i,
          capacidadKg: 30000,
          vencimientoVtv: dias(entre(40, 300)),
          vencimientoSeguro: dias(entre(40, 300)),
        },
      }),
    ),
  );

  const hash = (p: string) => bcrypt.hash(p, 10);
  await db.usuario.createMany({
    data: [
      { nombre: "Admin General", email: "admin@cargas.local", passwordHash: await hash("admin1234"), rol: "ADMIN" },
      { nombre: "Laura Operaciones", email: "operador@cargas.local", passwordHash: await hash("operador1234"), rol: "OPERADOR" },
      { nombre: "Carlos Gómez", email: "chofer@cargas.local", passwordHash: await hash("chofer1234"), rol: "CHOFER", choferId: choferes[0].id },
    ],
  });
  const admin = await db.usuario.findUniqueOrThrow({ where: { email: "admin@cargas.local" } });

  // ─── Viajes: ~6 meses de historia + algunos activos ───
  let numero = 0;
  const entregados: { id: string; clienteId: string; tarifa: Prisma.Decimal; fechaEntrega: Date }[] = [];

  // El camión y el último chofer quedan para la línea entre depósitos
  async function crearViaje(fechaCarga: Date, estado: EstadoViaje, conRecursos = true, idxForzado?: number) {
    const ruta = elegir(RUTAS);
    const cliente = elegir(clientes);
    const idx = idxForzado ?? entre(0, 3);
    const tractor = tractores[idx];
    const chofer = choferes[idx];
    const semi = tractor.tipo === "TRACTOR" ? semis[idx % semis.length] : null;
    const duracion = Math.ceil(ruta.km / 500);
    const tarifa = new Prisma.Decimal(Math.round((ruta.km * entre(1400, 1900) + 150_000) / 1000) * 1000);
    const fechaEntrega = estado === "ENTREGADO" ? new Date(fechaCarga.getTime() + duracion * DIA) : null;
    numero += 1;

    const eventos: { estado: EstadoViaje | null; nota?: string; ubicacion?: string; createdAt: Date }[] = [
      { estado: conRecursos ? "ASIGNADO" : "PENDIENTE", nota: "Viaje creado", createdAt: new Date(fechaCarga.getTime() - DIA + 10 * 3600_000) },
    ];
    if (["EN_TRANSITO", "ENTREGADO"].includes(estado)) {
      eventos.push({ estado: "EN_TRANSITO", ubicacion: ruta.origen, nota: "Cargado y en ruta", createdAt: new Date(fechaCarga.getTime() + 9 * 3600_000) });
    }
    if (estado === "EN_TRANSITO") {
      eventos.push({ estado: null, ubicacion: "Ruta 5, km 210", nota: "Parada para descanso", createdAt: new Date(fechaCarga.getTime() + 14 * 3600_000) });
    }
    if (estado === "ENTREGADO") {
      eventos.push({ estado: "ENTREGADO", ubicacion: ruta.destino, nota: "Entregado sin novedades", createdAt: new Date(fechaEntrega!.getTime() + 16 * 3600_000) });
    }
    if (estado === "CANCELADO") {
      eventos.push({ estado: "CANCELADO", nota: "Cancelado por el cliente", createdAt: fechaCarga });
    }

    const gastos: { tipo: TipoGasto; monto: Prisma.Decimal; fecha: Date; descripcion?: string }[] = [];
    if (["EN_TRANSITO", "ENTREGADO"].includes(estado)) {
      const litros = Math.round(ruta.km * 0.38);
      gastos.push({ tipo: "COMBUSTIBLE", monto: new Prisma.Decimal(litros * entre(1150, 1300)), fecha: fechaCarga, descripcion: `${litros} L gasoil` });
      gastos.push({ tipo: "PEAJE", monto: new Prisma.Decimal(entre(3, 12) * 4500), fecha: fechaCarga });
      if (duracion > 1) gastos.push({ tipo: "VIATICO", monto: new Prisma.Decimal(duracion * 35000), fecha: fechaCarga });
    }

    const viaje = await db.viaje.create({
      data: {
        numero,
        estado,
        clienteId: cliente.id,
        choferId: conRecursos ? chofer.id : null,
        vehiculoId: conRecursos ? tractor.id : null,
        acopladoId: conRecursos ? semi?.id : null,
        origen: ruta.origen,
        destino: ruta.destino,
        fechaCarga,
        fechaEntregaEstimada: new Date(fechaCarga.getTime() + duracion * DIA),
        fechaEntrega,
        descripcionCarga: elegir(CARGAS),
        pesoKg: entre(8, 29) * 1000,
        kmEstimados: ruta.km,
        tarifa,
        cartaPorte: estado !== "PENDIENTE" ? `CTG-${entre(10000000, 99999999)}` : null,
        remito: estado === "ENTREGADO" ? `0001-${String(entre(1, 99999)).padStart(8, "0")}` : null,
        eventos: { create: eventos.map((e) => ({ ...e, usuarioId: admin.id })) },
        gastos: { create: gastos },
      },
    });
    if (fechaEntrega) entregados.push({ id: viaje.id, clienteId: cliente.id, tarifa, fechaEntrega });
  }

  // Historia: entre 180 y 5 días atrás
  for (let d = -180; d <= -5; d += entre(2, 4)) {
    await crearViaje(dias(d), azar() < 0.06 ? "CANCELADO" : "ENTREGADO");
  }
  // Activos: dos en tránsito, dos asignados y dos pendientes
  await crearViaje(dias(-1), "EN_TRANSITO", true, 0);
  await crearViaje(dias(0), "EN_TRANSITO", true, 1);
  await crearViaje(dias(1), "ASIGNADO");
  await crearViaje(dias(2), "ASIGNADO");
  await crearViaje(dias(3), "PENDIENTE", false);
  await crearViaje(dias(4), "PENDIENTE", false);

  // ─── Línea Chivilcoy ⇄ CABA con encomiendas ───
  const CHV = "dep_chivilcoy";
  const CABA = "dep_caba";
  const camion = tractores[4];
  const choferLinea = choferes[4];
  const nombre = (id: string) => (id === CHV ? "Chivilcoy" : "CABA");
  const DESTINATARIOS = ["María López", "Jorge Benítez", "Ana Romero", "Pablo Díaz", "Sofía Herrera", "Hugo Molina", "Carla Vega", "Tomás Ríos"];
  const CONTENIDOS = ["Caja con repuestos", "Documentación", "Indumentaria", "Electrodoméstico chico", "Insumos de oficina", "Medicamentos", "Autopartes"];

  async function crearEnvio(
    origen: string,
    destino: string,
    recibido: Date,
    estado: EstadoEnvio,
    viaje?: { id: string; sale: Date; llega?: Date },
  ) {
    const domicilio = estado === "EN_REPARTO" || azar() < 0.35;
    const eventos: { estado: EstadoEnvio; depositoId: string | null; createdAt: Date }[] = [
      { estado: "RECIBIDO", depositoId: origen, createdAt: recibido },
    ];
    const orden: EstadoEnvio[] = ["RECIBIDO", "EN_TRANSITO", "EN_DESTINO", "EN_REPARTO", "ENTREGADO"];
    const hasta = orden.indexOf(estado);
    if (viaje && hasta >= 1) eventos.push({ estado: "EN_TRANSITO", depositoId: origen, createdAt: viaje.sale });
    if (viaje?.llega && hasta >= 2) eventos.push({ estado: "EN_DESTINO", depositoId: destino, createdAt: viaje.llega });
    const llega = viaje?.llega ?? recibido;
    if (domicilio && hasta >= 3) eventos.push({ estado: "EN_REPARTO", depositoId: null, createdAt: new Date(llega.getTime() + 15 * 3600_000) });
    // Nunca en el futuro respecto de cuando corre el seed
    const entrega = new Date(Math.min(llega.getTime() + (domicilio ? 20 : 28) * 3600_000, Date.now() - 3600_000));
    if (hasta >= 4) eventos.push({ estado: "ENTREGADO", depositoId: null, createdAt: entrega });
    // Reparto: el chofer de la línea; en el depósito entrega el personal
    const repartidor = domicilio && hasta >= 3 ? choferLinea : null;
    const destinatario = elegir(DESTINATARIOS);

    await db.envio.create({
      data: {
        codigo: generarCodigo(),
        estado,
        clienteId: elegir(clientes).id,
        depositoOrigenId: origen,
        depositoDestinoId: destino,
        destinatarioNombre: destinatario,
        destinatarioTelefono: `11-${entre(4000, 6999)}-${entre(1000, 9999)}`,
        entregaDomicilio: domicilio,
        direccionEntrega: domicilio ? `Calle ${entre(1, 150)} N.º ${entre(100, 2500)}, ${nombre(destino)}` : null,
        descripcion: elegir(CONTENIDOS),
        bultos: entre(1, 4),
        pesoKg: entre(1, 60),
        precio: new Prisma.Decimal(entre(8, 45) * 1000),
        viajeId: viaje?.id,
        repartidorId: repartidor?.id,
        entregadoPor: hasta >= 4 ? (repartidor ? `${repartidor.nombre} ${repartidor.apellido}` : "Laura Operaciones") : null,
        recibidoPor: hasta >= 4 ? destinatario : null,
        recibidoDni: hasta >= 4 ? String(entre(20_000_000, 45_000_000)) : null,
        fechaEntrega: hasta >= 4 ? entrega : null,
        createdAt: recibido,
        eventos: { create: eventos.map((e) => ({ ...e, usuarioId: admin.id })) },
      },
    });
  }

  async function crearViajeLinea(sale: Date, origen: string, destino: string, estado: EstadoViaje, envios: number) {
    numero += 1;
    const llega = estado === "ENTREGADO" ? new Date(sale.getTime() + 5 * 3600_000) : null;
    const viaje = await db.viaje.create({
      data: {
        numero,
        estado,
        depositoOrigenId: origen,
        depositoDestinoId: destino,
        choferId: choferLinea.id,
        vehiculoId: camion.id,
        origen: `Depósito ${nombre(origen)}`,
        destino: `Depósito ${nombre(destino)}`,
        fechaCarga: new Date(Date.UTC(sale.getUTCFullYear(), sale.getUTCMonth(), sale.getUTCDate())),
        fechaEntrega: llega ? new Date(Date.UTC(llega.getUTCFullYear(), llega.getUTCMonth(), llega.getUTCDate())) : null,
        descripcionCarga: "Encomiendas",
        kmEstimados: 160,
        tarifa: new Prisma.Decimal(0),
        eventos: {
          create: [
            { estado: "ASIGNADO", nota: "Viaje creado", usuarioId: admin.id, createdAt: new Date(sale.getTime() - 6 * 3600_000) },
            ...(estado !== "ASIGNADO"
              ? [{ estado: "EN_TRANSITO" as const, ubicacion: `Depósito ${nombre(origen)}`, usuarioId: admin.id, createdAt: sale }]
              : []),
            ...(llega ? [{ estado: "ENTREGADO" as const, ubicacion: `Depósito ${nombre(destino)}`, usuarioId: admin.id, createdAt: llega }] : []),
          ],
        },
        gastos:
          estado === "ASIGNADO"
            ? undefined
            : {
                create: [
                  { tipo: "COMBUSTIBLE", monto: new Prisma.Decimal(entre(70, 90) * 1000), fecha: sale, descripcion: "Gasoil" },
                  { tipo: "PEAJE", monto: new Prisma.Decimal(9000), fecha: sale },
                ],
              },
      },
    });
    const estadoEnvio: EstadoEnvio = estado === "ENTREGADO" ? "ENTREGADO" : estado === "EN_TRANSITO" ? "EN_TRANSITO" : "RECIBIDO";
    for (let i = 0; i < envios; i++) {
      const recibido = new Date(sale.getTime() - entre(8, 40) * 3600_000);
      await crearEnvio(origen, destino, recibido, estadoEnvio, { id: viaje.id, sale, llega: llega ?? undefined });
    }
    return { viaje, llega };
  }

  // Historia: un viaje por día hábil, alternando sentido (sale 6 h de Argentina = 9 h UTC)
  for (let d = -60; d <= -3; d++) {
    const fecha = dias(d);
    if ([0, 6].includes(fecha.getUTCDay())) continue;
    const [o, de] = d % 2 === 0 ? [CHV, CABA] : [CABA, CHV];
    await crearViajeLinea(new Date(fecha.getTime() + 9 * 3600_000), o, de, "ENTREGADO", entre(3, 8));
  }
  // Ayer llegó uno a CABA: parte entregado, parte en depósito o en reparto
  {
    const sale = new Date(dias(-1).getTime() + 9 * 3600_000);
    const { viaje, llega } = await crearViajeLinea(sale, CHV, CABA, "ENTREGADO", 0);
    for (const estado of ["ENTREGADO", "ENTREGADO", "EN_DESTINO", "EN_DESTINO", "EN_DESTINO", "EN_REPARTO"] as const) {
      await crearEnvio(CHV, CABA, new Date(sale.getTime() - entre(8, 30) * 3600_000), estado, { id: viaje.id, sale, llega: llega! });
    }
  }
  // Hoy: uno en viaje hacia Chivilcoy y uno programado mañana hacia CABA
  await crearViajeLinea(new Date(dias(0).getTime() + 9 * 3600_000), CABA, CHV, "EN_TRANSITO", 5);
  await crearViajeLinea(new Date(dias(1).getTime() + 9 * 3600_000), CHV, CABA, "ASIGNADO", 2);
  // Encomiendas recién recibidas, esperando viaje en cada depósito
  for (let i = 0; i < 4; i++) await crearEnvio(CHV, CABA, new Date(dias(0).getTime() + (12 + i) * 3600_000), "RECIBIDO");
  for (let i = 0; i < 3; i++) await crearEnvio(CABA, CHV, new Date(dias(0).getTime() + (13 + i) * 3600_000), "RECIBIDO");

  // Las unidades de los viajes en tránsito quedan "En viaje"
  const enViaje = await db.viaje.findMany({ where: { estado: "EN_TRANSITO" }, select: { vehiculoId: true, acopladoId: true } });
  await db.vehiculo.updateMany({
    where: { id: { in: enViaje.flatMap((v) => [v.vehiculoId, v.acopladoId]).filter((v): v is string => !!v) } },
    data: { estado: "EN_VIAJE" },
  });

  // ─── Facturas: una por cliente y mes, para lo entregado hace más de 20 días ───
  const grupos = new Map<string, typeof entregados>();
  for (const v of entregados.filter((v) => v.fechaEntrega < dias(-20))) {
    const clave = `${v.clienteId}|${v.fechaEntrega.toISOString().slice(0, 7)}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), v]);
  }
  const numeros = { A: 0, B: 0, C: 0 };
  for (const viajes of grupos.values()) {
    const cliente = clientes.find((c) => c.id === viajes[0].clienteId)!;
    const tipo = cliente.condicionIva === "RESPONSABLE_INSCRIPTO" ? "A" : "B";
    const fecha = new Date(Math.max(...viajes.map((v) => v.fechaEntrega.getTime())) + 2 * DIA);
    const vencimiento = new Date(fecha.getTime() + 30 * DIA);
    const subtotal = viajes.reduce((s, v) => s.add(v.tarifa), new Prisma.Decimal(0));
    const iva = subtotal.mul("0.21").toDecimalPlaces(2);
    // Cobradas las viejas; algunas recientes quedan pendientes
    const pagada = vencimiento < dias(-10) || azar() < 0.3;
    await db.factura.create({
      data: {
        tipo,
        numero: ++numeros[tipo],
        clienteId: cliente.id,
        fecha,
        vencimiento,
        subtotal,
        iva,
        total: subtotal.add(iva),
        estado: pagada ? "PAGADA" : "EMITIDA",
        fechaPago: pagada ? new Date(Math.min(vencimiento.getTime() - 5 * DIA, hoy.getTime())) : null,
        viajes: { connect: viajes.map((v) => ({ id: v.id })) },
      },
    });
  }

  const [nv, nf, ne] = await Promise.all([db.viaje.count(), db.factura.count(), db.envio.count()]);
  console.log(
    `Seed listo: ${clientes.length} clientes, ${choferes.length} choferes, ${tractores.length + semis.length} vehículos, ${nv} viajes, ${ne} envíos, ${nf} facturas.`,
  );
}

main()
  .then(() => db.$disconnect())
  // Salida explícita: en Windows el cliente nativo de libsql a veces falla
  // al liberar recursos en el cierre natural del proceso, con los datos ya guardados
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
