import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, claseInput, Encabezado, Estado, Filtros, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Vencimiento } from "@/components/vencimiento";
import { EstadoVehiculo } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { numero } from "@/lib/format";
import { ESTADO_VEHICULO, opciones, TIPO_VEHICULO } from "@/lib/labels";

export const metadata: Metadata = { title: "Vehículos" };

export default async function PaginaVehiculos({ searchParams }: PageProps<"/flota/vehiculos">) {
  await requerirUsuario(ROLES_GESTION);
  const { q, estado } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";
  const filtroEstado = Object.values(EstadoVehiculo).find((e) => e === estado);

  const vehiculos = await db.vehiculo.findMany({
    where: {
      estado: filtroEstado,
      ...(busqueda && {
        OR: [{ patente: { contains: busqueda.toUpperCase() } }, { marca: { contains: busqueda } }, { modelo: { contains: busqueda } }],
      }),
    },
    orderBy: { patente: "asc" },
  });

  return (
    <>
      <Encabezado
        titulo="Vehículos"
        subtitulo={`${vehiculos.length} unidad${vehiculos.length === 1 ? "" : "es"}`}
        acciones={<BotonLink href="/flota/vehiculos/nuevo">Nuevo vehículo</BotonLink>}
      />
      <Tarjeta sinPadding>
        <Filtros>
          <input name="q" defaultValue={busqueda} placeholder="Patente, marca o modelo" className={`${claseInput} max-w-xs`} />
          <select name="estado" defaultValue={filtroEstado ?? ""} className={`${claseInput} max-w-48`}>
            <option value="">Todos los estados</option>
            {opciones(ESTADO_VEHICULO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Filtros>
        {vehiculos.length === 0 ? (
          <Vacio>No hay vehículos que mostrar.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Patente</Th>
                <Th>Tipo</Th>
                <Th>Marca / modelo</Th>
                <Th derecha>Capacidad (kg)</Th>
                <Th>Estado</Th>
                <Th>VTV</Th>
                <Th>Seguro</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50">
                  <Td className="font-mono font-medium text-stone-900">{v.patente}</Td>
                  <Td>{TIPO_VEHICULO[v.tipo]}</Td>
                  <Td>
                    {v.marca} {v.modelo}
                    {v.anio && <span className="text-stone-500"> ({v.anio})</span>}
                  </Td>
                  <Td derecha>{numero(v.capacidadKg)}</Td>
                  <Td>
                    <Estado par={ESTADO_VEHICULO[v.estado]} />
                  </Td>
                  <Td>
                    <Vencimiento d={v.vencimientoVtv} />
                  </Td>
                  <Td>
                    <Vencimiento d={v.vencimientoSeguro} />
                  </Td>
                  <Td derecha>
                    <Link href={`/flota/vehiculos/${v.id}`} className="font-medium text-marca-600 hover:text-marca-800">
                      Editar
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
