import type { ReactNode } from "react";

/**
 * Contenedor de ancho único para las vistas principales. Alinea el contenido con
 * el header/nav y el footer (mismo max-width y padding lateral). Evita columnas
 * angostas centradas. El ancho de texto puro, si hace falta, se limita dentro de
 * los párrafos, no a nivel de página.
 */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-6 lg:px-10 xl:px-12 ${className}`}>{children}</div>;
}
