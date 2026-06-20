import Link from "next/link";
import { EscenariosNavLink } from "@/components/featureGates";

// En el sitio estático de GitHub Pages no hay servidor: la carga web (/upload)
// no se incluye en ese build. La ingesta ahí es 100% local por CLI.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

/** Cabecera con navegación principal. */
export function Header() {
  return (
    <header className="border-b-2 border-gold-500 bg-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-10 xl:px-12">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-baseline gap-2 font-serif tracking-tight">
            <span className="text-base font-semibold text-slate-200">Universidad de Palermo</span>
            <span className="text-slate-500" aria-hidden>|</span>
            <span className="hidden text-base font-semibold text-slate-200 sm:inline">Facultad de Derecho</span>
            <span className="hidden text-slate-500 sm:inline" aria-hidden>|</span>
            <span className="text-xl font-bold text-white">E-Law</span>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {[
            { href: "/", label: "Inicio" },
            { href: "/#estado-del-arte", label: "Estado del arte" },
            { href: "/escenarios", label: "Escenarios" },
            { href: "/analyses", label: "Corpus documental" },
            { href: "/providers", label: "Proveedores" },
            { href: "/criteria", label: "Criterio" },
            { href: "/acerca", label: "Acerca" },
          ].map((l) =>
            // "Escenarios" detrás de feature flag (?flag=true), resuelto en cliente.
            l.href === "/escenarios" ? (
              <EscenariosNavLink key={l.href} />
            ) : (
              <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 text-slate-200 hover:bg-white/10 hover:text-white">
                {l.label}
              </Link>
            ),
          )}
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
