"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LicenseAnalysis } from "@/lib/schema";
import {
  filterAnalyses,
  foundCount,
  providerKey,
  riskRationale,
  topRiskCategories,
  EMPTY_FILTERS,
  type AnalysisFilterState,
} from "@/lib/derive";
import { MODE_LABELS } from "@/lib/analysisMeta";
import { CATEGORY_BY_KEY } from "@/lib/categories";
import { Dot, RiskCompact, PrivacyCompact, type Tone } from "./indicators";

const RISK_RANK: Record<string, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
const POSTURE_RANK: Record<string, number> = { unknown: 0, weak: 1, moderate: 2, strong: 3 };

const COL_COUNT = 9;

type SortKey = "provider" | "modality" | "privacy" | "risk" | "review" | "source" | "date" | "found";

// Fuente: etiqueta corta + tono a partir de sourceStatus (con fallback al booleano).
const SOURCE_SHORT: Record<string, { label: string; tone: Tone }> = {
  verified: { label: "Verificada", tone: "emerald" },
  needs_manual_review: { label: "Pendiente", tone: "amber" },
  failed_fetch: { label: "Fallida", tone: "red" },
  unavailable: { label: "No disponible", tone: "amber" },
  unsupported_format: { label: "Formato no soportado", tone: "slate" },
};
function sourceInfo(a: LicenseAnalysis): { label: string; tone: Tone } {
  const s = a.metadata.sourceStatus ?? (a.metadata.sourceVerified ? "verified" : undefined);
  return (s && SOURCE_SHORT[s]) || { label: "Sin verificar", tone: "amber" };
}

// Revisión: etiqueta corta (sin "legal") + tono.
const REVIEW_SHORT: Record<string, { label: string; tone: Tone }> = {
  unreviewed: { label: "Sin revisar", tone: "amber" },
  needs_legal_review: { label: "Requiere revisión", tone: "amber" },
  reviewed: { label: "Revisado", tone: "emerald" },
  rejected: { label: "Rechazado", tone: "red" },
};
const reviewInfo = (a: LicenseAnalysis) => REVIEW_SHORT[a.metadata.reviewStatus] ?? { label: a.metadata.reviewStatus, tone: "slate" as Tone };

const sourceHost = (a: LicenseAnalysis): string => {
  try {
    return a.sourceUrl ? new URL(a.sourceUrl).host.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
const dateOf = (a: LicenseAnalysis) => (a.metadata.retrievedAt ?? a.retrievedAt).slice(0, 10);
const categoryLabel = (key: string) => CATEGORY_BY_KEY[key]?.label ?? key;

/**
 * Registro jurídico de due diligence: tabla ancha, sobria y trazable.
 * Toolbar compacta (búsqueda + filtros rápidos + avanzados), columnas agrupadas
 * (proveedor/producto, modalidad/documento), agrupación opcional por proveedor y
 * un panel lateral de vista rápida. Indicadores texto + punto, nunca solo color.
 */
export function AnalysisTable({ analyses }: { analyses: LicenseAnalysis[] }) {
  const [f, setF] = useState<AnalysisFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "provider", dir: 1 });
  const [advanced, setAdvanced] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [selected, setSelected] = useState<LicenseAnalysis | null>(null);

  const options = useMemo(() => {
    const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();
    return {
      providers: uniq(analyses.map((a) => a.providerName)),
      documentTypes: uniq(analyses.map((a) => a.documentType)),
      modalities: uniq(analyses.map((a) => a.contractingMode)),
    };
  }, [analyses]);

  const rows = useMemo(() => {
    const filtered = filterAnalyses(analyses, f);
    const val = (a: LicenseAnalysis): string | number => {
      switch (sort.key) {
        case "provider": return `${a.providerName} ${a.productName}`;
        case "modality": return MODE_LABELS[a.contractingMode];
        case "privacy": return POSTURE_RANK[a.privacy.posture] ?? 0;
        case "risk": return RISK_RANK[a.overall.overallRiskLevel] ?? 0;
        case "review": return a.metadata.reviewStatus;
        case "source": return sourceInfo(a).label;
        case "date": return dateOf(a);
        case "found": return foundCount(a);
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -1 * sort.dir;
      if (va > vb) return 1 * sort.dir;
      return 0;
    });
  }, [analyses, f, sort]);

  // Agrupación por proveedor: conserva el orden de filas vigente dentro de cada grupo.
  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, { name: string; rows: LicenseAnalysis[] }>();
    for (const a of rows) {
      const k = providerKey(a);
      if (!map.has(k)) map.set(k, { name: a.providerName, rows: [] });
      map.get(k)!.rows.push(a);
    }
    return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
  }, [rows, grouped]);

  const set = (patch: Partial<AnalysisFilterState>) => setF((prev) => ({ ...prev, ...patch }));
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  const sortMark = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "");
  const active = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="space-y-3">
      <Filters
        f={f}
        set={set}
        options={options}
        reset={() => setF(EMPTY_FILTERS)}
        count={rows.length}
        total={analyses.length}
        advanced={advanced}
        toggleAdvanced={() => setAdvanced((v) => !v)}
        grouped={grouped}
        toggleGrouped={() => setGrouped((v) => !v)}
        active={active}
      />

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Ningún análisis coincide con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <Th onClick={() => toggleSort("provider")}>Proveedor / Producto{sortMark("provider")}</Th>
                <Th onClick={() => toggleSort("modality")}>Modalidad / Documento{sortMark("modality")}</Th>
                <Th onClick={() => toggleSort("privacy")}>Privacidad{sortMark("privacy")}</Th>
                <Th onClick={() => toggleSort("risk")}>Riesgo contractual{sortMark("risk")}</Th>
                <Th onClick={() => toggleSort("review")}>Revisión{sortMark("review")}</Th>
                <Th onClick={() => toggleSort("source")}>Fuente{sortMark("source")}</Th>
                <Th onClick={() => toggleSort("date")}>Fecha{sortMark("date")}</Th>
                <Th onClick={() => toggleSort("found")} className="text-right">Hallazgos{sortMark("found")}</Th>
                <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groups
                ? groups.map((g) => (
                    <GroupBlock key={g.name} name={g.name} rows={g.rows} selected={selected} onSelect={setSelected} />
                  ))
                : rows.map((a) => (
                    <Row key={a.id} a={a} selected={selected?.id === a.id} onSelect={setSelected} />
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        Riesgo contractual y perfil de privacidad son señales preliminares de priorización, no conclusiones
        jurídicas. <Link href="/criteria" className="text-sky-700 underline">Ver criterio de riesgo</Link>.
      </p>

      {selected && <QuickView a={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ===== Filas =====

function GroupBlock({
  name,
  rows,
  selected,
  onSelect,
}: {
  name: string;
  rows: LicenseAnalysis[];
  selected: LicenseAnalysis | null;
  onSelect: (a: LicenseAnalysis) => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-200 bg-slate-50">
        <td colSpan={COL_COUNT} className="px-4 py-2">
          <span className="font-serif text-sm font-semibold text-slate-900">{name}</span>
          <span className="ml-2 text-xs text-slate-500">
            {rows.length} {rows.length === 1 ? "documento" : "documentos"}
          </span>
        </td>
      </tr>
      {rows.map((a) => (
        <Row key={a.id} a={a} selected={selected?.id === a.id} onSelect={onSelect} indented />
      ))}
    </>
  );
}

function Row({
  a,
  selected,
  onSelect,
  indented,
}: {
  a: LicenseAnalysis;
  selected: boolean;
  onSelect: (a: LicenseAnalysis) => void;
  indented?: boolean;
}) {
  const src = sourceInfo(a);
  const host = sourceHost(a);
  const rev = reviewInfo(a);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <tr
      onClick={() => onSelect(a)}
      className={`cursor-pointer border-b border-slate-100 last:border-0 align-top transition-colors ${
        selected ? "bg-sky-50" : "hover:bg-slate-50/70"
      }`}
    >
      <td className={`px-4 py-2.5 ${indented ? "pl-8" : ""}`}>
        <div className="font-medium text-slate-900">{a.providerName}</div>
        <div className="text-xs text-slate-500">{a.productName}</div>
      </td>
      <td className="px-4 py-2.5">
        <div className="text-slate-700">{MODE_LABELS[a.contractingMode]}</div>
        <div className="text-xs text-slate-500">{a.documentType}</div>
      </td>
      <td className="px-4 py-2.5"><PrivacyCompact analysis={a} /></td>
      <td className="px-4 py-2.5"><RiskCompact analysis={a} /></td>
      <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
        <Dot tone={rev.tone} />{rev.label}
      </td>
      <td className="px-4 py-2.5">
        <div className="whitespace-nowrap text-slate-700"><Dot tone={src.tone} />{src.label}</div>
        {host && <div className="text-xs text-slate-400" title={a.sourceUrl ?? undefined}>{host}</div>}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-slate-500">{dateOf(a)}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{foundCount(a)}</td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={stop}>
        <Link
          href={`/analysis/${a.id}`}
          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Ver dossier
        </Link>
        <Link href={`/analysis/${a.id}/source`} className="ml-2 text-xs text-sky-700 hover:underline">
          Fuente
        </Link>
      </td>
    </tr>
  );
}

// ===== Panel lateral de vista rápida =====

function QuickView({ a, onClose }: { a: LicenseAnalysis; onClose: () => void }) {
  const src = sourceInfo(a);
  const rev = reviewInfo(a);
  const drivers = topRiskCategories(a, categoryLabel);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Vista rápida del análisis">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">{a.providerName}</h2>
            <p className="text-sm text-slate-600">{a.productName} · {a.documentType}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">✕</button>
        </header>

        <div className="space-y-4 px-5 py-4 text-sm">
          <QvLine label="Modalidad">{MODE_LABELS[a.contractingMode]}</QvLine>
          <QvLine label="Riesgo contractual">
            <span className="text-slate-800"><RiskCompact analysis={a} /></span>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{riskRationale(a, categoryLabel)}</p>
          </QvLine>
          <QvLine label="Privacidad">
            <span className="text-slate-800"><PrivacyCompact analysis={a} /></span>
            {a.privacy.rationale && <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.privacy.rationale}</p>}
          </QvLine>
          <QvLine label="Fuente">
            <span className="text-slate-800"><Dot tone={src.tone} />{src.label}</span>
            {sourceHost(a) && <p className="mt-0.5 text-xs text-slate-400">{sourceHost(a)} · {dateOf(a)}</p>}
          </QvLine>
          <QvLine label="Revisión">
            <span className="text-slate-800"><Dot tone={rev.tone} />{rev.label}</span>
          </QvLine>
          <QvLine label={`Hallazgos (${foundCount(a)})`}>
            {drivers.length > 0 ? (
              <span className="text-slate-700">{drivers.map((d) => d.label).join(" · ")}</span>
            ) : (
              <span className="text-slate-500">Sin categorías de riesgo elevado detectadas.</span>
            )}
          </QvLine>
        </div>

        <footer className="mt-auto border-t border-slate-200 px-5 py-4">
          <Link
            href={`/analysis/${a.id}`}
            className="block rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
          >
            Abrir dossier completo
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function QvLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

// ===== Encabezado de columna y toolbar de filtros =====

function Th({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 font-medium ${onClick ? "cursor-pointer select-none hover:text-slate-800" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function Filters({
  f,
  set,
  options,
  reset,
  count,
  total,
  advanced,
  toggleAdvanced,
  grouped,
  toggleGrouped,
  active,
}: {
  f: AnalysisFilterState;
  set: (patch: Partial<AnalysisFilterState>) => void;
  options: { providers: string[]; documentTypes: string[]; modalities: string[] };
  reset: () => void;
  count: number;
  total: number;
  advanced: boolean;
  toggleAdvanced: () => void;
  grouped: boolean;
  toggleGrouped: () => void;
  active: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
      {/* Búsqueda + agrupar + contador */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={f.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar proveedor, producto o documento…"
          className="h-9 min-w-[18rem] flex-1 rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-sky-700 focus:outline-none"
        />
        <label className="flex items-center gap-2 whitespace-nowrap text-slate-600">
          <input type="checkbox" checked={grouped} onChange={toggleGrouped} className="h-4 w-4 accent-slate-700" />
          Agrupar por proveedor
        </label>
        <span className="whitespace-nowrap tabular-nums text-slate-500">
          {count} de {total} análisis
        </span>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap items-end gap-3">
        <Sel label="Modalidad" value={f.modality} onChange={(v) => set({ modality: v })} options={options.modalities} render={(m) => MODE_LABELS[m as keyof typeof MODE_LABELS] ?? m} />
        <Sel label="Proveedor" value={f.provider} onChange={(v) => set({ provider: v })} options={options.providers} />
        <Sel label="Riesgo" value={f.risk} onChange={(v) => set({ risk: v })} options={["low", "medium", "high", "unknown"]} render={(r) => ({ low: "bajo", medium: "medio", high: "alto", unknown: "desconocido" }[r] ?? r)} />
        <Sel label="Privacidad" value={f.privacy} onChange={(v) => set({ privacy: v })} options={["strong", "moderate", "weak", "unknown"]} render={(p) => ({ strong: "fuerte", moderate: "moderada", weak: "débil", unknown: "sin datos" }[p] ?? p)} />
        <button
          type="button"
          onClick={toggleAdvanced}
          className="h-8 rounded-md border border-slate-300 px-3 text-slate-700 hover:bg-slate-100"
          aria-expanded={advanced}
        >
          Filtros avanzados {advanced ? "▴" : "▾"}
        </button>
        {active && (
          <button type="button" onClick={reset} className="h-8 px-1 text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filtros avanzados */}
      {advanced && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <Sel label="Documento" value={f.documentType} onChange={(v) => set({ documentType: v })} options={options.documentTypes} />
          <Sel label="Fuente" value={f.source} onChange={(v) => set({ source: v })} options={["verified", "unverified"]} render={(s) => (s === "verified" ? "verificada" : "sin verificar")} />
          <Sel label="Revisión" value={f.review} onChange={(v) => set({ review: v })} options={["unreviewed", "needs_legal_review", "reviewed", "rejected"]} render={(r) => REVIEW_SHORT[r]?.label ?? r} />
          <Sel label="Origen" value={f.kind} onChange={(v) => set({ kind: v })} options={["real", "mock"]} render={(k) => (k === "real" ? "real" : "mock")} />
        </div>
      )}
    </div>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
  render,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  render?: (v: string) => string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:border-sky-700 focus:outline-none"
      >
        <option value="">Todas</option>
        {options.map((o) => (
          <option key={o} value={o}>{render ? render(o) : o}</option>
        ))}
      </select>
    </label>
  );
}
