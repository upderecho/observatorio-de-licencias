"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Aviso de entrada (gate bloqueante): se muestra una vez por navegador antes de
 * usar el sitio. Coherente con su propio mensaje, NO recolecta datos: la
 * aceptación se guarda solo en `localStorage`, en el propio dispositivo.
 *
 * Versionado: si cambia el texto del aviso, subir `NOTICE_VERSION` para volver a
 * pedir la aceptación. SSR/export estático: no renderiza nada hasta montar (evita
 * mostrar el modal a quien ya aceptó y evita mismatch de hidratación).
 */
const STORAGE_KEY = "uplaw-entry-notice";
const NOTICE_VERSION = "2026-06-20";

export function EntryNotice() {
  const [decided, setDecided] = useState(false); // ya montó y resolvió el estado
  const [accepted, setAccepted] = useState(true); // optimista: no mostrar hasta saber
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let ok = false;
    try {
      ok = window.localStorage.getItem(STORAGE_KEY) === NOTICE_VERSION;
    } catch {
      ok = false;
    }
    setAccepted(ok);
    setDecided(true);
  }, []);

  // Bloquea el scroll del fondo y enfoca el botón mientras el aviso está visible.
  useEffect(() => {
    if (!decided || accepted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    acceptRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [decided, accepted]);

  if (!decided || accepted) return null;

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, NOTICE_VERSION);
    } catch {
      // sin persistencia el aviso reaparecerá; el estado en memoria igual cierra.
    }
    setAccepted(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-notice-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="entry-notice-title" className="font-serif text-xl font-bold text-slate-900">
          Antes de entrar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          E-Law es un observatorio jurídico-académico de la Facultad de Derecho de la Universidad de Palermo. Al continuar,
          tené presente que:
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          <li className="flex gap-2"><span aria-hidden className="text-slate-400">·</span><span><strong>No recolectamos información.</strong> El sitio es estático y no usa cuentas, cookies de seguimiento ni analítica; esta aceptación se guarda solo en tu navegador.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-slate-400">·</span><span><strong>No es asesoramiento jurídico.</strong> Es una lectura preliminar basada en documentos públicos y evidencia textual; no reemplaza la consulta con una persona abogada.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-slate-400">·</span><span><strong>Es un proyecto académico.</strong> Sin fines comerciales; las marcas y documentos citados pertenecen a sus titulares y se usan con fines de estudio e identificación.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-slate-400">·</span><span><strong>Puede contener errores.</strong> El análisis es automático y preliminar; siempre remite al texto fuente y requiere revisión humana.</span></li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Más detalle en <Link href="/acerca" className="text-sky-700 hover:underline">Acerca del proyecto</Link>.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            ref={acceptRef}
            type="button"
            onClick={accept}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Entiendo y continúo
          </button>
        </div>
      </div>
    </div>
  );
}
