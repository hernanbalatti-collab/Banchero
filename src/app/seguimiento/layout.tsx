import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LayoutSeguimiento({ children }: LayoutProps<"/seguimiento">) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="relative overflow-hidden bg-tierra">
        <Image
          src="/marca/encomiendas.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-35"
        />
        <div className="relative mx-auto flex max-w-2xl items-center gap-4 px-4 py-6">
          <Link href="/seguimiento" className="flex items-center gap-3 text-white">
            <Logo className="h-14" prioridad />
            <span>
              <span className="block font-display text-lg font-semibold">Expreso Banchero</span>
              <span className="block text-sm text-stone-200">Seguimiento de envíos</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
