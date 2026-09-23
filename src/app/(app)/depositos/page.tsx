import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BotonImprimir } from "@/components/boton-imprimir";
import { cx, Encabezado, Insignia, Kpi, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { DIAS_DEMORA_DEPOSITO, diasDesde } from "@/lib/envios";
import { fechaHora, hoy } from "@/lib/format";

export const metadata: Metadata = { title: "Depósitos" };

type Fila = {
  id: string;
  codigo: string;
  desde: Date;
  remitente: string;
  destinatario: string;
  detalle: string;
  bultos: number;
  extra?: ReactNode;
};

function Antiguedad({ desde }: { desde: Date }) {
  const dias = diasDesde(desde);
  if (dias > DIAS_DEMORA_DEPOSITO) return <Insignia tono="ambar">{dias} días</Insignia>;
  return <span className="text-stone-600">{dias === 0 ? "Hoy" : `${dias} día${dias === 1 ? "" : "s"}`}</span>;
}

function TablaStock({ filas, desdeTitulo, destinoTitulo }: { filas: Fila[]; desdeTitulo: string; destinoTitulo: string }) {
  if (filas.length === 0) return <Vacio>No hay paquetes.</Vacio>;
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>Código</Th>
          <Th>{desdeTitulo}</Th>
          <Th>En depósito</Th>
          <Th>Remitente</Th>
          <Th>Destinatario</Th>
          <Th>{destinoTitulo}</Th>
          <Th derecha>Bultos</Th>
          {/* Columna vacía para tildar en el control físico impreso */}
          <Th>Control</Th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.id} className="break-inside-avoid">
            <Td>
              <Link href={`/envios/${f.id}`} className="whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900">
                {f.codigo}
              </Link>
            </Td>
            <Td className="whitespace-nowrap tabular-nums">{fechaHora(f.desde)}</Td>
            <Td>
              <Antiguedad desde={f.desde} />
            </Td>
            <Td>{f.remitente}</Td>
            <Td>{f.destinatario}</Td>
            <Td>
              {f.detalle}
              {f.extra}
            </Td>
            <Td derecha>{f.bultos}</Td>
            <Td>
              <span className="inline-block size-4 rounded border border-stone-400" aria-hidden />
            </Td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}

export default async function PaginaDepositos({ searchParams }: PageProps<"/depositos">) {
  await requerirUsuario(ROLES_GESTION);
  const { deposito: elegido } = await searchParams;
  const depositos = await db.deposito.findMany({ orderBy: { nombre: "desc" } });
  const deposito = depositos.find((d) => d.id === elegido) ?? depositos[0];
  if (!deposito) return <Vacio>No hay depósitos cargados.</Vacio>;

  const incluir = {
    cliente: { select: { razonSocial: true } },
    depositoOrigen: { select: { nombre: true } },
    depositoDestino: { select: { nombre: true } },
  } as const;

  const [porDespachar, paraEntregar, enReparto, entregadosHoy] = await Promise.all([
    db.envio.findMany({
      where: { estado: "RECIBIDO", depositoOrigenId: deposito.id },
      orderBy: { createdAt: "asc" },
      include: { ...incluir, viaje: { select: { id: true, numero: true } } },
    }),
    db.envio.findMany({
      where: { estado: "EN_DESTINO", depositoDestinoId: deposito.id },
      orderBy: { updatedAt: "asc" },
      // Llegada: el último evento «en depósito de destino»
      include: { ...incluir, eventos: { where: { estado: "EN_DESTINO" }, orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.envio.findMany({
      where: { estado: "EN_REPARTO", depositoDestinoId: deposito.id },
      orderBy: { updatedAt: "asc" },
      include: { ...incluir, repartidor: { select: { nombre: true, apellido: true } } },
    }),
    db.envio.count({
      where: { estado: "ENTREGADO", depositoDestinoId: deposito.id, fechaEntrega: { gte: new Date(hoy().getTime() + 3 * 3600_000) } },
    }),
  ]);

  const filasEntregar: Fila[] = paraEntregar
    .map((e) => ({
      id: e.id,
      codigo: e.codigo,
      desde: e.eventos[0]?.createdAt ?? e.updatedAt,
      remitente: e.cliente.razonSocial,
      destinatario: e.destinatarioNombre,
      detalle: e.entregaDomicilio ? "A domicilio" : "Retira en depósito",
      extra: e.entregaDomicilio && e.direccionEntrega && <div className="text-xs text-stone-500">{e.direccionEntrega}</div>,
      bultos: e.bultos,
    }))
    .sort((a, b) => a.desde.getTime() - b.desde.getTime());

  const filasDespachar: Fila[] = porDespachar.map((e) => ({
    id: e.id,
    codigo: e.codigo,
    desde: e.createdAt,
    remitente: e.cliente.razonSocial,
    destinatario: e.destinatarioNombre,
    detalle: e.depositoDestino.nombre,
    extra: e.viaje && <div className="text-xs text-stone-500">Cargado en V-{String(e.viaje.numero).padStart(5, "0")}</div>,
    bultos: e.bultos,
  }));

  const totalBultos = [...porDespachar, ...paraEntregar].reduce((s, e) => s + e.bultos, 0);
  const demorados = [...filasDespachar, ...filasEntregar].filter((f) => diasDesde(f.desde) > DIAS_DEMORA_DEPOSITO).length;

  return (
    <>
      <div className="no-imprimir">
        <Encabezado
          titulo="Depósitos"
          subtitulo="Paquetes que hay físicamente en cada depósito"
          acciones={
            <>
              <Link href="/envios/entregas" className="self-center text-sm font-medium text-marca-700 hover:text-marca-900">
                Registro de entregas
              </Link>
              <BotonImprimir />
            </>
          }
        />
        <nav className="mb-6 flex gap-2">
          {depositos.map((d) => (
            <Link
              key={d.id}
              href={`/depositos?deposito=${d.id}`}
              className={cx(
                "rounded-lg px-4 py-2 text-sm font-medium",
                d.id === deposito.id ? "bg-marca-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50",
              )}
            >
              {d.nombre}
            </Link>
          ))}
        </nav>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi etiqueta="Paquetes en depósito" valor={porDespachar.length + paraEntregar.length} detalle={`${totalBultos} bultos`} />
          <Kpi
            etiqueta={`Más de ${DIAS_DEMORA_DEPOSITO} días`}
            valor={demorados}
            detalle={demorados ? "Revisar: llevan varios días sin moverse" : "Sin demoras"}
          />
          <Kpi etiqueta="En reparto" valor={enReparto.length} detalle="Salieron de este depósito" />
          <Kpi etiqueta="Entregados hoy" valor={entregadosHoy} href={`/envios/entregas?deposito=${deposito.id}`} />
        </div>
      </div>

      {/* Encabezado de la planilla impresa */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-xl font-semibold">Control de depósito {deposito.nombre}</h1>
        <p className="text-sm">
          {fechaHora(new Date())} · {porDespachar.length + paraEntregar.length} paquetes, {totalBultos} bultos · Controló: ________________
        </p>
      </div>

      <div className="space-y-6">
        <Tarjeta titulo={`Por despachar (${porDespachar.length})`} sinPadding>
          <TablaStock filas={filasDespachar} desdeTitulo="Recibido" destinoTitulo="Destino" />
        </Tarjeta>
        <Tarjeta titulo={`Para entregar o retirar (${paraEntregar.length})`} sinPadding>
          <TablaStock filas={filasEntregar} desdeTitulo="Llegó" destinoTitulo="Entrega" />
        </Tarjeta>
        <Tarjeta titulo={`En reparto (${enReparto.length})`} sinPadding className="no-imprimir">
          {enReparto.length === 0 ? (
            <Vacio>No hay paquetes en reparto.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Destinatario</Th>
                  <Th>Dirección</Th>
                  <Th>Repartidor</Th>
                </tr>
              </thead>
              <tbody>
                {enReparto.map((e) => (
                  <tr key={e.id}>
                    <Td>
                      <Link href={`/envios/${e.id}`} className="whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900">
                        {e.codigo}
                      </Link>
                    </Td>
                    <Td>{e.destinatarioNombre}</Td>
                    <Td>{e.direccionEntrega}</Td>
                    <Td>{e.repartidor ? `${e.repartidor.apellido}, ${e.repartidor.nombre}` : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
