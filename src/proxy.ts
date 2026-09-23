// Chequeo optimista: solo mira la cookie para redirigir rápido.
// La verificación real (usuario activo, rol) la hace lib/dal.ts, y es la
// página de login (no el proxy) la que redirige a quien ya tiene sesión,
// así un usuario desactivado con cookie vigente no queda en un bucle.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/jwt";

const RUTAS_PUBLICAS = ["/login", "/seguimiento"];

function esPublica(ruta: string) {
  return RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

export default async function proxy(req: NextRequest) {
  if (esPublica(req.nextUrl.pathname)) return NextResponse.next();

  const sesion = await verificarSesion(req.cookies.get(COOKIE_SESION)?.value);
  if (!sesion) return NextResponse.redirect(new URL("/login", req.nextUrl));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
