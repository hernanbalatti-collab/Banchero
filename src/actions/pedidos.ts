"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TipoPedido } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirCliente, requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { hoy } from "@/lib/format";
import {
  checkbox,
  datosForm,
  enteroOpcional,
  errorValidacion,
  fecha,
  importe,
  siValidos,
  texto,
  textoOpcional,
  type EstadoForm,
} from "@/lib/validacion";

const pesoOpcional = z.preprocess(
  (v) => (v === "" || v == null ? null : String(v).replace(",", ".")),
  z.coerce.number({ error: "Peso inválido" }).min(0, "No puede ser negativo").nullable(),
);

const esquemaFlete = z
  .object({
    origen: texto,
    destino: texto,
    fechaCarga: fecha,
    descripcion: texto,
    pesoKg: pesoOpcional,
    observaciones: textoOpcional,
  })
  .refine((v) => v.fechaCarga >= hoy(), {
    path: ["fechaCarga"],
    message: "No puede ser una fecha pasada",
    ...siValidos("fechaCarga"),
  });

const esquemaEncomienda = z
  .object({
    depositoOrigenId: texto,
    depositoDestinoId: texto,
    destinatarioNombre: texto,
    destinatarioTelefono: textoOpcional,
    entregaDomicilio: checkbox,
    direccionEntrega: textoOpcional,
    descripcion: texto,
    bultos: enteroOpcional.refine((b) => b == null || b >= 1, "Mínimo 1 bulto"),
    pesoKg: pesoOpcional,
    valorDeclarado: z.preprocess((v) => (v === "" ? undefined : v), importe.optional()),
    observaciones: textoOpcional,
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

/** El cliente carga un pedido desde el portal. */
export async function crearPedido(tipo: TipoPedido, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirCliente();
  const valores = datosForm(formData);
  const r = (tipo === "FLETE" ? esquemaFlete : esquemaEncomienda).safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);

  if ("depositoOrigenId" in r.data) {
    const n = await db.deposito.count({ where: { id: { in: [r.data.depositoOrigenId, r.data.depositoDestinoId] } } });
    if (n !== 2) return { mensaje: "Elegí depósitos válidos.", valores };
  }

  const pedido = await db.$transaction(async (tx) => {
    const ultimo = await tx.pedido.aggregate({ _max: { numero: true } });
    return tx.pedido.create({
      data: {
        ...r.data,
        tipo,
        numero: (ultimo._max.numero ?? 0) + 1,
        // Siempre el cliente del usuario, nunca uno que venga del formulario
        clienteId: usuario.clienteId,
        creadoPorId: usuario.id,
      },
    });
  });

  revalidatePath("/portal", "layout");
  revalidatePath("/pedidos");
  redirect(`/portal/pedidos/${pedido.id}`);
}

/** El cliente cancela un pedido que todavía no se revisó. */
export async function cancelarPedido(id: string) {
  const { clienteId } = await requerirCliente();
  await db.pedido.updateMany({ where: { id, clienteId, estado: "PENDIENTE" }, data: { estado: "CANCELADO" } });
  revalidatePath("/portal", "layout");
  revalidatePath("/pedidos");
}

const esquemaRechazo = z.object({ respuesta: texto });

/** La empresa rechaza un pedido; el motivo lo ve el cliente. */
export async function rechazarPedido(id: string, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquemaRechazo.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);

  const { count } = await db.pedido.updateMany({
    where: { id, estado: "PENDIENTE" },
    data: { estado: "RECHAZADO", respuesta: r.data.respuesta, revisadoPorId: usuario.id, fechaRevision: new Date() },
  });
  if (count === 0) return { mensaje: "El pedido ya no está pendiente.", valores };

  revalidatePath("/pedidos", "layout");
  revalidatePath("/portal", "layout");
  return { ok: true, mensaje: "Pedido rechazado." };
}
