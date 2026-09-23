import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { iniciarSesion } from "@/actions/auth";
import { BotonEnviar, Entrada, Form } from "@/components/form";
import { BotonLink } from "@/components/ui";
import { getUsuarioActual } from "@/lib/dal";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaLogin() {
  const usuario = await getUsuarioActual();
  if (usuario) redirect(usuario.rol === "CHOFER" ? "/mis-viajes" : "/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-tierra px-4 py-10">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <Image
          src="/marca/encabezado.jpg"
          alt="Expreso Banchero: camión en ruta"
          width={1583}
          height={536}
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full"
        />
        <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Ingresá a tu cuenta</h1>
            <p className="mb-6 text-sm text-stone-500">Sistema de gestión de viajes y envíos</p>
            <Form accion={iniciarSesion}>
              <Entrada name="email" etiqueta="Email" type="email" autoComplete="email" autoFocus />
              <Entrada name="password" etiqueta="Contraseña" type="password" autoComplete="current-password" />
              <div className="pt-1 [&>button]:w-full">
                <BotonEnviar>Ingresar</BotonEnviar>
              </div>
            </Form>
          </div>
          <aside className="flex flex-col justify-center rounded-xl bg-marca-50 p-6">
            <h2 className="text-base font-semibold text-stone-900">¿Enviaste o esperás un paquete?</h2>
            <p className="mt-2 mb-5 text-sm text-stone-600">
              Con el código de tu comprobante podés ver dónde está, sin necesidad de cuenta.
            </p>
            <BotonLink href="/seguimiento" variante="secundario" className="self-start">
              Seguí tu envío
            </BotonLink>
          </aside>
        </div>
      </div>
    </main>
  );
}
