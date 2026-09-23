// Firma y verificación del token de sesión. Sin dependencias de Next,
// para poder usarse tanto desde proxy.ts como desde el servidor.
import { SignJWT, jwtVerify } from "jose";
import type { Rol } from "@/generated/prisma/enums";

export const COOKIE_SESION = "sesion";
export const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;

export type SesionPayload = {
  userId: string;
  rol: Rol;
};

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta la variable de entorno SESSION_SECRET");
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(payload: SesionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(clave());
}

export async function verificarSesion(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SesionPayload>(token, clave(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}
