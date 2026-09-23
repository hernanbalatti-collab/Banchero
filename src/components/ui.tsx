import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Tono } from "@/lib/labels";

export function cx(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(" ");
}

export function Encabezado({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-stone-500">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Tarjeta({
  titulo,
  acciones,
  children,
  className,
  sinPadding,
}: {
  titulo?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  sinPadding?: boolean;
}) {
  return (
    <section className={cx("rounded-xl border border-stone-200 bg-white shadow-sm", className)}>
      {(titulo || acciones) && (
        <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-800">{titulo}</h2>
          {acciones}
        </header>
      )}
      <div className={sinPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

const TONOS: Record<Tono, string> = {
  gris: "bg-stone-100 text-stone-700 ring-stone-200",
  azul: "bg-sky-50 text-sky-800 ring-sky-200",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  violeta: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Insignia({ tono = "gris", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONOS[tono],
      )}
    >
      {children}
    </span>
  );
}

/** Insignia a partir de una entrada [etiqueta, tono] de labels.ts */
export function Estado({ par }: { par: [string, Tono] }) {
  return <Insignia tono={par[1]}>{par[0]}</Insignia>;
}

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-marca-600 text-white hover:bg-marca-700 shadow-sm",
  secundario: "bg-white text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 shadow-sm",
  peligro: "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50",
  fantasma: "text-stone-600 hover:bg-stone-100",
};

export function claseBoton(variante: Variante = "primario", chico?: boolean) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    chico ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
    VARIANTES[variante],
  );
}

export function BotonLink({
  variante,
  chico,
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; chico?: boolean }) {
  return <Link className={cx(claseBoton(variante, chico), className)} {...props} />;
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, derecha }: { children?: ReactNode; derecha?: boolean }) {
  return (
    <th
      className={cx(
        "whitespace-nowrap border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500",
        derecha && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  derecha,
  className,
}: {
  children?: ReactNode;
  derecha?: boolean;
  className?: string;
}) {
  return (
    <td className={cx("border-b border-stone-100 px-4 py-3 align-middle text-stone-700", derecha && "text-right tabular-nums", className)}>
      {children}
    </td>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="px-5 py-12 text-center text-sm text-stone-500">{children}</div>;
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{etiqueta}</dt>
      <dd className="mt-1 text-sm text-stone-900">{children ?? "—"}</dd>
    </div>
  );
}

export function Kpi({
  etiqueta,
  valor,
  detalle,
  href,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  href?: string;
}) {
  const contenido = (
    <>
      <p className="text-sm font-medium text-stone-500">{etiqueta}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-stone-500">{detalle}</p>}
    </>
  );
  const clase = "block rounded-xl border border-stone-200 bg-white p-5 shadow-sm";
  return href ? (
    <Link href={href} className={cx(clase, "transition-colors hover:border-marca-300")}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

/** Formulario GET para filtrar listados por querystring. */
export function Filtros({ children }: { children: ReactNode }) {
  return (
    <form className="flex flex-wrap items-end gap-3 border-b border-stone-100 px-5 py-4">
      {children}
      <button type="submit" className={claseBoton("secundario")}>
        Filtrar
      </button>
    </form>
  );
}

export const claseInput =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-marca-600";
