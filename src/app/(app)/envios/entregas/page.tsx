import type { Metadata } from "next";
import Link from "next/link";
import { claseBoton, claseInput, Encabezado, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { buscarEntregas, leerFiltros } from "@/lib/entregas";
import { aInputFecha, fechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Registro de entregas" };

const LIMITE = 300;

export default async function PaginaEntregas({ searchParams }: PageProps<"/envios/entregas">) {
  await requerirUsuario(ROLES_GESTION);
  const sp = await searchParams;
  const f = leerFiltros(sp);
  const [depositos, { entregas, total }] = await Promise.all([
    db.deposito.findMany({ orderBy: { nombre: "desc" } }),
    buscarEntregas(f, LIMITE),
  ]);

  const qs = new URLSearchParams({
    desde: aInputFecha(f.desde),
    hasta: aInputFecha(f.hasta),
    ...(f.deposito && { deposito: f.deposito }),
    ...(f.q && { q: f.q }),
  });

  return (
    <>
      <Encabezado
        titulo="Registro de entregas"
        subtitulo={`${total} envío${total === 1 ? "" : "s"} entregado${total === 1 ? "" : "s"} en el período`}
        acciones={
          <a href={`/envios/entregas/exportar?${qs}`} className={claseBoton("secundario")}>
            Exportar a Excel (CSV)
          </a>
        }
      />
      <Tarjeta sinPadding>
        <form className="flex flex-wrap items-end gap-3 border-b border-stone-100 px-5 py-4">
          <label className="text-sm font-medium text-stone-700">
            Desde
            <input type="date" name="desde" defaultValue={aInputFecha(f.desde)} className={`${claseInput} mt-1`} />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Hasta
            <input type="date" name="hasta" defaultValue={aInputFecha(f.hasta)} className={`${claseInput} mt-1`} />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Depósito de entrega
            <select name="deposito" defaultValue={f.deposito} className={`${claseInput} mt-1`}>
              <option value="">Todos</option>
              {depositos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-700">
            Buscar
            <input
              name="q"
              defaultValue={f.q}
              placeholder="Código, destinatario, DNI, quién entregó…"
              className={`${claseInput} mt-1 w-72`}
            />
          </label>
          <button type="submit" className={claseBoton("secundario")}>
            Filtrar
          </button>
        </form>
        {entregas.length === 0 ? (
          <Vacio>No hay entregas en el período.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Entregado</Th>
                <Th>Código</Th>
                <Th>Remitente → destinatario</Th>
                <Th>Modalidad</Th>
                <Th>Entregó</Th>
                <Th>Recibió</Th>
                <Th>Registró</Th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50">
                  <Td className="whitespace-nowrap tabular-nums">{fechaHora(e.fechaEntrega)}</Td>
                  <Td>
                    <Link href={`/envios/${e.id}`} className="whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900">
                      {e.codigo}
                    </Link>
                  </Td>
                  <Td>
                    {e.cliente.razonSocial} <span className="text-stone-400">→</span> {e.destinatarioNombre}
                    <div className="text-xs text-stone-500">
                      {e.depositoOrigen.nombre} → {e.depositoDestino.nombre}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">{e.entregaDomicilio ? "A domicilio" : "Retiro en depósito"}</Td>
                  <Td>{e.entregadoPor ?? "—"}</Td>
                  <Td className="min-w-36">
                    {e.recibidoPor ?? "—"}
                    {e.recibidoDni && <div className="text-xs text-stone-500">DNI {e.recibidoDni}</div>}
                  </Td>
                  <Td className="text-stone-500">{e.eventos[0]?.usuario?.nombre ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
        {total > LIMITE && (
          <p className="px-5 py-3 text-sm text-stone-500">
            Se muestran las {LIMITE} más recientes. Acotá el período o exportá el CSV para ver todas.
          </p>
        )}
      </Tarjeta>
    </>
  );
}
