"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CondicionIva } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import {
  checkbox,
  cuit,
  datosForm,
  emailOpcional,
  errorValidacion,
  esDuplicado,
  texto,
  textoOpcional,
  type EstadoForm,
} from "@/lib/validacion";

const esquema = z.object({
  razonSocial: texto,
  cuit,
  condicionIva: z.enum(CondicionIva),
  email: emailOpcional,
  telefono: textoOpcional,
  direccion: textoOpcional,
  activo: checkbox,
});

export async function guardarCliente(id: string | null, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirUsuario(ROLES_GESTION);
  const valores = datosForm(formData);
  const r = esquema.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, valores);

  try {
    if (id) await db.cliente.update({ where: { id }, data: r.data });
    else await db.cliente.create({ data: r.data });
  } catch (e) {
    if (esDuplicado(e)) return { errores: { cuit: ["Ya existe un cliente con ese CUIT"] }, valores };
    throw e;
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
