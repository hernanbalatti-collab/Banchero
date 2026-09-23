import type { Metadata } from "next";
import { crearFactura } from "@/actions/facturacion";
import { BotonEnviar, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, claseBoton, claseInput, Encabezado, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { aInputFecha, fecha, hoy, moneda, numeroViaje, sumarDias } from "@/lib/format";

export const metadata: Metadata = { title: "Nueva factura" };

export default async function PaginaNuevaFactura({ searchParams }: PageProps<"/facturacion/nueva">) {
  await requerirUsuario(ROLES_GESTION);
  const { cliente: clienteId } = await searchParams;

  // Solo clientes con viajes entregados pendientes de facturar
  const clientes = await db.cliente.findMany({
    where: { viajes: { some: { estado: "ENTREGADO", facturaId: null } } },
    orderBy: { razonSocial: "asc" },
    include: { _count: { select: { viajes: { where: { estado: "ENTREGADO", facturaId: null } } } } },
  });
  const cliente = typeof clienteId === "string" ? clientes.find((c) => c.id === clienteId) : undefined;
  const viajes = cliente
    ? await db.viaje.findMany({
        where: { clienteId: cliente.id, estado: "ENTREGADO", facturaId: null },
        orderBy: { fechaEntrega: "asc" },
      })
    : [];

  return (
    <>
      <Encabezado titulo="Nueva factura" subtitulo="Agrupá viajes entregados de un cliente en un comprobante." />

      <Tarjeta titulo="1. Cliente" className="mb-6 max-w-4xl">
        {clientes.length === 0 ? (
          <p className="text-sm text-stone-600">No hay viajes entregados pendientes de facturar.</p>
        ) : (
          <form className="flex flex-wrap items-end gap-3">
            <select name="cliente" defaultValue={cliente?.id ?? ""} className={`${claseInput} max-w-md`}>
              <option value="" disabled>
                Seleccionar cliente…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial} ({c._count.viajes} viaje{c._count.viajes === 1 ? "" : "s"})
                </option>
              ))}
            </select>
            <button type="submit" className={claseBoton("secundario")}>
              Ver viajes
            </button>
          </form>
        )}
      </Tarjeta>

      {cliente && (
        <Tarjeta titulo="2. Viajes y datos del comprobante" className="max-w-4xl">
          {viajes.length === 0 ? (
            <Vacio>Este cliente no tiene viajes para facturar.</Vacio>
          ) : (
            <Form accion={crearFactura}>
              <input type="hidden" name="clienteId" value={cliente.id} />
              <div className="-mx-5 border-y border-stone-100">
                <Tabla>
                  <thead>
                    <tr>
                      <Th />
                      <Th>Viaje</Th>
                      <Th>Entregado</Th>
                      <Th>Recorrido</Th>
                      <Th derecha>Tarifa</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {viajes.map((v) => (
                      <tr key={v.id}>
                        <Td>
                          <input
                            type="checkbox"
                            name="viajes"
                            value={v.id}
                            defaultChecked
                            aria-label={`Incluir ${numeroViaje(v.numero)}`}
                            className="size-4 rounded border-stone-300 text-marca-600"
                          />
                        </Td>
                        <Td className="font-mono">{numeroViaje(v.numero)}</Td>
                        <Td className="tabular-nums">{fecha(v.fechaEntrega)}</Td>
                        <Td>
                          {v.origen} → {v.destino}
                        </Td>
                        <Td derecha>{moneda(v.tarifa)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </div>
              <Grilla columnas={3}>
                <Selector
                  name="tipo"
                  etiqueta="Tipo de comprobante"
                  valor={cliente.condicionIva === "RESPONSABLE_INSCRIPTO" ? "A" : "B"}
                  opciones={[
                    { valor: "A", etiqueta: "Factura A" },
                    { valor: "B", etiqueta: "Factura B" },
                    { valor: "C", etiqueta: "Factura C" },
                  ]}
                  ayuda="A y B suman IVA 21 % sobre la tarifa."
                />
                <Entrada name="fecha" etiqueta="Fecha de emisión" type="date" valor={aInputFecha(hoy())} />
                <Entrada name="vencimiento" etiqueta="Vencimiento" type="date" valor={aInputFecha(sumarDias(hoy(), 30))} />
              </Grilla>
              <div className="flex gap-2 border-t border-stone-100 pt-5">
                <BotonEnviar>Emitir factura</BotonEnviar>
                <BotonLink href="/facturacion" variante="secundario">
                  Cancelar
                </BotonLink>
              </div>
            </Form>
          )}
        </Tarjeta>
      )}
    </>
  );
}
