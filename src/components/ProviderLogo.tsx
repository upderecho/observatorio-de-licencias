"use client";

import { useState } from "react";
import { colorFor, initials } from "@/lib/providerLogoUtils";

/**
 * Identifica un proveedor con su logo local (`src`); si no hay logo o falla la
 * carga, cae a un monograma con iniciales y color determinístico por id. Sin
 * servicios externos de logos; los SVG no se recolorean (se muestran tal cual).
 * La lógica pura (color/iniciales) vive en `@/lib/providerLogoUtils`.
 */
export function ProviderLogo({ src, providerId, providerName, size = 28 }: {
  src?: string; providerId: string; providerName: string; size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={providerName} width={size} height={size}
                style={{ borderRadius: 6, objectFit: "contain" }} onError={() => setFailed(true)} />;
  }
  return (
    <span role="img" aria-label={providerName} title={providerName}
      style={{ width: size, height: size, borderRadius: 6, background: colorFor(providerId), color: "#fff",
               display: "inline-flex", alignItems: "center", justifyContent: "center",
               fontSize: size * 0.42, fontWeight: 600, fontFamily: "var(--font-sans, sans-serif)" }}>
      {initials(providerName)}
    </span>
  );
}
