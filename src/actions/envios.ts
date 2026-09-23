"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { EstadoEnvio } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { generarCodigo, transicionesEnvio } from "@/lib/envios";
import { desdeInputFechaHora } from "@/lib/format";
import { ESTADO_ENVIO } from "@/lib/labels";
import {
  checkbox,
  datosForm,
  enteroOpcional,
  errorValidacion,
  esDuplicado,
  importe,
  siValidos,
  texto,
  textoOpcional,
  type EstadoForm,
} from "@/lib/validacion";

const esquemaEnvio = z
  .object({
    clienteId: texto,
    depositoOrigenId: texto,
    depositoDestinoId: texto,
    destinatarioNombre: texto,
    destinatarioTelefono: textoOpcional,
    entregaDomicilio: checkbox,
    direccionEntrega: textoOpcional,
    descripcion: texto,
    bultos: enteroOpcional.refine((b) => b == null || b >= 1, "Mínimo 1 bulto"),
    pesoKg: z.preprocess(
      (v) => (v === "" || v == null ? null : String(v).replace(",", ".")),
      z.coerce.number({ error: "Peso inválido" }).min(0).nullable(),
    ),
    valorDeclarado: z.preprocess((v) => (v === "" ? undefined : v), importe.optional()),
    precio: importe,
  })
  .refine((v) => v.depositoOrigenId !== v.depositoDestinoId, {
    path: ["depositoDestinoId"],
    message: "Debe ser distinto del depósito de origen",
    ...siValidos("depositoOrigenId", "depositoDestinoId"),
  })
  .refine((v) => !v.entregaDomicilio || v.direccionEntrega, {
    path: ["direccionEntrega"],
    message: "Indicá la dirección de entrega",
    ...siValidos("entregaDomicilio", "direccionEntrega"),
  });

export async function crearEnvio(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquemaEnvio.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);
  const { bultos, ...datos } = r.data;

  // Reintenta ante la (improbable) colisión del código aleatorio
  let envioId: string | null = null;
  for (let intento = 0; intento < 5 && !envioId; intento++) {
    try {
      const envio = await db.envio.create({
        data: {
          ...datos,
          bultos: bultos ?? 1,
          codigo: generarCodigo(),
          eventos: { create: { estado: "RECIBIDO", depositoId: datos.depositoOrigenId, usuarioId: usuario.id } },
        },
      });
      envioId = envio.id;
    } catch (e) {
      if (!esDuplicado(e)) throw e;
    }
  }
  if (!envioId) return { mensaje: "No se pudo generar el código de seguimiento. Probá de nuevo.", valores };

  revalidatePath("/envios");
  redirect(`/envios/${envioId}`);
}

const esquemaEstado = z.object({
  estado: z.enum(EstadoEnvio),
  nota: textoOpcional,
  repartidorId: textoOpcional,
  entregadoPor: textoOpcional,
  recibidoPor: textoOpcional,
  recibidoDni: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.replace(/\D/g, "") : null),
    z.string().regex(/^\d{7,8}$/, "DNI inválido").nullable(),
  ),
  fechaEntrega: textoOpcional,
});

/** Cambia el estado de un envío. Lo usan la gestión y el chofer repartidor. */
export async function cambiarEstadoEnvio(id: string, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirUsuario();
  const envio = await db.envio.findUnique({ where: { id } });
  if (!envio) notFound();
  const permitidas = transicionesEnvio(envio, usuario);
  // Un chofer sin repartos asignados no debe saber que el envío existe
  if (usuario.rol === "CHOFER" && permitidas.length === 0) notFound();

  const valores = datosForm(formData);
  const r = esquemaEstado.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);
  const { estado, nota } = r.data;
  if (!permitidas.includes(estado)) return { mensaje: "Ese cambio de estado no está permitido.", valores };

  const errores: Record<string, string[]> = {};
  const datos: Prisma.EnvioUpdateInput = { estado };

  if (estado === "EN_REPARTO") {
    const repartidor = r.data.repartidorId
      ? await db.chofer.findFirst({ where: { id: r.data.repartidorId, activo: true } })
      : null;
    if (!repartidor) errores.repartidorId = ["Elegí quién sale a repartir"];
    else datos.repartidor = { connect: { id: repartidor.id } };
  }

  if (estado === "ENTREGADO") {
    const cuando = r.data.fechaEntrega ? desdeInputFechaHora(r.data.fechaEntrega) : new Date();
    // El chofer siempre figura como quien entregó
    const entregadoPor = usuario.rol === "CHOFER" ? usuario.nombre : r.data.entregadoPor;
    if (!r.data.recibidoPor) errores.recibidoPor = ["Indicá quién recibió el envío"];
    if (!r.data.recibidoDni) errores.recibidoDni = ["Indicá el DNI de quien recibió"];
    if (!entregadoPor) errores.entregadoPor = ["Indicá quién entregó el envío"];
    if (!cuando) errores.fechaEntrega = ["Fecha y hora inválidas"];
    else if (cuando.getTime() > Date.now() + 5 * 60_000) errores.fechaEntrega = ["No puede ser una fecha futura"];
    // El input trabaja en minutos: se tolera el minuto de la recepción
    else if (cuando.getTime() < envio.createdAt.getTime() - 60_000) errores.fechaEntrega = ["Es anterior a la recepción del envío"];
    Object.assign(datos, { entregadoPor, recibidoPor: r.data.recibidoPor, recibidoDni: r.data.recibidoDni, fechaEntrega: cuando });
  }

  if (estado === "EN_DESTINO") {
    // Reparto fallido: vuelve al depósito y queda libre para reasignar
    datos.repartidor = { disconnect: true };
  }

  if (Object.keys(errores).length) return { errores, mensaje: "Revisá los campos marcados.", valores };

  await db.envio.update({
    where: { id },
    data: {
      ...datos,
      eventos: {
        create: {
          estado,
          nota: nota ?? (estado === "EN_DESTINO" && envio.estado === "EN_REPARTO" ? "No se pudo entregar: volvió al depósito" : null),
          usuarioId: usuario.id,
          // Fecha real de la entrega, aunque se registre después
          ...(estado === "ENTREGADO" && datos.fechaEntrega instanceof Date && { createdAt: datos.fechaEntrega }),
          depositoId: estado === "CANCELADO" ? envio.depositoOrigenId : estado === "EN_DESTINO" ? envio.depositoDestinoId : null,
        },
      },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, mensaje: `Estado actualizado a «${ESTADO_ENVIO[estado][0]}».` };
}

/** Sube al viaje los envíos seleccionados (deben esperar en el depósito de origen del viaje). */
export async function cargarEnvios(viajeId: string, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirUsuario(ROLES_GESTION);
  const viaje = await db.viaje.findUnique({ where: { id: viajeId } });
  if (!viaje) notFound();
  if (!viaje.depositoOrigenId || !viaje.depositoDestinoId) return { mensaje: "El viaje no es entre depósitos." };
  if (viaje.estado !== "PENDIENTE" && viaje.estado !== "ASIGNADO") {
    return { mensaje: "Solo se pueden cargar envíos antes de que salga el viaje." };
  }

  const ids = [...new Set(formData.getAll("envios").filter((v): v is string => typeof v === "string"))];
  if (ids.length === 0) return { mensaje: "Seleccioná al menos un envío." };

  const { count } = await db.envio.updateMany({
    where: {
      id: { in: ids },
      estado: "RECIBIDO",
      viajeId: null,
      depositoOrigenId: viaje.depositoOrigenId,
      depositoDestinoId: viaje.depositoDestinoId,
    },
    data: { viajeId },
  });

  revalidatePath(`/viajes/${viajeId}`);
  revalidatePath("/envios");
  return { ok: true, mensaje: `${count} envío${count === 1 ? "" : "s"} cargado${count === 1 ? "" : "s"} en el viaje.` };
}

export async function bajarEnvio(envioId: string) {
  await requerirUsuario(ROLES_GESTION);
  const envio = await db.envio.findUnique({ where: { id: envioId }, include: { viaje: { select: { estado: true } } } });
  if (!envio?.viajeId || !envio.viaje) return;
  if (envio.viaje.estado !== "PENDIENTE" && envio.viaje.estado !== "ASIGNADO") return;
  await db.envio.update({ where: { id: envioId }, data: { viajeId: null } });
  revalidatePath(`/viajes/${envio.viajeId}`);
  revalidatePath("/envios");
}
