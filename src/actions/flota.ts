"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EstadoVehiculo, TipoVehiculo } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import {
  checkbox,
  datosForm,
  enteroOpcional,
  errorValidacion,
  esDuplicado,
  fechaOpcional,
  patente,
  texto,
  textoOpcional,
  type EstadoForm,
} from "@/lib/validacion";

const esquemaVehiculo = z.object({
  patente,
  tipo: z.enum(TipoVehiculo),
  marca: texto,
  modelo: texto,
  anio: enteroOpcional.refine((a) => a == null || (a >= 1950 && a <= 2100), "Año inválido"),
  capacidadKg: enteroOpcional,
  estado: z.enum(EstadoVehiculo),
  vencimientoVtv: fechaOpcional,
  vencimientoSeguro: fechaOpcional,
});

export async function guardarVehiculo(id: string | null, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquemaVehiculo.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);

  try {
    if (id) await db.vehiculo.update({ where: { id }, data: r.data });
    else await db.vehiculo.create({ data: r.data });
  } catch (e) {
    if (esDuplicado(e)) return { errores: { patente: ["Ya existe un vehículo con esa patente"] }, valores };
    throw e;
  }

  revalidatePath("/flota/vehiculos");
  redirect("/flota/vehiculos");
}

const esquemaChofer = z.object({
  nombre: texto,
  apellido: texto,
  dni: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length >= 7 && s.length <= 8, "DNI inválido"),
  telefono: textoOpcional,
  categoriaLicencia: textoOpcional,
  vencimientoLicencia: fechaOpcional,
  vencimientoLinti: fechaOpcional,
  activo: checkbox,
});

export async function guardarChofer(id: string | null, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquemaChofer.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);

  try {
    if (id) await db.chofer.update({ where: { id }, data: r.data });
    else await db.chofer.create({ data: r.data });
  } catch (e) {
    if (esDuplicado(e)) return { errores: { dni: ["Ya existe un chofer con ese DNI"] }, valores };
    throw e;
  }

  revalidatePath("/flota/choferes");
  redirect("/flota/choferes");
}
