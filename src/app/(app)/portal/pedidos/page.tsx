import type { Metadata } from "next";
import { AccionesPedido, INCLUDE_PEDIDO, TablaPedidos } from "@/components/pedidos";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";

export const metadata: Metadata = { title: "Mis pedidos" };

export default async function PaginaMisPedidos() {
  const { clienteId } = await requerirCliente();
  const pedidos = await db.pedido.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: INCLUDE_PEDIDO,
  });

  return (
    <>
      <Encabezado
        titulo="Mis pedidos"
        subtitulo="Pedí un flete o avisanos de una encomienda: te confirmamos desde Expreso Banchero."
        acciones={<AccionesPedido />}
      />
      <Tarjeta sinPadding>
        {pedidos.length === 0 ? (
          <Vacio>Todavía no hiciste pedidos.</Vacio>
        ) : (
          <TablaPedidos pedidos={pedidos} base="/portal/pedidos" />
        )}
      </Tarjeta>
    </>
  );
}
