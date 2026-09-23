import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bajarEnvio, cargarEnvios } from "@/actions/envios";
import { agregarGasto, eliminarGasto, registrarNovedad } from "@/actions/viajes";
import { AreaTexto, BotonEnviar, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Dato, Encabezado, Estado, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { esGestion, requerirUsuario } from "@/lib/dal";
import { aInputFecha, aNumero, fecha, fechaHora, hoy, moneda, numero, numeroFactura, numeroViaje } from "@/lib/format";
import { ESTADO_ENVIO, ESTADO_VIAJE, opciones, TIPO_GASTO } from "@/lib/labels";
import { ACCION_ESTADO, puedeVerViaje, transicionesPermitidas } from "@/lib/viajes";

export const metadata: Metadata = { title: "Viaje" };

export default async function PaginaViaje({ params }: PageProps<"/viajes/[id]">) {
  const usuario = await requerirUsuario();
  const { id } = await params;
  const viaje = await db.viaje.findUnique({
    where: { id },
    include: {
      cliente: true,
      chofer: true,
      vehiculo: true,
      acoplado: true,
      factura: true,
      depositoOrigen: true,
      depositoDestino: true,
      envios: { orderBy: { createdAt: "asc" }, include: { cliente: { select: { razonSocial: true } } } },
      gastos: { orderBy: { fecha: "desc" } },
      eventos: { orderBy: { createdAt: "desc" }, include: { usuario: { select: { nombre: true } } } },
    },
  });
  if (!viaje || !puedeVerViaje(usuario, viaje)) notFound();

  const gestion = esGestion(usuario.rol);
  const transiciones = transicionesPermitidas(viaje.estado, usuario.rol);
  const editable = gestion && !viaje.facturaId && ["PENDIENTE", "ASIGNADO", "EN_TRANSITO"].includes(viaje.estado);
  const entreDepositos = !!(viaje.depositoOrigenId && viaje.depositoDestinoId);
  const antesDeSalir = viaje.estado === "PENDIENTE" || viaje.estado === "ASIGNADO";
  // Encomiendas esperando en el depósito de origen con el mismo destino, para cargar
  const disponibles =
    gestion && entreDepositos && antesDeSalir
      ? await db.envio.findMany({
          where: {
            estado: "RECIBIDO",
            viajeId: null,
            depositoOrigenId: viaje.depositoOrigenId!,
            depositoDestinoId: viaje.depositoDestinoId!,
          },
          orderBy: { createdAt: "asc" },
          include: { cliente: { select: { razonSocial: true } } },
        })
      : [];
  const totalGastos = viaje.gastos.reduce((s, g) => s + aNumero(g.monto), 0);
  const totalEncomiendas = viaje.envios.filter((e) => e.estado !== "CANCELADO").reduce((s, e) => s + aNumero(e.precio), 0);
  const margen = aNumero(viaje.tarifa) + totalEncomiendas - totalGastos;
  const cerrado = viaje.estado === "ENTREGADO" || viaje.estado === "CANCELADO";

  return (
    <>
      <Encabezado
        titulo={
          <span className="flex items-center gap-3">
            Viaje {numeroViaje(viaje.numero)} <Estado par={ESTADO_VIAJE[viaje.estado]} />
          </span>
        }
        subtitulo={`${viaje.origen} → ${viaje.destino}`}
        acciones={
          <>
            <BotonLink href={gestion ? "/viajes" : "/mis-viajes"} variante="secundario">
              Volver
            </BotonLink>
            {editable && <BotonLink href={`/viajes/${viaje.id}/editar`}>Editar</BotonLink>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tarjeta titulo="Datos del viaje">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Dato etiqueta="Cliente">
                {!viaje.cliente ? (
                  "Encomiendas entre depósitos"
                ) : gestion ? (
                  <Link href={`/clientes/${viaje.cliente.id}`} className="text-marca-700 hover:underline">
                    {viaje.cliente.razonSocial}
                  </Link>
                ) : (
                  viaje.cliente.razonSocial
                )}
              </Dato>
              <Dato etiqueta="Fecha de carga">{fecha(viaje.fechaCarga)}</Dato>
              <Dato etiqueta="Entrega">
                {viaje.fechaEntrega ? fecha(viaje.fechaEntrega) : `Estimada ${fecha(viaje.fechaEntregaEstimada)}`}
              </Dato>
              <Dato etiqueta="Carga">{viaje.descripcionCarga}</Dato>
              <Dato etiqueta="Peso">{viaje.pesoKg ? `${numero(viaje.pesoKg)} kg` : "—"}</Dato>
              <Dato etiqueta="Km estimados">{viaje.kmEstimados ? numero(viaje.kmEstimados) : "—"}</Dato>
              <Dato etiqueta="Chofer">
                {viaje.chofer ? `${viaje.chofer.apellido}, ${viaje.chofer.nombre}` : "Sin asignar"}
                {viaje.chofer?.telefono && <div className="text-xs text-stone-500">{viaje.chofer.telefono}</div>}
              </Dato>
              <Dato etiqueta="Vehículo">
                {viaje.vehiculo ? (
                  <span className="font-mono">{viaje.vehiculo.patente}</span>
                ) : (
                  "Sin asignar"
                )}
                {viaje.acoplado && <span className="font-mono"> + {viaje.acoplado.patente}</span>}
              </Dato>
              <Dato etiqueta="Carta de porte / remito">
                {[viaje.cartaPorte, viaje.remito].filter(Boolean).join(" · ") || "—"}
              </Dato>
            </dl>
            {viaje.observaciones && (
              <p className="mt-5 whitespace-pre-line rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{viaje.observaciones}</p>
            )}
          </Tarjeta>

          {entreDepositos && (
            <Tarjeta
              titulo={`Encomiendas a bordo (${viaje.envios.length})`}
              acciones={<span className="text-xs text-stone-500">{viaje.envios.reduce((s, e) => s + e.bultos, 0)} bultos</span>}
              sinPadding
            >
              {viaje.envios.length === 0 ? (
                <Vacio>Todavía no se cargaron encomiendas.</Vacio>
              ) : (
                <Tabla>
                  <thead>
                    <tr>
                      <Th>Código</Th>
                      <Th>Remitente → destinatario</Th>
                      <Th derecha>Bultos</Th>
                      <Th>Estado</Th>
                      {gestion && antesDeSalir && <Th />}
                    </tr>
                  </thead>
                  <tbody>
                    {viaje.envios.map((e) => (
                      <tr key={e.id}>
                        <Td>
                          {gestion ? (
                            <Link href={`/envios/${e.id}`} className="whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900">
                              {e.codigo}
                            </Link>
                          ) : (
                            <span className="whitespace-nowrap font-mono">{e.codigo}</span>
                          )}
                        </Td>
                        <Td>
                          {e.cliente.razonSocial} <span className="text-stone-400">→</span> {e.destinatarioNombre}
                          <div className="text-xs text-stone-500">{e.descripcion}</div>
                        </Td>
                        <Td derecha>{e.bultos}</Td>
                        <Td>
                          <Estado par={ESTADO_ENVIO[e.estado]} />
                        </Td>
                        {gestion && antesDeSalir && (
                          <Td derecha>
                            <form action={bajarEnvio.bind(null, e.id)}>
                              <BotonEnviar variante="secundario" chico>
                                Bajar
                              </BotonEnviar>
                            </form>
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              )}
              {/* Montado aunque no haya disponibles, para que se vea el resultado de la carga */}
              {gestion && antesDeSalir && (
                <div className="border-t border-stone-100 p-5">
                  <Form accion={cargarEnvios.bind(null, viaje.id)} className="space-y-3">
                    <p className="text-sm font-medium text-stone-800">
                      Esperando en depósito {viaje.depositoOrigen?.nombre} con destino {viaje.depositoDestino?.nombre}
                    </p>
                    {disponibles.length === 0 && <p className="text-sm text-stone-500">No hay encomiendas esperando.</p>}
                    <ul className="max-h-72 space-y-1 overflow-y-auto">
                      {disponibles.map((e) => (
                        <li key={e.id}>
                          <label className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                            <input
                              type="checkbox"
                              name="envios"
                              value={e.id}
                              defaultChecked
                              className="mt-0.5 size-4 rounded border-stone-300 text-marca-600"
                            />
                            <span>
                              <span className="font-mono font-medium">{e.codigo}</span> · {e.cliente.razonSocial} →{" "}
                              {e.destinatarioNombre}
                              <span className="block text-xs text-stone-500">
                                {e.bultos} bulto{e.bultos === 1 ? "" : "s"} · {e.descripcion}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {disponibles.length > 0 && <BotonEnviar>Cargar seleccionadas</BotonEnviar>}
                  </Form>
                </div>
              )}
            </Tarjeta>
          )}

          <Tarjeta titulo="Gastos del viaje" sinPadding>
            {viaje.gastos.length === 0 ? (
              <Vacio>Sin gastos registrados.</Vacio>
            ) : (
              <Tabla>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Tipo</Th>
                    <Th>Detalle</Th>
                    <Th derecha>Monto</Th>
                    {gestion && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {viaje.gastos.map((g) => (
                    <tr key={g.id}>
                      <Td className="tabular-nums">{fecha(g.fecha)}</Td>
                      <Td>{TIPO_GASTO[g.tipo]}</Td>
                      <Td>{g.descripcion ?? "—"}</Td>
                      <Td derecha>{moneda(g.monto)}</Td>
                      {gestion && (
                        <Td derecha>
                          <form action={eliminarGasto.bind(null, g.id)}>
                            <BotonEnviar variante="peligro" chico confirmar="¿Eliminar este gasto?">
                              Eliminar
                            </BotonEnviar>
                          </form>
                        </Td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <Td className="font-semibold text-stone-900">Total</Td>
                    <Td />
                    <Td />
                    <Td derecha className="font-semibold text-stone-900">
                      {moneda(totalGastos)}
                    </Td>
                    {gestion && <Td />}
                  </tr>
                </tbody>
              </Tabla>
            )}
            {viaje.estado !== "CANCELADO" && (
              <div className="border-t border-stone-100 p-5">
                <Form accion={agregarGasto.bind(null, viaje.id)} className="space-y-4">
                  <Grilla columnas={4}>
                    <Selector name="tipo" etiqueta="Tipo" valor="COMBUSTIBLE" opciones={opciones(TIPO_GASTO)} />
                    <Entrada name="monto" etiqueta="Monto (ARS)" type="number" min={0} step="0.01" />
                    <Entrada name="fecha" etiqueta="Fecha" type="date" valor={aInputFecha(hoy())} />
                    <Entrada name="descripcion" etiqueta="Detalle" placeholder="Opcional" />
                  </Grilla>
                  <BotonEnviar variante="secundario">Agregar gasto</BotonEnviar>
                </Form>
              </div>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-6">
          {gestion && (
            <Tarjeta titulo="Resultado">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Tarifa</dt>
                  <dd className="tabular-nums">{moneda(viaje.tarifa)}</dd>
                </div>
                {entreDepositos && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Encomiendas</dt>
                    <dd className="tabular-nums">{moneda(totalEncomiendas)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-stone-500">Gastos</dt>
                  <dd className="tabular-nums">− {moneda(totalGastos)}</dd>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-3 font-semibold">
                  <dt>Margen</dt>
                  <dd className={margen < 0 ? "tabular-nums text-red-600" : "tabular-nums text-stone-900"}>{moneda(margen)}</dd>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-3">
                  <dt className="text-stone-500">Factura</dt>
                  <dd>
                    {viaje.factura ? (
                      <Link href={`/facturacion/${viaje.factura.id}`} className="font-mono text-marca-700 hover:underline">
                        {numeroFactura(viaje.factura)}
                      </Link>
                    ) : viaje.estado === "ENTREGADO" && viaje.clienteId ? (
                      <Link href={`/facturacion/nueva?cliente=${viaje.clienteId}`} className="text-marca-700 hover:underline">
                        Facturar
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </Tarjeta>
          )}

          {!cerrado && (
            <Tarjeta titulo="Actualizar seguimiento">
              <Form accion={registrarNovedad.bind(null, viaje.id)} className="space-y-4">
                <Entrada name="ubicacion" etiqueta="Ubicación" placeholder="Ej: Ruta 5, km 210" />
                <AreaTexto name="nota" etiqueta="Nota" filas={2} />
                <div className="flex flex-wrap gap-2">
                  <BotonEnviar variante="secundario" name="estado" value="">
                    Registrar novedad
                  </BotonEnviar>
                  {transiciones.map((e) => (
                    <BotonEnviar
                      key={e}
                      name="estado"
                      value={e}
                      variante={e === "CANCELADO" ? "peligro" : "primario"}
                      confirmar={e === "CANCELADO" ? "¿Cancelar este viaje?" : undefined}
                    >
                      {ACCION_ESTADO[e]}
                    </BotonEnviar>
                  ))}
                </div>
                {viaje.estado === "PENDIENTE" && gestion && (
                  <p className="text-xs text-stone-500">Asigná chofer y vehículo (Editar) para poder iniciar el viaje.</p>
                )}
              </Form>
            </Tarjeta>
          )}

          <Tarjeta titulo="Historial">
            <ol className="space-y-4">
              {viaje.eventos.map((ev) => (
                <li key={ev.id} className="relative border-l-2 border-marca-200 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {ev.estado && <Estado par={ESTADO_VIAJE[ev.estado]} />}
                    <span className="text-xs text-stone-500">{fechaHora(ev.createdAt)}</span>
                  </div>
                  {ev.ubicacion && <p className="mt-1 text-sm font-medium text-stone-800">📍 {ev.ubicacion}</p>}
                  {ev.nota && <p className="mt-1 text-sm text-stone-700">{ev.nota}</p>}
                  {ev.usuario && <p className="mt-0.5 text-xs text-stone-400">{ev.usuario.nombre}</p>}
                </li>
              ))}
            </ol>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
