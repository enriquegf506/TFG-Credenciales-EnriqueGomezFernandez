// ==============================================================
// crypto.js
// Utilidades criptográficas para cifrado/descifrado de PDFs y gestión de claves.
// Se utiliza la librería CryptoJS para simplificar operaciones AES y SHA-256.
// ==============================================================

import CryptoJS from 'crypto-js';

/**
 * Genera una clave aleatoria de 128 bits (16 bytes) en formato hexadecimal.
 * Se emplea para cifrar cada PDF de forma individual, garantizando que cada título tenga una clave única.
 * @returns {string} Clave aleatoria en formato hexadecimal.
 */
export const generateRandomKey = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

/**
 * Calcula el hash SHA-256 de la clave y lo devuelve con el prefijo '0x'.
 * Este hash es el que se almacena en la blockchain, nunca la clave en claro.
 * @param {string} key - Clave en formato hexadecimal.
 * @returns {string} Hash de la clave con prefijo '0x'.
 */
export const hashKey = (key) => {
  const hash = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex);
  return `0x${hash}`;
};

/**
 * Cifra un archivo PDF utilizando AES con la clave proporcionada.
 * El resultado se devuelve como un Blob para ser subido directamente a IPFS (Pinata).
 * @param {File} file - Archivo PDF a cifrar.
 * @param {string} key - Clave de cifrado (hexadecimal).
 * @returns {Promise<Blob>} Blob con el contenido cifrado.
 */
export const encryptFile = async (file, key) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const wordArray = CryptoJS.lib.WordArray.create(reader.result);
      const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
      resolve(new Blob([encrypted], { type: 'application/octet-stream' }));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Descifra un archivo previamente cifrado con AES.
 * Convierte el resultado a un Blob de tipo application/pdf para su visualización.
 * @param {string} encryptedData - Texto cifrado (en formato string, obtenido de IPFS).
 * @param {string} key - Clave de cifrado en hexadecimal.
 * @returns {Promise<Blob>} Blob con el PDF descifrado.
 * @throws {Error} Si la clave es incorrecta o los datos están corruptos.
 */
export const decryptFile = async (encryptedData, key) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const typedArray = wordArrayToUint8Array(decrypted);
    return new Blob([typedArray], { type: 'application/pdf' });
  } catch (e) {
    throw new Error("Clave incorrecta o archivo corrupto");
  }
};

/**
 * Convierte un WordArray de CryptoJS a un Uint8Array.
 * Necesario para transformar el resultado del descifrado en un Blob utilizable.
 * @param {CryptoJS.lib.WordArray} wordArray - Resultado del descifrado.
 * @returns {Uint8Array} Datos en formato Uint8Array.
 */
function wordArrayToUint8Array(wordArray) {
  const length = wordArray.sigBytes;
  const words = wordArray.words;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return result;
}