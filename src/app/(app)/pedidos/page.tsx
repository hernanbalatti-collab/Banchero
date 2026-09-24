import type { Metadata } from "next";
import { INCLUDE_PEDIDO, TablaPedidos } from "@/components/pedidos";
import { claseInput, Encabezado, Filtros, Tarjeta, Vacio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { EstadoPedido, TipoPedido } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { ESTADO_PEDIDO, opciones, TIPO_PEDIDO } from "@/lib/labels";

export const metadata: Metadata = { title: "Pedidos" };

export default async function PaginaPedidos({ searchParams }: PageProps<"/pedidos">) {
  await requerirUsuario(ROLES_GESTION);
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" ? sp.estado : "PENDIENTE";
  const tipo = typeof sp.tipo === "string" ? sp.tipo : "";
  const busqueda = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: Prisma.PedidoWhereInput = {
    estado: Object.values(EstadoPedido).find((e) => e === estado),
    tipo: Object.values(TipoPedido).find((t) => t === tipo),
  };
  if (busqueda) where.cliente = { razonSocial: { contains: busqueda } };

  const pedidos = await db.pedido.findMany({
    where,
    // Los pendientes, del más viejo al más nuevo: se atienden por orden de llegada
    orderBy: { createdAt: estado === "PENDIENTE" ? "asc" : "desc" },
    take: 200,
    include: { ...INCLUDE_PEDIDO, cliente: { select: { razonSocial: true } } },
  });

  return (
    <>
      <Encabezado titulo="Pedidos de clientes" subtitulo="Fletes y encomiendas que los clientes cargan desde el portal" />
      <Tarjeta sinPadding>
        <Filtros>
          <input name="q" defaultValue={busqueda} placeholder="Cliente" className={`${claseInput} max-w-xs`} />
          <select name="estado" defaultValue={estado} className={`${claseInput} max-w-48`}>
            {opciones(ESTADO_PEDIDO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
            <option value="TODOS">Todos</option>
          </select>
          <select name="tipo" defaultValue={tipo} className={`${claseInput} max-w-48`}>
            <option value="">Fletes y encomiendas</option>
            {opciones(TIPO_PEDIDO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Filtros>
        {pedidos.length === 0 ? (
          <Vacio>{estado === "PENDIENTE" ? "No hay pedidos por revisar." : "No hay pedidos que coincidan con el filtro."}</Vacio>
        ) : (
          <TablaPedidos pedidos={pedidos} base="/pedidos" />
        )}
      </Tarjeta>
    </>
  );
}
