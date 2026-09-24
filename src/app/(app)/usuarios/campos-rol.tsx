"use client";

import { useState, type ReactNode } from "react";
import { Selector } from "@/components/form";
import type { Rol } from "@/generated/prisma/enums";
import { opciones, ROL } from "@/lib/labels";

type Opcion = { valor: string; etiqueta: string };

const AYUDA_ROL: Record<Rol, string> = {
  ADMIN: "Acceso total, incluida la gestión de usuarios.",
  OPERADOR: "Personal de la empresa: carga viajes y envíos, y revisa los pedidos de los clientes.",
  CHOFER: "Ve solo sus viajes y repartos, y los actualiza desde el celular.",
  CLIENTE: "Ingresa al portal: carga pedidos y ve solo sus envíos, fletes y facturas.",
};

/** Rol del usuario y, según el rol, el legajo de chofer o el cliente al que se vincula. */
export function CamposRol({
  rolInicial,
  choferId,
  clienteId,
  choferes,
  clientes,
}: {
  rolInicial: Rol;
  choferId?: string | null;
  clienteId?: string | null;
  choferes: Opcion[];
  clientes: Opcion[];
}) {
  const [rol, setRol] = useState<Rol>(rolInicial);

  let vinculo: ReactNode = null;
  if (rol === "CHOFER") {
    vinculo = (
      <Selector
        name="choferId"
        etiqueta="Legajo de chofer"
        requerido
        valor={choferId}
        vacio="Seleccionar…"
        opciones={choferes}
        ayuda={choferes.length ? "Define qué viajes ve." : "No hay legajos libres: cargá el chofer en Flota → Choferes."}
      />
    );
  } else if (rol === "CLIENTE") {
    vinculo = (
      <Selector
        name="clienteId"
        etiqueta="Cliente"
        requerido
        valor={clienteId}
        vacio="Seleccionar…"
        opciones={clientes}
        ayuda="Ve únicamente los envíos, fletes, facturas y pedidos de este cliente."
      />
    );
  }

  return (
    // onChange burbujea desde el <select> del rol
    <div
      className="contents"
      onChange={(e) => {
        const t = e.target as EventTarget as HTMLSelectElement;
        if (t.name === "rol") setRol(t.value as Rol);
      }}
    >
      <Selector name="rol" etiqueta="Rol" valor={rolInicial} opciones={opciones(ROL)} ayuda={AYUDA_ROL[rol]} />
      {vinculo ?? <div className="hidden sm:block" />}
    </div>
  );
}
