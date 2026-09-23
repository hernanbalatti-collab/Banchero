import { Insignia } from "@/components/ui";
import { fecha, hoy } from "@/lib/format";

export const DIAS_AVISO_VENCIMIENTO = 30;

export function diasHasta(d: Date) {
  return Math.round((d.getTime() - hoy().getTime()) / 86_400_000);
}

/** Fecha de vencimiento con aviso si está vencida o por vencer. */
export function Vencimiento({ d }: { d: Date | null }) {
  if (!d) return <span className="text-stone-400">—</span>;
  const dias = diasHasta(d);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap tabular-nums">
      {fecha(d)}
      {dias < 0 ? (
        <Insignia tono="rojo">Vencido</Insignia>
      ) : dias <= DIAS_AVISO_VENCIMIENTO ? (
        <Insignia tono="ambar">{dias === 0 ? "Vence hoy" : `${dias} d`}</Insignia>
      ) : null}
    </span>
  );
}
