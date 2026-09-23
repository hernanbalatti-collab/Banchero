import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormChofer } from "../form-chofer";

export const metadata: Metadata = { title: "Nuevo chofer" };

export default async function PaginaNuevoChofer() {
  await requerirUsuario(ROLES_GESTION);
  return (
    <>
      <Encabezado titulo="Nuevo chofer" />
      <FormChofer />
    </>
  );
}
