import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormViaje } from "../form-viaje";

export const metadata: Metadata = { title: "Nuevo viaje" };

export default async function PaginaNuevoViaje() {
  await requerirUsuario(ROLES_GESTION);
  return (
    <>
      <Encabezado titulo="Nuevo viaje" />
      <FormViaje />
    </>
  );
}
