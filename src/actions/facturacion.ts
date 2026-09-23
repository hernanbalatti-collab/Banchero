"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { TipoFactura } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { hoy } from "@/lib/format";
import { datosForm, errorValidacion, fecha, fechaOpcional, siValidos, texto, type EstadoForm } from "@/lib/validacion";

const ALICUOTA_IVA = new Prisma.Decimal("0.21");
const PUNTO_VENTA = 1;

const esquema = z
  .object({
    clienteId: texto,
    tipo: z.enum(TipoFactura),
    fecha,
    vencimiento: fechaOpcional,
  })
  .refine((v) => !v.vencimiento || v.vencimiento >= v.fecha, {
    path: ["vencimiento"],
    message: "No puede ser anterior a la fecha de emisión",
    ...siValidos("fecha", "vencimiento"),
  });

export async function crearFactura(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquema.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);
  const idsViajes = [...new Set(formData.getAll("viajes").filter((v): v is string => typeof v === "string"))];
  if (idsViajes.length === 0) return { mensaje: "Seleccioná al menos un viaje.", valores };

  const { clienteId, tipo } = r.data;
  const factura = await db.$transaction(async (tx) => {
    // Se revalida dentro de la transacción: solo viajes entregados, del cliente y sin facturar
    const viajes = await tx.viaje.findMany({
      where: { id: { in: idsViajes }, clienteId, estado: "ENTREGADO", facturaId: null },
      select: { id: true, tarifa: true },
    });
    if (viajes.length !== idsViajes.length) return null;

    const subtotal = viajes.reduce((s, v) => s.add(v.tarifa), new Prisma.Decimal(0));
    // Factura C (emisor monotributista) no discrimina IVA
    const iva = tipo === "C" ? new Prisma.Decimal(0) : subtotal.mul(ALICUOTA_IVA).toDecimalPlaces(2);
    const ultimo = await tx.factura.aggregate({ where: { tipo, puntoVenta: PUNTO_VENTA }, _max: { numero: true } });

    return tx.factura.create({
      data: {
        ...r.data,
        puntoVenta: PUNTO_VENTA,
        numero: (ultimo._max.numero ?? 0) + 1,
        subtotal,
        iva,
        total: subtotal.add(iva),
        viajes: { connect: viajes.map((v) => ({ id: v.id })) },
      },
    });
  });

  if (!factura) {
    return { mensaje: "Algunos viajes ya no están disponibles para facturar. Recargá la página.", valores };
  }
  revalidatePath("/facturacion");
  revalidatePath("/viajes");
  redirect(`/facturacion/${factura.id}`);
}

export async function marcarCobrada(id: string) {
  await requerirUsuario(ROLES_GESTION);
  const factura = await db.factura.findUnique({ where: { id } });
  if (!factura) notFound();
  if (factura.estado !== "EMITIDA") return;
  await db.factura.update({ where: { id }, data: { estado: "PAGADA", fechaPago: hoy() } });
  revalidatePath("/", "layout");
}

/** Anula la factura y libera sus viajes para volver a facturarlos. */
export async function anularFactura(id: string) {
  await requerirUsuario(ROLES_GESTION);
  const factura = await db.factura.findUnique({ where: { id } });
  if (!factura) notFound();
  if (factura.estado === "ANULADA") return;
  await db.$transaction([
    db.viaje.updateMany({ where: { facturaId: id }, data: { facturaId: null } }),
    db.factura.update({ where: { id }, data: { estado: "ANULADA" } }),
  ]);
  revalidatePath("/", "layout");
}
