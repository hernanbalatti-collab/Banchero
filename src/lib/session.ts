import "server-only";
import { cookies } from "next/headers";
import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  firmarSesion,
  type SesionPayload,
} from "@/lib/jwt";

export async function crearSesion(payload: SesionPayload) {
  const token = await firmarSesion(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + DURACION_SESION_MS),
    sameSite: "lax",
    path: "/",
  });
}

export async function eliminarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESION);
}
