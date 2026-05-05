// ==============================================================
// utils.js
// Utilidad para combinar clases de Tailwind CSS.
// clsx gestiona la aplicación condicional de clases y tailwind-merge
// resuelve conflictos entre clases (ej. "p-4 p-2" → "p-2").
// ==============================================================

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind de forma inteligente.
 * @param {...any} inputs - Clases o condiciones (formato clsx)
 * @returns {string} Cadena de clases optimizada.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}