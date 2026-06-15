import Link from "next/link";

// En el sitio estático de GitHub Pages no hay servidor: la carga web (/upload)
// no se incluye en ese build. La ingesta ahí es 100% local por CLI.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

/** Cabecera con navegación principal. */
export function Header() {
  return (
    <header className="border-b-2 border-gold-500 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-bold tracking-tight text-white">UP-Law-AILO</span>
            <span className="hidden text-xs text-slate-300 sm:inline">
              Observatorio de licencias de IA
            </span>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {[
            { href: "/", label: "Panel" },
            { href: "/analyses", label: "Análisis" },
            { href: "/providers", label: "Proveedores" },
            { href: "/compare", label: "Comparar" },
            { href: "/differences", label: "Diferencias" },
            { href: "/criteria", label: "Criterio" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 text-slate-200 hover:bg-white/10 hover:text-white">
              {l.label}
            </Link>
          ))}
          {!isStaticExport && (
            <Link
              href="/upload"
              className="rounded-md bg-gold-500 px-3 py-1 font-medium text-slate-900 hover:bg-gold-600"
            >
              + Cargar licencia
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
