"use client";

import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { useEscenariosEnabled } from "@/lib/featureFlags";

const NAV_LINK_CLASS = "rounded-md px-2 py-1 text-slate-200 hover:bg-white/10 hover:text-white";

/**
 * Muestra `children` solo si el flag de Escenarios está habilitado; si no,
 * renderiza `fallback` (por defecto, nada). Por defecto deshabilitado, de modo
 * que el HTML estático no expone la sección hasta que el cliente la habilita.
 */
export function EscenariosGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const enabled = useEscenariosEnabled();
  return <>{enabled ? children : fallback}</>;
}

/** Enlace de navegación a Escenarios, visible solo con el flag activo. */
export function EscenariosNavLink() {
  const enabled = useEscenariosEnabled();
  if (!enabled) return null;
  return (
    <Link href="/escenarios" className={NAV_LINK_CLASS}>
      Escenarios
    </Link>
  );
}

/** Aviso para cuando se entra a una página de Escenarios con el flag apagado. */
export function EscenariosUnavailable() {
  return (
    <PageContainer className="space-y-4">
      <h1 className="font-serif text-2xl font-bold text-slate-900">Sección no disponible</h1>
      <p className="max-w-2xl text-base leading-relaxed text-slate-600">
        La sección <strong>Escenarios</strong> es una funcionalidad en preparación y no está habilitada en esta vista.
      </p>
      <Link href="/" className="inline-block text-sm font-medium text-sky-700 hover:underline">
        ← Volver al inicio
      </Link>
    </PageContainer>
  );
}
