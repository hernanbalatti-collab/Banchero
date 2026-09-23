import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { TIPO_VEHICULO } from "@/lib/labels";
import { FormVehiculo } from "../form-vehiculo";

export const metadata: Metadata = { title: "Editar vehículo" };

export default async function PaginaEditarVehiculo({ params }: PageProps<"/flota/vehiculos/[id]">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const vehiculo = await db.vehiculo.findUnique({ where: { id } });
  if (!vehiculo) notFound();

  return (
    <>
      <Encabezado titulo={vehiculo.patente} subtitulo={`${TIPO_VEHICULO[vehiculo.tipo]} ${vehiculo.marca} ${vehiculo.modelo}`} />
      <FormVehiculo vehiculo={vehiculo} />
    </>
  );
}
