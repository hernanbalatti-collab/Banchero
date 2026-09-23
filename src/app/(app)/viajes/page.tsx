import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, claseInput, Encabezado, Filtros, Tarjeta, Vacio } from "@/components/ui";
import { TablaViajes } from "@/components/tabla-viajes";
import { EstadoViaje } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { ESTADO_VIAJE, opciones } from "@/lib/labels";
import { ESTADOS_ACTIVOS } from "@/lib/viajes";

export const metadata: Metadata = { title: "Viajes" };

const POR_PAGINA = 25;

export default async function PaginaViajes({ searchParams }: PageProps<"/viajes">) {
  await requerirUsuario(ROLES_GESTION);
  const sp = await searchParams;
  const busqueda = typeof sp.q === "string" ? sp.q.trim() : "";
  // Por defecto se muestran los viajes activos
  const estado = typeof sp.estado === "string" ? sp.estado : "ACTIVOS";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.ViajeWhereInput = {
    estado:
      estado === "ACTIVOS"
        ? { in: ESTADOS_ACTIVOS }
        : Object.values(EstadoViaje).find((e) => e === estado),
  };
  if (busqueda) {
    const n = Number(busqueda.replace(/\D/g, ""));
    where.OR = [
      { origen: { contains: busqueda } },
      { destino: { contains: busqueda } },
      { cliente: { razonSocial: { contains: busqueda } } },
      { cartaPorte: { contains: busqueda } },
      ...(n ? [{ numero: n }] : []),
    ];
  }

  const [viajes, total] = await Promise.all([
    db.viaje.findMany({
      where,
      orderBy: [{ fechaCarga: "desc" }, { numero: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        cliente: { select: { razonSocial: true } },
        chofer: { select: { nombre: true, apellido: true } },
        vehiculo: { select: { patente: true } },
      },
    }),
    db.viaje.count({ where }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const enlacePagina = (p: number) => {
    const qs = new URLSearchParams({ ...(busqueda && { q: busqueda }), estado, pagina: String(p) });
    return `/viajes?${qs}`;
  };

  return (
    <>
      <Encabezado
        titulo="Viajes"
        subtitulo={`${total} viaje${total === 1 ? "" : "s"}`}
        acciones={<BotonLink href="/viajes/nuevo">Nuevo viaje</BotonLink>}
      />
      <Tarjeta sinPadding>
        <Filtros>
          <input
            name="q"
            defaultValue={busqueda}
            placeholder="N.º, cliente, origen, destino o CTG"
            className={`${claseInput} max-w-xs`}
          />
          <select name="estado" defaultValue={estado} className={`${claseInput} max-w-48`}>
            <option value="ACTIVOS">Activos</option>
            <option value="TODOS">Todos</option>
            {opciones(ESTADO_VIAJE).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Filtros>
        {viajes.length === 0 ? <Vacio>No hay viajes que coincidan con el filtro.</Vacio> : <TablaViajes viajes={viajes} />}
        {paginas > 1 && (
          <div className="flex items-center justify-between px-5 py-3 text-sm text-stone-600">
            <span>
              Página {pagina} de {paginas}
            </span>
            <div className="flex gap-3">
              {pagina > 1 && (
                <Link href={enlacePagina(pagina - 1)} className="font-medium text-marca-700 hover:text-marca-900">
                  ← Anterior
                </Link>
              )}
              {pagina < paginas && (
                <Link href={enlacePagina(pagina + 1)} className="font-medium text-marca-700 hover:text-marca-900">
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
