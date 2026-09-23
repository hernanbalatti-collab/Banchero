import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormVehiculo } from "../form-vehiculo";

export const metadata: Metadata = { title: "Nuevo vehículo" };

export default async function PaginaNuevoVehiculo() {
  await requerirUsuario(ROLES_GESTION);
  return (
    <>
      <Encabezado titulo="Nuevo vehículo" />
      <FormVehiculo />
    </>
  );
}
