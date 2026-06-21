"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Check, Mail } from "lucide-react";

/**
 * Botones para compartir la página actual. Usa los links de "compartir" nativos
 * de cada red (intents) — SIN widgets ni SDK de terceros, coherente con el aviso
 * de "no recolectamos información". La URL se lee del navegador al montar (apta
 * para export estático: en el server no hay window).
 */
export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // El portapapeles puede no estar disponible; no es crítico.
    }
  }

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
  const x = `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const email = `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\n${url}`)}`;

  const linkClass =
    "rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Compartir
      </span>
      <button type="button" onClick={copy} className={linkClass} aria-label="Copiar enlace al portapapeles">
        <span className="inline-flex items-center gap-1">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copiado" : "Copiar link"}
        </span>
      </button>
      <a className={linkClass} href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a className={linkClass} href={x} target="_blank" rel="noopener noreferrer">X</a>
      <a className={linkClass} href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className={linkClass} href={email}>
        <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Email</span>
      </a>
    </div>
  );
}
