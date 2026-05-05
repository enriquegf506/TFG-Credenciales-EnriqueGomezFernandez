// ==============================================================
// validators.js
// Funciones de validación de formato para datos críticos.
// Se usan en el frontend para evitar envíos inválidos a la blockchain.
// ==============================================================

/**
 * Valida el formato de un CID de IPFS.
 * Soporta CIDv0 (Qm..., 46 caracteres) y CIDv1 (bafy..., longitud >=50).
 * @param {string} cid - El CID a validar.
 * @returns {boolean} true si el formato es correcto.
 */
export const isValidCID = (cid) => {
  if (!cid || typeof cid !== 'string') return false;
  if (cid.startsWith('Qm') && cid.length === 46) return true;
  if (cid.startsWith('b') && cid.length >= 50) return true;
  return false;
};

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