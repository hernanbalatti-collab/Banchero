"use server";

import bcrypt from "bcryptjs";
import * as z from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { inicioSegunRol } from "@/lib/dal";
import { crearSesion, eliminarSesion } from "@/lib/session";
import { datosForm, email, errorValidacion, type EstadoForm } from "@/lib/validacion";

const esquemaLogin = z.object({
  email,
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export async function iniciarSesion(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = datosForm(formData);
  const r = esquemaLogin.safeParse(valores);
  if (!r.success) return errorValidacion(r.error, { email: valores.email ?? "" });

  const usuario = await db.usuario.findUnique({ where: { email: r.data.email } });
  const valido = usuario?.activo && (await bcrypt.compare(r.data.password, usuario.passwordHash));
  if (!usuario || !valido) {
    // No revelamos si el email existe
    return { mensaje: "Email o contraseña incorrectos.", valores: { email: r.data.email } };
  }
  if (usuario.rol === "CLIENTE" && !usuario.clienteId) {
    return { mensaje: "Tu usuario no está vinculado a ningún cliente. Comunicate con Expreso Banchero.", valores: { email: r.data.email } };
  }

  await crearSesion({ userId: usuario.id, rol: usuario.rol });
  redirect(inicioSegunRol(usuario.rol));
}

export async function cerrarSesion() {
  await eliminarSesion();
  redirect("/login");
}
