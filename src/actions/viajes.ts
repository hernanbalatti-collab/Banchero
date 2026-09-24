"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { EstadoViaje, TipoGasto } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { hoy } from "@/lib/format";
import { ESTADO_VIAJE } from "@/lib/labels";
import { aceptarPedido, PedidoYaRevisado, verificarPedido } from "@/lib/pedidos";
import {
  datosForm,
  enteroOpcional,
  errorValidacion,
  fecha,
  fechaOpcional,
  importe,
  siValidos,
  texto,
  textoOpcional,
  type EstadoForm,
} from "@/lib/validacion";
import { estadoSegunAsignacion, puedeVerViaje, transicionesPermitidas } from "@/lib/viajes";

const esquemaViaje = z
  .object({
    clienteId: textoOpcional,
    depositoOrigenId: textoOpcional,
    depositoDestinoId: textoOpcional,
    choferId: textoOpcional,
    vehiculoId: textoOpcional,
    acopladoId: textoOpcional,
    // Opcionales en viajes entre depósitos: se completan con el nombre del depósito
    origen: textoOpcional,
    destino: textoOpcional,
    fechaCarga: fecha,
    fechaEntregaEstimada: fechaOpcional,
    descripcionCarga: texto,
    pesoKg: enteroOpcional,
    kmEstimados: enteroOpcional,
    tarifa: z.preprocess((v) => (v === "" || v == null ? "0" : v), importe),
    cartaPorte: textoOpcional,
    remito: textoOpcional,
    observaciones: textoOpcional,
  })
  .superRefine((v, ctx) => {
    const error = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const entreDepositos = !!(v.depositoOrigenId || v.depositoDestinoId);
    if (entreDepositos) {
      if (!v.depositoOrigenId) error("depositoOrigenId", "Elegí el depósito de origen");
      if (!v.depositoDestinoId) error("depositoDestinoId", "Elegí el depósito de destino");
      if (v.depositoOrigenId && v.depositoOrigenId === v.depositoDestinoId) error("depositoDestinoId", "Debe ser distinto del origen");
    } else {
      if (!v.clienteId) error("clienteId", "Elegí un cliente o indicá depósitos de origen y destino");
      if (!v.origen) error("origen", "Campo obligatorio");
      if (!v.destino) error("destino", "Campo obligatorio");
      if (v.tarifa.lte(0)) error("tarifa", "Indicá la tarifa del viaje");
    }
  }, siValidos("clienteId", "depositoOrigenId", "depositoDestinoId", "origen", "destino", "tarifa"))
  .refine((v) => !v.fechaEntregaEstimada || v.fechaEntregaEstimada >= v.fechaCarga, {
    path: ["fechaEntregaEstimada"],
    message: "No puede ser anterior a la fecha de carga",
    ...siValidos("fechaCarga", "fechaEntregaEstimada"),
  })
  .refine((v) => !v.acopladoId || v.acopladoId !== v.vehiculoId, {
    path: ["acopladoId"],
    message: "Debe ser distinto del vehículo principal",
    ...siValidos("acopladoId", "vehiculoId"),
  });

export async function guardarViaje(id: string | null, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquemaViaje.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);
  const datos = await completarRecorrido(r.data);

  if (!id) {
    // Viene de un pedido de flete cargado por el cliente en el portal
    const pedidoId = valores.pedidoId || undefined;
    const problema = await verificarPedido(pedidoId, "FLETE", datos.clienteId);
    if (problema) return { mensaje: problema, valores };

    const estado = estadoSegunAsignacion(datos.choferId, datos.vehiculoId);
    const viaje = await db.$transaction(async (tx) => {
      const ultimo = await tx.viaje.aggregate({ _max: { numero: true } });
      const creado = await tx.viaje.create({
        data: {
          ...datos,
          numero: (ultimo._max.numero ?? 0) + 1,
          estado,
          eventos: { create: { estado, nota: pedidoId ? "Viaje creado a partir del pedido del cliente" : "Viaje creado", usuarioId: usuario.id } },
        },
      });
      if (pedidoId) await aceptarPedido(tx, pedidoId, { viajeId: creado.id }, usuario.id);
      return creado;
    }).catch((e) => {
      if (e instanceof PedidoYaRevisado) return e;
      throw e;
    });
    if (viaje instanceof PedidoYaRevisado) return { mensaje: viaje.message, valores };
    revalidatePath("/viajes");
    if (pedidoId) revalidatePath("/pedidos", "layout");
    redirect(`/viajes/${viaje.id}`);
  }

  const actual = await db.viaje.findUnique({ where: { id } });
  if (!actual) notFound();
  if (actual.facturaId) {
    return { mensaje: "El viaje ya está facturado y no se puede modificar. Anulá la factura primero.", valores };
  }
  if (actual.estado === "ENTREGADO" || actual.estado === "CANCELADO") {
    return { mensaje: `No se puede modificar un viaje ${ESTADO_VIAJE[actual.estado][0].toLowerCase()}.`, valores };
  }
  if (
    (actual.depositoOrigenId !== datos.depositoOrigenId || actual.depositoDestinoId !== datos.depositoDestinoId) &&
    (await db.envio.count({ where: { viajeId: id } })) > 0
  ) {
    return { mensaje: "El viaje tiene envíos cargados: bajalos antes de cambiar los depósitos.", valores };
  }
  if (actual.estado === "EN_TRANSITO") {
    // Cambiar unidades en viaje dejaría desincronizado el estado de la flota
    const cambios = (["choferId", "vehiculoId", "acopladoId"] as const).filter((k) => datos[k] !== actual[k]);
    if (cambios.length) {
      return {
        mensaje: "No se puede cambiar chofer ni unidades de un viaje en tránsito.",
        errores: Object.fromEntries(cambios.map((k) => [k, ["No modificable en tránsito"]])),
        valores,
      };
    }
  }

  const estado = actual.estado === "EN_TRANSITO" ? actual.estado : estadoSegunAsignacion(datos.choferId, datos.vehiculoId);
  await db.viaje.update({
    where: { id },
    data: {
      ...datos,
      estado,
      ...(estado !== actual.estado && {
        eventos: { create: { estado, nota: "Cambio de asignación", usuarioId: usuario.id } },
      }),
    },
  });

  revalidatePath("/viajes");
  revalidatePath(`/viajes/${id}`);
  redirect(`/viajes/${id}`);
}

/** En viajes entre depósitos, completa origen/destino con el nombre del depósito. */
async function completarRecorrido<T extends { clienteId: string | null; depositoOrigenId: string | null; depositoDestinoId: string | null; origen: string | null; destino: string | null }>(
  datos: T,
) {
  const depositos = await db.deposito.findMany({
    where: { id: { in: [datos.depositoOrigenId, datos.depositoDestinoId].filter((v): v is string => !!v) } },
  });
  const nombre = (depId: string | null) => {
    const d = depositos.find((x) => x.id === depId);
    return d ? `Depósito ${d.nombre}` : null;
  };
  return {
    ...datos,
    // Un viaje entre depósitos lleva encomiendas de varios clientes: no tiene cliente propio
    clienteId: datos.depositoOrigenId ? null : datos.clienteId,
    origen: datos.origen ?? nombre(datos.depositoOrigenId) ?? "",
    destino: datos.destino ?? nombre(datos.depositoDestinoId) ?? "",
  };
}

const esquemaNovedad = z.object({
  estado: z.preprocess((v) => (v === "" ? undefined : v), z.enum(EstadoViaje).optional()),
  nota: textoOpcional,
  ubicacion: textoOpcional,
});

/** Registra un cambio de estado o una novedad (nota / ubicación) del viaje. */
export async function registrarNovedad(viajeId: string, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirUsuario();
  const viaje = await db.viaje.findUnique({
    where: { id: viajeId },
    include: { vehiculo: true, acoplado: true },
  });
  if (!viaje || !puedeVerViaje(usuario, viaje)) notFound();

  const valores = datosForm(formData);
  const r = esquemaNovedad.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);
  const { estado, nota, ubicacion } = r.data;

  if (!estado) {
    if (!nota && !ubicacion) return { mensaje: "Escribí una nota o una ubicación.", valores };
    await db.eventoViaje.create({ data: { viajeId, nota, ubicacion, usuarioId: usuario.id } });
    revalidatePath(`/viajes/${viajeId}`);
    return { ok: true, mensaje: "Novedad registrada." };
  }

  if (!transicionesPermitidas(viaje.estado, usuario.rol).includes(estado)) {
    return { mensaje: "Ese cambio de estado no está permitido.", valores };
  }

  if (estado === "EN_TRANSITO") {
    const problema = await validarInicio(viaje);
    if (problema) return { mensaje: problema, valores };
  }

  const vehiculos = [viaje.vehiculoId, viaje.acopladoId].filter((v): v is string => !!v);

  await db.$transaction(async (tx) => {
    await tx.viaje.update({
      where: { id: viajeId },
      data: {
        estado,
        ...(estado === "ENTREGADO" && { fechaEntrega: hoy() }),
        eventos: { create: { estado, nota, ubicacion, usuarioId: usuario.id } },
      },
    });
    await moverEnvios(tx, viaje, estado, usuario.id);
    if (estado === "EN_TRANSITO") {
      await tx.vehiculo.updateMany({ where: { id: { in: vehiculos } }, data: { estado: "EN_VIAJE" } });
    } else if (viaje.estado === "EN_TRANSITO") {
      // Al terminar el viaje las unidades quedan libres
      await tx.vehiculo.updateMany({
        where: { id: { in: vehiculos }, estado: "EN_VIAJE" },
        data: { estado: "DISPONIBLE" },
      });
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, mensaje: `Estado actualizado a «${ESTADO_VIAJE[estado][0]}».` };
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Los envíos acompañan al viaje: salen con él, llegan al depósito de destino
 * cuando el viaje se entrega, y si se cancela vuelven a esperar en origen.
 */
async function moverEnvios(
  tx: Tx,
  viaje: { id: string; depositoOrigenId: string | null; depositoDestinoId: string | null },
  estado: EstadoViaje,
  usuarioId: string,
) {
  if (!viaje.depositoOrigenId || !viaje.depositoDestinoId) return;
  const envios = await tx.envio.findMany({ where: { viajeId: viaje.id }, select: { id: true } });
  if (envios.length === 0) return;
  const ids = envios.map((e) => e.id);

  if (estado === "EN_TRANSITO") {
    await tx.envio.updateMany({ where: { id: { in: ids } }, data: { estado: "EN_TRANSITO" } });
    await tx.eventoEnvio.createMany({
      data: ids.map((envioId) => ({ envioId, estado: "EN_TRANSITO" as const, depositoId: viaje.depositoOrigenId, usuarioId })),
    });
  } else if (estado === "ENTREGADO") {
    await tx.envio.updateMany({ where: { id: { in: ids } }, data: { estado: "EN_DESTINO" } });
    await tx.eventoEnvio.createMany({
      data: ids.map((envioId) => ({ envioId, estado: "EN_DESTINO" as const, depositoId: viaje.depositoDestinoId, usuarioId })),
    });
  } else if (estado === "CANCELADO") {
    // Quedan (o vuelven) al depósito de origen, listos para otro viaje
    const enViaje = await tx.envio.findMany({ where: { id: { in: ids }, estado: "EN_TRANSITO" }, select: { id: true } });
    await tx.envio.updateMany({ where: { id: { in: ids } }, data: { estado: "RECIBIDO", viajeId: null } });
    await tx.eventoEnvio.createMany({
      data: enViaje.map((e) => ({
        envioId: e.id,
        estado: "RECIBIDO" as const,
        depositoId: viaje.depositoOrigenId,
        nota: "Viaje cancelado: el envío volvió al depósito",
        usuarioId,
      })),
    });
  }
}

async function validarInicio(viaje: {
  id: string;
  choferId: string | null;
  vehiculo: { patente: string; estado: string } | null;
  acoplado: { patente: string; estado: string } | null;
}) {
  if (!viaje.choferId || !viaje.vehiculo) return "Asigná chofer y vehículo antes de iniciar el viaje.";
  for (const v of [viaje.vehiculo, viaje.acoplado]) {
    if (v && v.estado !== "DISPONIBLE") {
      return `La unidad ${v.patente} no está disponible (${v.estado === "EN_VIAJE" ? "está en otro viaje" : "en mantenimiento o de baja"}).`;
    }
  }
  const otro = await db.viaje.findFirst({
    where: { choferId: viaje.choferId, estado: "EN_TRANSITO", id: { not: viaje.id } },
    select: { numero: true },
  });
  if (otro) return `El chofer ya tiene un viaje en tránsito (N.º ${otro.numero}).`;
  return null;
}

const esquemaGasto = z.object({
  tipo: z.enum(TipoGasto),
  monto: importe.refine((m) => m.gt(0), "Debe ser mayor a cero"),
  fecha,
  descripcion: textoOpcional,
});

export async function agregarGasto(viajeId: string, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirUsuario();
  const viaje = await db.viaje.findUnique({ where: { id: viajeId }, select: { choferId: true, estado: true } });
  if (!viaje || !puedeVerViaje(usuario, viaje)) notFound();
  if (viaje.estado === "CANCELADO") return { mensaje: "El viaje está cancelado." };

  const valores = datosForm(formData);
  const r = esquemaGasto.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);

  await db.gasto.create({ data: { ...r.data, viajeId } });
  revalidatePath(`/viajes/${viajeId}`);
  return { ok: true, mensaje: "Gasto registrado." };
}

export async function eliminarGasto(gastoId: string) {
  await requerirUsuario(ROLES_GESTION);
  const gasto = await db.gasto.delete({ where: { id: gastoId } });
  revalidatePath(`/viajes/${gasto.viajeId}`);
}
