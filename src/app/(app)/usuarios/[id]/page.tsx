import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/dal";
import { FormUsuario } from "../form-usuario";

export const metadata: Metadata = { title: "Editar usuario" };

export default async function PaginaEditarUsuario({ params }: PageProps<"/usuarios/[id]">) {
  await requerirUsuario(["ADMIN"]);
  const { id } = await params;
  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();

  return (
    <>
      <Encabezado titulo={usuario.nombre} subtitulo={usuario.email} />
      <FormUsuario usuario={usuario} />
    </>
  );
}
