import type { Metadata } from "next";
import { crearEnvio } from "@/actions/envios";
import { AreaTexto, BotonEnviar, Casilla, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { aNumero, numeroPedido } from "@/lib/format";

export const metadata: Metadata = { title: "Recibir envío" };

export default async function PaginaNuevoEnvio({ searchParams }: PageProps<"/envios/nuevo">) {
  await requerirUsuario(ROLES_GESTION);
  const { pedido: pedidoId } = await searchParams;
  // Encomienda pre-cargada por el cliente en el portal
  const pedido =
    typeof pedidoId === "string"
      ? await db.pedido.findFirst({ where: { id: pedidoId, tipo: "ENCOMIENDA", estado: "PENDIENTE" } })
      : null;
  const [depositos, clientes] = await Promise.all([
    db.deposito.findMany({ orderBy: { nombre: "desc" } }),
    db.cliente.findMany({
      where: { OR: [{ activo: true }, { id: pedido?.clienteId }] },
      orderBy: { razonSocial: "asc" },
      select: { id: true, razonSocial: true },
    }),
  ]);
  const opcionesDeposito = depositos.map((d) => ({ valor: d.id, etiqueta: d.nombre }));

  return (
    <>
      <Encabezado
        titulo="Recibir envío"
        subtitulo={
          pedido
            ? `Encomienda pre-cargada por el cliente (pedido ${numeroPedido(pedido.numero)}): controlá los datos al recibirla y poné el precio.`
            : "Registrá la encomienda al recibirla en el depósito: se genera el código de seguimiento."
        }
      />
      <Tarjeta className="max-w-3xl">
        <Form accion={crearEnvio}>
          {pedido && <input type="hidden" name="pedidoId" value={pedido.id} />}
          <Grilla>
            <Selector
              name="clienteId"
              etiqueta="Remitente (cliente)"
              requerido
              valor={pedido?.clienteId}
              vacio="Seleccionar…"
              opciones={clientes.map((c) => ({ valor: c.id, etiqueta: c.razonSocial }))}
              className="sm:col-span-2"
            />
            <Selector name="depositoOrigenId" etiqueta="Recibido en" valor={pedido?.depositoOrigenId ?? depositos[0]?.id} opciones={opcionesDeposito} />
            <Selector name="depositoDestinoId" etiqueta="Destino" valor={pedido?.depositoDestinoId ?? depositos[1]?.id} opciones={opcionesDeposito} />
            <Entrada name="destinatarioNombre" etiqueta="Destinatario" valor={pedido?.destinatarioNombre} requerido />
            <Entrada name="destinatarioTelefono" etiqueta="Teléfono del destinatario" valor={pedido?.destinatarioTelefono} />
          </Grilla>
          <Casilla name="entregaDomicilio" etiqueta="Entrega a domicilio (si no, retira en el depósito de destino)" valor={pedido?.entregaDomicilio} />
          <Entrada name="direccionEntrega" etiqueta="Dirección de entrega" valor={pedido?.direccionEntrega} ayuda="Obligatoria si es a domicilio." />
          <AreaTexto name="descripcion" etiqueta="Contenido *" filas={2} valor={pedido?.descripcion} />
          <Grilla columnas={4}>
            <Entrada name="bultos" etiqueta="Bultos" type="number" min={1} valor={pedido?.bultos ?? 1} />
            <Entrada name="pesoKg" etiqueta="Peso (kg)" type="number" min={0} step="0.1" valor={pedido?.pesoKg} />
            <Entrada name="valorDeclarado" etiqueta="Valor declarado" type="number" min={0} step="0.01" valor={pedido?.valorDeclarado == null ? undefined : aNumero(pedido.valorDeclarado)} />
            <Entrada name="precio" etiqueta="Precio del envío *" type="number" min={0} step="0.01" />
          </Grilla>
          <div className="flex gap-2 border-t border-stone-100 pt-5">
            <BotonEnviar>Registrar y generar código</BotonEnviar>
            <BotonLink href={pedido ? `/pedidos/${pedido.id}` : "/envios"} variante="secundario">
              Cancelar
            </BotonLink>
          </div>
        </Form>
      </Tarjeta>
    </>
  );
}
