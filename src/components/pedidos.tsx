// Detalle y listado de pedidos: los usan la gestión y el portal de clientes.
import Link from "next/link";
import { BotonLink, Dato, Estado, Tabla, Td, Th } from "@/components/ui";
import type { EstadoPedido, TipoPedido } from "@/generated/prisma/enums";
import { fecha, fechaHora, moneda, numero, numeroPedido } from "@/lib/format";
import { ESTADO_PEDIDO, TIPO_PEDIDO } from "@/lib/labels";

type PedidoResumen = {
  id: string;
  numero: number;
  tipo: TipoPedido;
  estado: EstadoPedido;
  createdAt: Date;
  descripcion: string;
  origen: string | null;
  destino: string | null;
  fechaCarga: Date | null;
  destinatarioNombre: string | null;
  depositoOrigen: { nombre: string } | null;
  depositoDestino: { nombre: string } | null;
  cliente?: { razonSocial: string };
};

export function recorridoPedido(p: Pick<PedidoResumen, "tipo" | "origen" | "destino" | "depositoOrigen" | "depositoDestino">) {
  return p.tipo === "FLETE"
    ? `${p.origen} → ${p.destino}`
    : `${p.depositoOrigen?.nombre ?? "—"} → ${p.depositoDestino?.nombre ?? "—"}`;
}

/** `base`: "/pedidos" en la gestión, "/portal/pedidos" en el portal. */
export function TablaPedidos({ pedidos, base }: { pedidos: PedidoResumen[]; base: string }) {
  const conCliente = pedidos.some((p) => p.cliente);
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>N.º</Th>
          <Th>Cargado</Th>
          {conCliente && <Th>Cliente</Th>}
          <Th>Tipo</Th>
          <Th>Recorrido</Th>
          <Th>Detalle</Th>
          <Th>Estado</Th>
        </tr>
      </thead>
      <tbody>
        {pedidos.map((p) => (
          <tr key={p.id} className="hover:bg-stone-50">
            <Td>
              <Link href={`${base}/${p.id}`} className="whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900">
                {numeroPedido(p.numero)}
              </Link>
            </Td>
            <Td className="tabular-nums">{fechaHora(p.createdAt)}</Td>
            {conCliente && <Td className="font-medium text-stone-900">{p.cliente?.razonSocial}</Td>}
            <Td>{TIPO_PEDIDO[p.tipo]}</Td>
            <Td className="whitespace-nowrap">{recorridoPedido(p)}</Td>
            <Td>
              {p.descripcion}
              <div className="text-xs text-stone-500">
                {p.tipo === "FLETE" ? `Carga ${fecha(p.fechaCarga)}` : `Para ${p.destinatarioNombre}`}
              </div>
            </Td>
            <Td>
              <Estado par={ESTADO_PEDIDO[p.estado]} />
            </Td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}

type PedidoCompleto = PedidoResumen & {
  pesoKg: number | null;
  destinatarioTelefono: string | null;
  entregaDomicilio: boolean;
  direccionEntrega: string | null;
  bultos: number | null;
  valorDeclarado: { toString(): string } | null;
  observaciones: string | null;
};

export function DatosPedido({ pedido: p }: { pedido: PedidoCompleto }) {
  return (
    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {p.tipo === "FLETE" ? (
        <>
          <Dato etiqueta="Origen">{p.origen}</Dato>
          <Dato etiqueta="Destino">{p.destino}</Dato>
          <Dato etiqueta="Fecha de carga pedida">{fecha(p.fechaCarga)}</Dato>
          <Dato etiqueta="Peso">{p.pesoKg == null ? null : `${numero(p.pesoKg)} kg`}</Dato>
          <div className="sm:col-span-2">
            <Dato etiqueta="Carga">{p.descripcion}</Dato>
          </div>
        </>
      ) : (
        <>
          <Dato etiqueta="Lo lleva al depósito">{p.depositoOrigen?.nombre}</Dato>
          <Dato etiqueta="Destino">{p.depositoDestino?.nombre}</Dato>
          <Dato etiqueta="Destinatario">
            {p.destinatarioNombre}
            {p.destinatarioTelefono && <span className="text-stone-500"> · {p.destinatarioTelefono}</span>}
          </Dato>
          <Dato etiqueta="Entrega">
            {p.entregaDomicilio ? `A domicilio: ${p.direccionEntrega}` : `Retira en el depósito ${p.depositoDestino?.nombre ?? ""}`}
          </Dato>
          <Dato etiqueta="Contenido">{p.descripcion}</Dato>
          <Dato etiqueta="Bultos / peso">
            {p.bultos ?? 1} bulto{(p.bultos ?? 1) === 1 ? "" : "s"}
            {p.pesoKg != null && ` · ${numero(p.pesoKg)} kg`}
          </Dato>
          <Dato etiqueta="Valor declarado">{p.valorDeclarado == null ? null : moneda(p.valorDeclarado)}</Dato>
        </>
      )}
      {p.observaciones && (
        <div className="sm:col-span-2">
          <Dato etiqueta="Observaciones del cliente">{p.observaciones}</Dato>
        </div>
      )}
    </dl>
  );
}

export const INCLUDE_PEDIDO = {
  depositoOrigen: { select: { nombre: true } },
  depositoDestino: { select: { nombre: true } },
} as const;

/** Botones del portal para cargar un pedido nuevo. */
export function AccionesPedido() {
  return (
    <>
      <BotonLink href="/portal/pedidos/nuevo?tipo=ENCOMIENDA" variante="secundario">
        Enviar encomienda
      </BotonLink>
      <BotonLink href="/portal/pedidos/nuevo?tipo=FLETE">Pedir flete</BotonLink>
    </>
  );
}
