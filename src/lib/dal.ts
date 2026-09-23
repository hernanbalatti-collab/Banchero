// Capa de acceso: toda página o acción protegida pasa por acá.
// A diferencia del proxy (chequeo optimista de la cookie), esto verifica
// contra la base que el usuario siga existiendo y activo.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE_SESION, verificarSesion } from "@/lib/jwt";
import type { Rol } from "@/generated/prisma/enums";

export type UsuarioActual = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  choferId: string | null;
  clienteId: string | null;
};

export const getUsuarioActual = cache(async (): Promise<UsuarioActual | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) return null;

  const usuario = await db.usuario.findUnique({
    where: { id: sesion.userId },
    select: { id: true, nombre: true, email: true, rol: true, choferId: true, clienteId: true, activo: true },
  });
  if (!usuario || !usuario.activo) return null;
  // Un usuario cliente sin empresa vinculada (p. ej. se borró el cliente) no ve nada
  if (usuario.rol === "CLIENTE" && !usuario.clienteId) return null;

  const { id, nombre, email, rol, choferId, clienteId } = usuario;
  return { id, nombre, email, rol, choferId, clienteId };
});

/** Exige sesión válida y, opcionalmente, uno de los roles indicados. */
export async function requerirUsuario(roles?: Rol[]) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (roles && !roles.includes(usuario.rol)) redirect(inicioSegunRol(usuario.rol));
  return usuario;
}

/** Exige un usuario del portal de clientes y devuelve el cliente al que pertenece. */
export async function requerirCliente() {
  const usuario = await requerirUsuario(["CLIENTE"]);
  return { ...usuario, clienteId: usuario.clienteId! };
}

/** Roles con acceso a la gestión (todo excepto los portales del chofer y del cliente). */
export const ROLES_GESTION: Rol[] = ["ADMIN", "OPERADOR"];

export function esGestion(rol: Rol) {
  return ROLES_GESTION.includes(rol);
}

/** Pantalla de inicio de cada rol. */
export function inicioSegunRol(rol: Rol) {
  return rol === "CHOFER" ? "/mis-viajes" : rol === "CLIENTE" ? "/portal" : "/";
}
