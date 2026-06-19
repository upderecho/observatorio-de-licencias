"use client";

import { useState } from "react";
import Link from "next/link";
import type { RiskLevel } from "@/lib/types";
import type { CategoryFinding } from "@/lib/schema";
import { REVIEW_LABELS } from "@/lib/analysisMeta";
import { EvidencePanel } from "./EvidencePanel";
import type { NutritionLabelData, NutritionRow } from "@/domain/seals";

/**
 * TABLA NUTRICIONAL del clausulado (capa 3), por producto × modalidad. Muestra
 * la lectura en lenguaje claro; la evidencia textual (citas) queda a un clic por
 * fila. El color solo refuerza: el estado y el riesgo van en texto.
 */

const STATUS_TEXT: Record<CategoryFinding["status"], string> = {
  found: "Detectada",
  not_found: "No detectada",
  unclear: "Ambigua",
};
const STATUS_DOT: Record<CategoryFinding["status"], string> = {
  found: "text-sky-700",
  not_found: "text-slate-400",
  unclear: "text-amber-600",
};
const RISK_WORD: Record<RiskLevel, string> = { low: "bajo", medium: "medio", high: "alto", unknown: "—" };
const RISK_DOT: Record<RiskLevel, string> = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-red-600",
  unknown: "text-slate-300",
};

export function NutritionLabel({ data }: { data: NutritionLabelData }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
      >
        <span className="text-sm font-medium text-slate-800">
          Tabla nutricional del clausulado
          <span className="ml-2 font-normal text-slate-500">({data.rows.length} categorías)</span>
        </span>
        <span className="shrink-0 text-xs text-slate-400">{open ? "ocultar" : "ver"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200">
          {/* "Porción": qué se está leyendo y de dónde viene. */}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 px-3 py-3 text-xs text-slate-600 sm:grid-cols-2">
            <Datum label="Producto">{data.productName}</Datum>
            <Datum label="Modalidad">{data.modeLabel}</Datum>
            <Datum label="Documentos">
              {data.documents.length > 0
                ? data.documents.map((d, i) => (
                    <span key={d.analysisId}>
                      {i > 0 && ", "}
                      <Link href={`/analysis/${d.analysisId}`} className="text-sky-700 hover:underline">
                        {d.documentType}
                      </Link>
                    </span>
                  ))
                : "—"}
            </Datum>
            <Datum label="Recuperado">{data.retrievedAt ?? "—"}</Datum>
            <Datum label="Hash de contenido">{data.contentHashShort ? `sha256:${data.contentHashShort}…` : "—"}</Datum>
            <Datum label="Revisión">{REVIEW_LABELS[data.reviewStatus] ?? data.reviewStatus}</Datum>
            <Datum label="Fuente">{data.sourceVerified ? "verificada técnicamente" : "sin verificar"}</Datum>
          </dl>

          {/* Lectura de riesgo preliminar (reusa riskRationale/topRiskCategories). */}
          {data.riskRead && (
            <div className="border-t border-slate-200 px-3 py-3 text-xs text-slate-600">
              <p>
                <span className="text-slate-400">Lectura de riesgo preliminar:</span>{" "}
                <span className="text-slate-700">
                  <span className={RISK_DOT[data.riskRead.level]} aria-hidden>●</span> riesgo {RISK_WORD[data.riskRead.level]}.
                </span>{" "}
                {data.riskRead.rationale}
              </p>
              {data.riskRead.drivers.length > 0 && (
                <p className="mt-1 text-slate-500">
                  Señales: {data.riskRead.drivers.map((d) => d.label).join(" · ")}.
                </p>
              )}
            </div>
          )}

          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-3 py-2 font-medium">Cláusula</th>
                  <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2 font-medium">Riesgo</th>
                  <th scope="col" className="px-3 py-2 font-medium">Lectura</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <RowView key={row.categoryKey} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Datum({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-slate-400">{label}:</dt>
      <dd className="text-slate-700">{children}</dd>
    </div>
  );
}

function RowView({ row }: { row: NutritionRow }) {
  const [open, setOpen] = useState(false);
  const hasEvidence = row.evidence.length > 0;
  // Lectura en lenguaje claro (explicación del catálogo). La evidencia textual
  // y el resumen jurídico del documento quedan a un clic ("evidencia").
  const reading = row.plainConcern;

  return (
    <>
      <tr className="border-b border-slate-100 align-top">
        <th scope="row" className="px-3 py-2 text-left font-medium text-slate-800">{row.label}</th>
        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
          <span className={STATUS_DOT[row.status]} aria-hidden>●</span> {STATUS_TEXT[row.status]}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
          <span className={RISK_DOT[row.riskLevel]} aria-hidden>●</span> {RISK_WORD[row.riskLevel]}
        </td>
        <td className="px-3 py-2 text-slate-700">
          {row.status === "found" ? reading : <span className="text-slate-400">sin datos suficientes</span>}
          {hasEvidence && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="ml-2 align-baseline text-xs text-sky-700 hover:underline"
            >
              {open ? "ocultar evidencia" : "evidencia"}
            </button>
          )}
        </td>
      </tr>
      {open && hasEvidence && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={4} className="px-3 py-2">
            <EvidencePanel evidence={row.evidence} />
          </td>
        </tr>
      )}
    </>
  );
}
