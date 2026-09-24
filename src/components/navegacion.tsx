"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cerrarSesion } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { cx } from "@/components/ui";
import type { Rol } from "@/generated/prisma/enums";
import { ROL } from "@/lib/labels";

type Item = { href: string; etiqueta: string; roles: Rol[] };

const ITEMS: Item[] = [
  { href: "/", etiqueta: "Panel", roles: ["ADMIN", "OPERADOR"] },
  { href: "/pedidos", etiqueta: "Pedidos", roles: ["ADMIN", "OPERADOR"] },
  { href: "/viajes", etiqueta: "Viajes", roles: ["ADMIN", "OPERADOR"] },
  { href: "/envios", etiqueta: "Envíos", roles: ["ADMIN", "OPERADOR"] },
  { href: "/depositos", etiqueta: "Depósitos", roles: ["ADMIN", "OPERADOR"] },
  { href: "/mis-viajes", etiqueta: "Mis viajes", roles: ["CHOFER"] },
  { href: "/clientes", etiqueta: "Clientes", roles: ["ADMIN", "OPERADOR"] },
  { href: "/flota/vehiculos", etiqueta: "Vehículos", roles: ["ADMIN", "OPERADOR"] },
  { href: "/flota/choferes", etiqueta: "Choferes", roles: ["ADMIN", "OPERADOR"] },
  { href: "/facturacion", etiqueta: "Facturación", roles: ["ADMIN", "OPERADOR"] },
  { href: "/reportes", etiqueta: "Reportes", roles: ["ADMIN", "OPERADOR"] },
  { href: "/usuarios", etiqueta: "Usuarios", roles: ["ADMIN"] },
  { href: "/portal", etiqueta: "Inicio", roles: ["CLIENTE"] },
  { href: "/portal/pedidos", etiqueta: "Mis pedidos", roles: ["CLIENTE"] },
  { href: "/portal/envios", etiqueta: "Mis envíos", roles: ["CLIENTE"] },
  { href: "/portal/fletes", etiqueta: "Mis fletes", roles: ["CLIENTE"] },
  { href: "/portal/facturas", etiqueta: "Mis facturas", roles: ["CLIENTE"] },
];

// Inicios de sección: solo se marcan en su propia página, no en las de adentro
const EXACTAS = ["/", "/portal"];

function activo(ruta: string, href: string) {
  return EXACTAS.includes(href) ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
}

export function Navegacion({ nombre, rol }: { nombre: string; rol: Rol }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const items = ITEMS.filter((i) => i.roles.includes(rol));

  return (
    <>
      {/* Barra superior en pantallas chicas */}
      <div className="no-imprimir sticky top-0 z-20 flex items-center justify-between bg-tierra px-4 py-3 text-white lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-8" />
          Expreso Banchero
        </Link>
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/30"
          aria-expanded={abierto}
        >
          Menú
        </button>
      </div>

      <aside
        className={cx(
          "no-imprimir z-10 flex-col bg-tierra text-stone-300 lg:fixed lg:inset-y-0 lg:flex lg:w-60",
          abierto ? "flex" : "hidden",
        )}
      >
        <Link href="/" className="hidden items-center gap-2.5 px-5 py-5 font-display font-semibold text-white lg:flex">
          <Logo className="h-11" prioridad />
          Expreso Banchero
        </Link>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setAbierto(false)}
              className={cx(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activo(ruta, i.href) ? "bg-marca-600 text-white" : "text-stone-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {i.etiqueta}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{nombre}</p>
          <p className="text-xs text-marca-300">{ROL[rol]}</p>
          <form action={cerrarSesion} className="mt-3">
            <button type="submit" className="text-sm font-medium text-stone-300 hover:text-white">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
