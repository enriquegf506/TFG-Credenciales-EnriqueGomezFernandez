// ==============================================================
// validators.js
// Funciones de validación de formato para datos críticos.
// Se usan en el frontend para evitar envíos inválidos a la blockchain.
// ==============================================================

/**
 * Valida una dirección Ethereum usando expresión regular.
 * Formato: 0x seguido de 40 caracteres hexadecimales.
 * @param {string} address - Dirección a validar.
 * @returns {boolean} true si el formato es correcto.
 */
export const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Valida que un ID de credencial sea un número entero no negativo.
 * @param {any} id - El ID a validar (número o string).
 * @returns {boolean} true si es válido.
 */
export const isValidCredentialId = (id) => {
  if (id === null || id === undefined || String(id).trim() === "") {
    return false;
  }
  const num = Number(id);
  return Number.isInteger(num) && num >= 0;
};