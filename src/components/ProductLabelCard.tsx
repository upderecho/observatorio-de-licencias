"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LicenseAnalysis } from "@/lib/schema";
import { MODE_LABELS, type ContractingMode } from "@/lib/contractingModes";
import {
  octogonosFor,
  cautelasFor,
  nutritionLabel,
  availableModesFor,
  defaultModeFor,
  type Octagon,
  type Cautela,
} from "@/domain/seals";
import { SealBadge } from "./SealBadge";
import { PrecautionaryLegend } from "./PrecautionaryLegend";
import { NutritionLabel } from "./NutritionLabel";
import { EvidencePanel } from "./EvidencePanel";

/**
 * Etiqueta frontal de UN producto. La unidad es PRODUCTO × MODALIDAD: el
 * selector elige la modalidad y todo lo derivado (octógonos, cautelas, tabla) se
 * recalcula para ESA modalidad (las modalidades no se trasladan). Todo deriva
 * del corpus con `src/domain/seals.ts`; nada se afirma sin evidencia.
 *
 * Los sellos (`SealBadge`, `PrecautionaryLegend`) son presentación pura y de
 * tamaño fijo; la expansión con `legalSummary` + evidencia vive acá, fuera de la
 * caja del sello, para que la grilla de octógonos quede siempre alineada.
 */
export function ProductLabelCard({
  providerId,
  productName,
  analyses,
  showProviderLink = true,
}: {
  providerId: string;
  productName: string;
  analyses: LicenseAnalysis[];
  /** Oculta el link "ver expediente" cuando ya estamos en la página del proveedor. */
  showProviderLink?: boolean;
}) {
  const modes = useMemo(() => orderModes(availableModesFor(analyses)), [analyses]);
  const [mode, setMode] = useState<ContractingMode>(() => defaultModeFor(analyses));
  const [openOcta, setOpenOcta] = useState<string | null>(null);
  const [openCautela, setOpenCautela] = useState<string | null>(null);

  const octagons = useMemo(() => octogonosFor(analyses, mode), [analyses, mode]);
  const cautelas = useMemo(() => cautelasFor(analyses, mode), [analyses, mode]);
  const label = useMemo(() => nutritionLabel(analyses, mode), [analyses, mode]);

  const selectId = `mode-${providerId}-${slug(productName)}`;
  const selectedOcta = octagons.find((o) => o.categoryKey === openOcta) ?? null;
  const selectedCautela = cautelas.find((c) => c.key === openCautela) ?? null;

  return (
    <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-slate-900">{productName}</h3>
        {showProviderLink && (
          <Link href={`/providers/${providerId}`} className="text-xs text-sky-700 hover:underline">
            ver expediente →
          </Link>
        )}
      </header>

      {/* Selector de modalidad por tarjeta. */}
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="text-xs text-slate-500">Modalidad</label>
        <select
          id={selectId}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as ContractingMode);
            setOpenOcta(null);
            setOpenCautela(null);
          }}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
        >
          {modes.map((m) => (
            <option key={m} value={m}>{MODE_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {/* Capa 1: octógonos de advertencia, todos del mismo tamaño y alineados. */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Advertencias</h4>
        {octagons.length > 0 ? (
          <>
            <div className="mt-2 grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3">
              {octagons.map((o) => (
                <OctagonCell
                  key={o.categoryKey}
                  octagon={o}
                  open={openOcta === o.categoryKey}
                  onToggle={() => setOpenOcta((k) => (k === o.categoryKey ? null : o.categoryKey))}
                />
              ))}
            </div>
            {selectedOcta && <SealDetail title={selectedOcta.label} sources={selectedOcta.sources} />}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            No se detectaron cláusulas de riesgo alto para esta modalidad en el corpus. No implica ausencia: puede faltar el documento aplicable.
          </p>
        )}
      </div>

      {/* Capa 2: cautelas (riesgo medio). */}
      {cautelas.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cautelas</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {cautelas.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setOpenCautela((k) => (k === c.key ? null : c.key))}
                aria-expanded={openCautela === c.key}
                className="rounded outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                <PrecautionaryLegend text={c.text} />
              </button>
            ))}
          </div>
          {selectedCautela && <SealDetail title={selectedCautela.text} sources={selectedCautela.sources} />}
        </div>
      )}

      {/* Capa 3: tabla nutricional del clausulado. */}
      <NutritionLabel data={label} />
    </article>
  );
}

/** Celda de octógono: caja fija 112×112 + acceso a la evidencia, alineada en grilla. */
function OctagonCell({ octagon, open, onToggle }: { octagon: Octagon; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? "Ocultar" : "Ver"} evidencia de la advertencia: ${octagon.label}`}
        className="rounded outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <SealBadge lines={octagon.lines} label={octagon.label} />
      </button>
      <span className="max-w-[112px] text-center text-[11px] leading-tight text-slate-600">{octagon.label}</span>
      <span className="text-[11px] text-sky-700">{open ? "ocultar" : "ver evidencia"}</span>
    </div>
  );
}

/** Panel de detalle de un sello: por cada documento de origen, resumen + evidencia. */
function SealDetail({ title, sources }: { title: string; sources: Octagon["sources"] }) {
  return (
    <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {sources.map((s, i) => (
        <div key={`${s.analysisId}-${i}`} className="space-y-1.5">
          <p className="text-xs text-slate-500">
            Documento: {s.documentType} · modalidad {MODE_LABELS[s.contractingMode]}
          </p>
          {s.legalSummary && <p className="text-slate-700">{s.legalSummary}</p>}
          <EvidencePanel evidence={s.evidence} />
        </div>
      ))}
      <p className="text-xs text-slate-400">Procede del/de los documento(s) citado(s). No constituye conclusión jurídica.</p>
    </div>
  );
}

const MODE_ORDER: ContractingMode[] = [
  "free",
  "all",
  "paid_individual",
  "team",
  "business",
  "enterprise",
  "api",
  "education",
  "open_source",
  "unknown",
];

function orderModes(modes: ContractingMode[]): ContractingMode[] {
  return [...modes].sort((a, b) => MODE_ORDER.indexOf(a) - MODE_ORDER.indexOf(b));
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
