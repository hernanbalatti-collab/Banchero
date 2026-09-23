// Las fechas "de calendario" (carga, vencimientos, etc.) se guardan a
// medianoche UTC y se muestran en UTC para que no se corran un día.
// Los timestamps (eventos, altas) se muestran en hora de Argentina.

const ZONA_AR = "America/Argentina/Buenos_Aires";

const fmtMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});
const fmtNumero = new Intl.NumberFormat("es-AR");

type Numerico = number | string | { toString(): string } | null | undefined;

export function aNumero(v: Numerico): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export function moneda(v: Numerico) {
  return fmtMoneda.format(aNumero(v));
}

export function numero(v: Numerico) {
  return v == null ? "—" : fmtNumero.format(aNumero(v));
}

export function fecha(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export function fechaHora(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("es-AR", {
    timeZone: ZONA_AR,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Valor para un <input type="date">. */
export function aInputFecha(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Valor para un <input type="datetime-local">, en hora de Argentina. */
export function aInputFechaHora(d: Date) {
  // sv-SE da "AAAA-MM-DD HH:MM:SS"
  return d.toLocaleString("sv-SE", { timeZone: ZONA_AR }).slice(0, 16).replace(" ", "T");
}

/** Interpreta un "AAAA-MM-DDTHH:MM" como hora de Argentina (UTC−3, sin horario de verano). */
export function desdeInputFechaHora(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const d = new Date(`${s}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Hoy a medianoche UTC, según el calendario de Argentina. */
export function hoy() {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: ZONA_AR });
  return new Date(`${s}T00:00:00Z`);
}

export function sumarDias(d: Date, dias: number) {
  return new Date(d.getTime() + dias * 24 * 60 * 60 * 1000);
}

export function numeroFactura(f: { tipo: string; puntoVenta: number; numero: number }) {
  return `${f.tipo} ${String(f.puntoVenta).padStart(4, "0")}-${String(f.numero).padStart(8, "0")}`;
}

export function numeroViaje(n: number) {
  return `V-${String(n).padStart(5, "0")}`;
}
