import { headers } from "next/headers";
import { Dato, Tarjeta } from "@/components/ui";
import type { Cliente, Deposito, Envio } from "@/generated/prisma/client";
import { fechaHora, moneda } from "@/lib/format";

/** Comprobante para el remitente: es lo que sale al imprimir. Lo usan la gestión y el portal de clientes. */
export async function ComprobanteEnvio({
  envio,
}: {
  envio: Envio & { cliente: Cliente; depositoOrigen: Deposito; depositoDestino: Deposito };
}) {
  const h = await headers();
  const urlSeguimiento = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/seguimiento/${envio.codigo}`;

  return (
    <Tarjeta titulo="Comprobante para el remitente" className="print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Código de seguimiento</p>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-wider text-stone-900">{envio.codigo}</p>
          <p className="mt-3 text-sm text-stone-600">
            Seguí tu envío en <span className="break-all font-medium text-stone-900">{urlSeguimiento}</span>
          </p>
        </div>
        <div className="text-right text-sm text-stone-600">
          <p>Recibido el {fechaHora(envio.createdAt)}</p>
          <p>en depósito {envio.depositoOrigen.nombre}</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-stone-100 pt-5 sm:grid-cols-3">
        <Dato etiqueta="Remitente">{envio.cliente.razonSocial}</Dato>
        <Dato etiqueta="Destinatario">
          {envio.destinatarioNombre}
          {envio.destinatarioTelefono && <div className="text-xs text-stone-500">{envio.destinatarioTelefono}</div>}
        </Dato>
        <Dato etiqueta="Entrega">
          {envio.entregaDomicilio ? envio.direccionEntrega : `Retira en depósito ${envio.depositoDestino.nombre}`}
        </Dato>
        <Dato etiqueta="Contenido">{envio.descripcion}</Dato>
        <Dato etiqueta="Bultos / peso">
          {envio.bultos} {envio.pesoKg != null && `· ${envio.pesoKg} kg`}
        </Dato>
        <Dato etiqueta="Precio">
          {moneda(envio.precio)}
          {envio.valorDeclarado && <div className="text-xs text-stone-500">Valor declarado {moneda(envio.valorDeclarado)}</div>}
        </Dato>
      </dl>
    </Tarjeta>
  );
}
