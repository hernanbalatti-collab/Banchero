"use client";

import { useState } from "react";

export type PuntoMensual = { mes: string; ingresos: number; gastos: number };

// Validados con el script de dataviz (CVD y contraste sobre blanco)
const SERIES = [
  { clave: "ingresos", etiqueta: "Ingresos", color: "#5b7f2e" },
  { clave: "gastos", etiqueta: "Gastos", color: "#0a6fa0" },
] as const;

const ANCHO = 720;
const ALTO = 260;
const M = { arriba: 12, derecha: 8, abajo: 28, izquierda: 64 };

const compacto = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
const moneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function escalaMax(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

/** Barras agrupadas de ingresos vs gastos por mes. */
export function GraficoMensual({ datos }: { datos: PuntoMensual[] }) {
  const [activo, setActivo] = useState<number | null>(null);

  const max = escalaMax(Math.max(...datos.flatMap((d) => [d.ingresos, d.gastos])));
  const altoPlot = ALTO - M.arriba - M.abajo;
  const anchoPlot = ANCHO - M.izquierda - M.derecha;
  const banda = anchoPlot / datos.length;
  const anchoBarra = Math.min(28, (banda * 0.6) / 2);
  const y = (v: number) => M.arriba + altoPlot - (v / max) * altoPlot;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const punto = activo != null ? datos[activo] : null;

  return (
    <figure>
      <div className="mb-3 flex gap-4 text-xs text-stone-600">
        {SERIES.map((s) => (
          <span key={s.clave} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.etiqueta}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Ingresos y gastos por mes">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={M.izquierda - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-500 text-[11px]">
                {compacto.format(t)}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const x0 = M.izquierda + i * banda;
            const centro = x0 + banda / 2;
            return (
              <g key={d.mes}>
                {activo === i && <rect x={x0} y={M.arriba} width={banda} height={altoPlot} fill="#f5f5f4" />}
                {SERIES.map((s, j) => {
                  const v = d[s.clave];
                  const alto = Math.max(0, y(0) - y(v));
                  // 2 px de separación entre las barras del grupo
                  const x = j === 0 ? centro - 1 - anchoBarra : centro + 1;
                  const r = Math.min(4, alto / 2, anchoBarra / 2);
                  return (
                    <path
                      key={s.clave}
                      fill={s.color}
                      d={`M${x},${y(0)} v${-(alto - r)} q0,${-r} ${r},${-r} h${anchoBarra - 2 * r} q${r},0 ${r},${r} v${alto - r} z`}
                    />
                  );
                })}
                <text x={centro} y={ALTO - 8} textAnchor="middle" className="fill-stone-500 text-[11px]">
                  {d.mes}
                </text>
                {/* Área de hover: toda la columna del mes */}
                <rect
                  x={x0}
                  y={M.arriba}
                  width={banda}
                  height={altoPlot}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.mes}: ingresos ${moneda.format(d.ingresos)}, gastos ${moneda.format(d.gastos)}`}
                  onPointerEnter={() => setActivo(i)}
                  onPointerLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(0)} y2={y(0)} stroke="#a8a29e" strokeWidth={1} />
        </svg>
        {punto && activo != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((M.izquierda + (activo + 0.5) * banda) / ANCHO) * 100}%` }}
          >
            <p className="mb-1 font-medium text-stone-500">{punto.mes}</p>
            {SERIES.map((s) => (
              <p key={s.clave} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-stone-600">
                  <span className="h-0.5 w-3" style={{ background: s.color }} />
                  {s.etiqueta}
                </span>
                <strong className="tabular-nums text-stone-900">{moneda.format(punto[s.clave])}</strong>
              </p>
            ))}
            <p className="mt-1 flex justify-between gap-3 border-t border-stone-100 pt-1">
              <span className="text-stone-600">Margen</span>
              <strong className="tabular-nums text-stone-900">{moneda.format(punto.ingresos - punto.gastos)}</strong>
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}
