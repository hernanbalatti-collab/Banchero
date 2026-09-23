"use server";

import bcrypt from "bcryptjs";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Rol } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/dal";
import { checkbox, datosForm, email, errorValidacion, esDuplicado, siValidos, texto, textoOpcional, type EstadoForm } from "@/lib/validacion";

const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[a-zA-Z]/, "Debe incluir al menos una letra")
  .regex(/[0-9]/, "Debe incluir al menos un número");

const esquema = z
  .object({
    nombre: texto,
    email,
    rol: z.enum(Rol),
    choferId: textoOpcional,
    activo: checkbox,
    // Opcional al editar: vacío = no cambiar
    password: z.preprocess((v) => (v === "" ? undefined : v), password.optional()),
  })
  .refine((v) => v.rol !== "CHOFER" || v.choferId, {
    path: ["choferId"],
    message: "Un usuario chofer debe estar vinculado a un legajo",
    ...siValidos("rol", "choferId"),
  });

export async function guardarUsuario(id: string | null, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const actual = await requerirUsuario(["ADMIN"]);
  const valores = datosForm(formData);
  const r = esquema.safeParse(valores);
  // No devolvemos la contraseña al formulario
  const valoresSeguros = { ...valores };
  delete valoresSeguros.password;
  if (!r.success) return errorValidacion(r.error, valoresSeguros);
  const { password: nueva, ...datos } = r.data;
  if (datos.rol !== "CHOFER") datos.choferId = null;

  if (id === actual.id && (datos.rol !== "ADMIN" || !datos.activo)) {
    return { mensaje: "No podés quitarte el rol de administrador ni desactivarte a vos mismo.", valores: valoresSeguros };
  }
  if (!id && !nueva) {
    return { errores: { password: ["La contraseña es obligatoria para usuarios nuevos"] }, valores: valoresSeguros };
  }

  const passwordHash = nueva ? await bcrypt.hash(nueva, 10) : undefined;
  try {
    if (id) await db.usuario.update({ where: { id }, data: { ...datos, passwordHash } });
    else await db.usuario.create({ data: { ...datos, passwordHash: passwordHash! } });
  } catch (e) {
    if (esDuplicado(e)) {
      const campo = String((e as { meta?: { target?: unknown } }).meta?.target ?? "").includes("chofer") ? "choferId" : "email";
      const mensaje = campo === "email" ? "Ya existe un usuario con ese email" : "Ese chofer ya tiene un usuario";
      return { errores: { [campo]: [mensaje] }, valores: valoresSeguros };
    }
    throw e;
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
