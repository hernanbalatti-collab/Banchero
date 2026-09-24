// Conversión de un pedido del portal en viaje (flete) o envío (encomienda).
import "server-only";
import type { TipoPedido } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

/** El pedido se resolvió en paralelo (otro operador lo aceptó o rechazó). */
export class PedidoYaRevisado extends Error {
  constructor() {
    super("El pedido ya fue revisado por otra persona.");
  }
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Verifica el pedido que se está convirtiendo. Devuelve null si no se indicó
 * ninguno, o un mensaje de error si no se puede usar.
 */
export async function verificarPedido(pedidoId: string | undefined, tipo: TipoPedido, clienteId: string | null) {
  if (!pedidoId) return null;
  const pedido = await db.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido || pedido.tipo !== tipo) return "El pedido no existe.";
  if (pedido.estado !== "PENDIENTE") return "El pedido ya fue revisado.";
  if (pedido.clienteId !== clienteId) return "El cliente no coincide con el del pedido.";
  return null;
}

/** Marca el pedido como aceptado dentro de la transacción que crea el viaje o envío. */
export async function aceptarPedido(
  tx: Tx,
  pedidoId: string,
  destino: { viajeId: string } | { envioId: string },
  usuarioId: string,
) {
  const { count } = await tx.pedido.updateMany({
    where: { id: pedidoId, estado: "PENDIENTE" },
    data: { ...destino, estado: "ACEPTADO", revisadoPorId: usuarioId, fechaRevision: new Date() },
  });
  // Se deshace la transacción: no queda un viaje o envío duplicado
  if (count === 0) throw new PedidoYaRevisado();
}
