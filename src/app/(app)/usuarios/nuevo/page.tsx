import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { requerirUsuario } from "@/lib/dal";
import { FormUsuario } from "../form-usuario";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function PaginaNuevoUsuario() {
  await requerirUsuario(["ADMIN"]);
  return (
    <>
      <Encabezado titulo="Nuevo usuario" />
      <FormUsuario />
    </>
  );
}
