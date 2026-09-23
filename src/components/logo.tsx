import Image from "next/image";
import { cx } from "@/components/ui";

/** Logo de Expreso Banchero. El alto se define con className (ej. "h-9"). */
export function Logo({ className, prioridad }: { className?: string; prioridad?: boolean }) {
  return (
    <Image
      src="/marca/logo.png"
      alt="Expreso Banchero"
      width={511}
      height={422}
      priority={prioridad}
      className={cx("w-auto", className)}
    />
  );
}
