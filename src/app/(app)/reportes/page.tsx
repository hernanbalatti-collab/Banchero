import type { Metadata } from "next";
import { GraficoMensual } from "@/components/grafico-mensual";
import { claseBoton, claseInput, Encabezado, Kpi, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { aInputFecha, hoy, moneda, numero } from "@/lib/format";
import { TIPO_GASTO } from "@/lib/labels";
import { reporte, type Fila } from "@/lib/reportes";

export const metadata: Metadata = { title: "Reportes" };

function leerFecha(v: string | string[] | undefined) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null;
}

function porcentaje(margen: number, ingresos: number) {
  return ingresos ? `${Math.round((margen / ingresos) * 100)} %` : "—";
}

function TablaResultado({ titulo, filas, columna }: { titulo: string; filas: Fila[]; columna: string }) {
  return (
    <Tarjeta titulo={titulo} sinPadding>
      {filas.length === 0 ? (
        <Vacio>Sin datos en el período.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>{columna}</Th>
              <Th derecha>Viajes</Th>
              <Th derecha>Km</Th>
              <Th derecha>Ingresos</Th>
              <Th derecha>Gastos</Th>
              <Th derecha>Margen</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave}>
                <Td className="font-medium text-stone-900">{f.nombre}</Td>
                <Td derecha>{f.viajes}</Td>
                <Td derecha>{numero(f.km)}</Td>
                <Td derecha>{moneda(f.ingresos)}</Td>
                <Td derecha>{moneda(f.gastos)}</Td>
                <Td derecha>
                  {moneda(f.ingresos - f.gastos)}
                  <span className="ml-1 text-xs text-stone-500">({porcentaje(f.ingresos - f.gastos, f.ingresos)})</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Tarjeta>
  );
}

export default async function PaginaReportes({ searchParams }: PageProps<"/reportes">) {
  await requerirUsuario(ROLES_GESTION);
  const sp = await searchParams;
  const h = hoy();
  // Por defecto: los últimos 6 meses completos más el actual
  const desde = leerFecha(sp.desde) ?? new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 5, 1));
  const hasta = leerFecha(sp.hasta) ?? h;
  const r = await reporte(desde, hasta);
  const margen = r.total.ingresos - r.total.gastos;

  return (
    <>
      <Encabezado titulo="Reportes" subtitulo="Resultado de los viajes entregados en el período" />

      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-stone-700">
          Desde
          <input type="date" name="desde" defaultValue={aInputFecha(desde)} className={`${claseInput} mt-1`} />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Hasta
          <input type="date" name="hasta" defaultValue={aInputFecha(hasta)} className={`${claseInput} mt-1`} />
        </label>
        <button type="submit" className={claseBoton("secundario")}>
          Aplicar
        </button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi etiqueta="Viajes entregados" valor={numero(r.total.viajes)} detalle={`${numero(r.total.km)} km estimados`} />
        <Kpi etiqueta="Ingresos (sin IVA)" valor={moneda(r.total.ingresos)} />
        <Kpi etiqueta="Gastos de viaje" valor={moneda(r.total.gastos)} />
        <Kpi etiqueta="Margen" valor={moneda(margen)} detalle={`${porcentaje(margen, r.total.ingresos)} de los ingresos`} />
      </div>

      <div className="space-y-6">
        <Tarjeta titulo="Ingresos y gastos por mes">
          {r.total.viajes === 0 ? <Vacio>Sin viajes entregados en el período.</Vacio> : <GraficoMensual datos={r.mensual} />}
        </Tarjeta>

        <TablaResultado titulo="Por cliente" filas={r.clientes} columna="Cliente" />
        <div className="grid gap-6 xl:grid-cols-2">
          <TablaResultado titulo="Por vehículo" filas={r.vehiculos} columna="Patente" />
          <TablaResultado titulo="Por chofer" filas={r.choferes} columna="Chofer" />
        </div>

        <Tarjeta titulo="Gastos por tipo" sinPadding>
          {r.gastosPorTipo.length === 0 ? (
            <Vacio>Sin gastos en el período.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Tipo</Th>
                  <Th derecha>Monto</Th>
                  <Th derecha>% del total</Th>
                </tr>
              </thead>
              <tbody>
                {r.gastosPorTipo.map(([tipo, monto]) => (
                  <tr key={tipo}>
                    <Td className="font-medium text-stone-900">{TIPO_GASTO[tipo]}</Td>
                    <Td derecha>{moneda(monto)}</Td>
                    <Td derecha>{Math.round((monto / r.total.gastos) * 100)} %</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>

        <Tarjeta titulo="Detalle mensual" sinPadding>
          <Tabla>
            <thead>
              <tr>
                <Th>Mes</Th>
                <Th derecha>Ingresos</Th>
                <Th derecha>Gastos</Th>
                <Th derecha>Margen</Th>
              </tr>
            </thead>
            <tbody>
              {r.mensual.map((m) => (
                <tr key={m.mes}>
                  <Td>{m.mes}</Td>
                  <Td derecha>{moneda(m.ingresos)}</Td>
                  <Td derecha>{moneda(m.gastos)}</Td>
                  <Td derecha>{moneda(m.ingresos - m.gastos)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Tarjeta>
      </div>
    </>
  );
}
