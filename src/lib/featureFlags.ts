"use client";

/**
 * Feature flags por parámetro de URL, compatibles con el export estático de
 * GitHub Pages (no hay servidor: se resuelven en el cliente).
 *
 * Comportamiento "pegajoso": al visitar cualquier URL con `?flag=true` la
 * funcionalidad queda habilitada en la pestaña (sessionStorage) y sigue activa
 * al navegar sin repetir el parámetro. `?flag=false` la apaga. Una pestaña nueva
 * y limpia arranca deshabilitada.
 *
 * Hoy un único flag genérico (`flag`) habilita "Escenarios". El diseño permite
 * agregar flags con nombre propio más adelante sin cambiar las vistas.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "uplaw:flag:escenarios";

/** Lee el estado del flag de Escenarios (URL `?flag=` con persistencia en sesión). */
export function useEscenariosEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const flag = new URLSearchParams(window.location.search).get("flag");
      if (flag === "true") {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setEnabled(true);
        return;
      }
      if (flag === "false") {
        sessionStorage.removeItem(STORAGE_KEY);
        setEnabled(false);
        return;
      }
      setEnabled(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setEnabled(false);
    }
  }, []);

  return enabled;
}
