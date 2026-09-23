import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { requerirUsuario } from "@/lib/dal";
import { FormUsuario } from "../form-usuario";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function PaginaNuevoUsuario({ searchParams }: PageProps<"/usuarios/nuevo">) {
  await requerirUsuario(["ADMIN"]);
  // Desde la ficha del cliente: ?cliente=<id> precarga el rol Cliente
  const { cliente } = await searchParams;
  return (
    <>
      <Encabezado titulo="Nuevo usuario" />
      <FormUsuario clienteInicial={typeof cliente === "string" ? cliente : undefined} />
    </>
  );
}
