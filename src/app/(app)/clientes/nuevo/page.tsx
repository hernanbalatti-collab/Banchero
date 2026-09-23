import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormCliente } from "../form-cliente";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function PaginaNuevoCliente() {
  await requerirUsuario(ROLES_GESTION);
  return (
    <>
      <Encabezado titulo="Nuevo cliente" />
      <FormCliente />
    </>
  );
}
