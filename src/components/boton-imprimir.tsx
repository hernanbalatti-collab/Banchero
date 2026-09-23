"use client";

import { claseBoton } from "@/components/ui";

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={claseBoton("secundario")}>
      Imprimir
    </button>
  );
}
