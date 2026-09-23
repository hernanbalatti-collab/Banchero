import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormCliente } from "../form-cliente";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function PaginaEditarCliente({ params }: PageProps<"/clientes/[id]">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const cliente = await db.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  return (
    <>
      <Encabezado titulo={cliente.razonSocial} subtitulo={`CUIT ${cliente.cuit}`} />
      <FormCliente cliente={cliente} />
    </>
  );
}
