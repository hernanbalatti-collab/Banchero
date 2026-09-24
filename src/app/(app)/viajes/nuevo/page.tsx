import type { Metadata } from "next";
import { Encabezado } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { numeroPedido } from "@/lib/format";
import { FormViaje } from "../form-viaje";

export const metadata: Metadata = { title: "Nuevo viaje" };

export default async function PaginaNuevoViaje({ searchParams }: PageProps<"/viajes/nuevo">) {
  await requerirUsuario(ROLES_GESTION);
  const { pedido: pedidoId } = await searchParams;
  const pedido =
    typeof pedidoId === "string"
      ? await db.pedido.findFirst({ where: { id: pedidoId, tipo: "FLETE", estado: "PENDIENTE" } })
      : null;
  return (
    <>
      <Encabezado
        titulo="Nuevo viaje"
        subtitulo={pedido && `A partir del pedido ${numeroPedido(pedido.numero)}: completá tarifa y asignación.`}
      />
      <FormViaje pedido={pedido ?? undefined} />
    </>
  );
}
