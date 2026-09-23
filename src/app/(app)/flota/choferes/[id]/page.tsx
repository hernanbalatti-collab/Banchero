import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormChofer } from "../form-chofer";

export const metadata: Metadata = { title: "Editar chofer" };

export default async function PaginaEditarChofer({ params }: PageProps<"/flota/choferes/[id]">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const chofer = await db.chofer.findUnique({ where: { id } });
  if (!chofer) notFound();

  return (
    <>
      <Encabezado titulo={`${chofer.apellido}, ${chofer.nombre}`} subtitulo={`DNI ${chofer.dni}`} />
      <FormChofer chofer={chofer} />
    </>
  );
}
