import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { numeroViaje } from "@/lib/format";
import { FormViaje } from "../../form-viaje";

export const metadata: Metadata = { title: "Editar viaje" };

export default async function PaginaEditarViaje({ params }: PageProps<"/viajes/[id]/editar">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const viaje = await db.viaje.findUnique({ where: { id } });
  if (!viaje) notFound();

  return (
    <>
      <Encabezado titulo={`Editar viaje ${numeroViaje(viaje.numero)}`} />
      <FormViaje viaje={viaje} />
    </>
  );
}
