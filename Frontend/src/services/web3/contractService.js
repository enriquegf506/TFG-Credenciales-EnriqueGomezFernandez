// ==============================================================
// contractService.js
// Servicio que encapsula todas las interacciones con el contrato inteligente.
// Cada función maneja la creación de la transacción, espera de confirmación,
// extracción de eventos y gestión de errores (con toasts).
// ==============================================================

import { ethers } from 'ethers';
import toast from 'react-hot-toast';

/**
 * Transforma errores de la librería ethers o del contrato en mensajes legibles.
 * @param {Error} error - Error original capturado.
 * @param {string} [defaultMessage='Error en la operación'] - Mensaje por defecto si no se reconoce el error.
 * @throws {Error} Siempre lanza una excepción con el mensaje traducido.
 */
const handleContractError = (error, defaultMessage = 'Error en la operación') => {
  console.error('Contract error:', error);
  if (error.code === 'ACTION_REJECTED') throw new Error('Transacción rechazada por el usuario');
  if (error.code === 'INSUFFICIENT_FUNDS') throw new Error('Fondos insuficientes para el gas');
  if (error.message?.includes('not an authorized issuer')) throw new Error('No tienes permisos para emitir credenciales');
  if (error.message?.includes('credential not found')) throw new Error('Credencial no encontrada');  
  if (error.message?.includes('Credential does not exist')) throw new Error('La credencial no existe');
  if (error.message?.includes('already revoked')) throw new Error('La credencial ya está revocada');
  if (error.message?.includes('Unauthorized to revoke this credential')) throw new Error('Solo los emisores de la misma institución o el owner pueden revocar');
  throw new Error(error.message || defaultMessage);
};

// --------------------------------------------------------------
// Funciones de administración (owner)
// --------------------------------------------------------------

/**
 * Registra una nueva institución educativa en el contrato (solo owner).
 * @param {ethers.Contract} contract - Instancia del contrato con signer.
 * @param {string} name - Nombre de la institución.
 * @param {string} country - País de la institución.
 * @param {string} [did=''] - Identificador descentralizado opcional (did:ethr...).
 * @returns {Promise<{institutionId: number, transactionHash: string}>} - ID asignado y hash de la transacción.
 * @throws {Error} Si el contrato no está inicializado, la transacción falla o no se encuentra el evento.
 */
export const registerInstitution = async (contract, name, country, did = '') => {
  if (!contract) throw new Error('Contrato no inicializado');
  try {
    const tx = await contract.registerInstitution(name, country, did);
    toast.loading('Registrando institución...', { id: 'registerInst' });
    const receipt = await tx.wait();
    toast.dismiss('registerInst');

    // Buscar el evento InstitutionRegistered en los logs de la transacción
    const event = receipt.logs
      .map(log => {
        try { return contract.interface.parseLog(log); } catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'InstitutionRegistered');

    if (event) {
      return { institutionId: Number(event.args.institutionId), transactionHash: tx.hash };
    } else {
      throw new Error('No se pudo obtener el ID de la institución');
    }
  } catch (error) {
    toast.dismiss('registerInst');
    handleContractError(error, 'Error al registrar institución');
  }
};

/**
 * Autoriza una dirección Ethereum para que pueda emitir credenciales en nombre de una institución (solo owner).
 * @param {ethers.Contract} contract - Instancia del contrato con signer.
 * @param {string} issuerAddress - Dirección que se quiere autorizar.
 * @param {number} institutionId - ID de la institución a la que pertenecerá el emisor.
 * @returns {Promise<string>} - Hash de la transacción.
 * @throws {Error} Si el contrato no está inicializado o la transacción falla.
 */
export const authorizeIssuer = async (contract, issuerAddress, institutionId) => {
  if (!contract) throw new Error('Contrato no inicializado');
  try {
    const tx = await contract.authorizeIssuer(issuerAddress, institutionId);
    toast.loading('Autorizando emisor...', { id: 'authIssuer' });
    await tx.wait();
    toast.dismiss('authIssuer');
    return tx.hash;
  } catch (error) {
    toast.dismiss('authIssuer');
    handleContractError(error, 'Error al autorizar emisor');
  }
};

/**
 * Revoca los permisos de emisión de una dirección (solo owner).
 * @param {ethers.Contract} contract - Instancia del contrato con signer.
 * @param {string} issuerAddress - Dirección a la que se revocarán los permisos.
 * @returns {Promise<string>} - Hash de la transacción.
 * @throws {Error} Si el contrato no está inicializado o la transacción falla.
 */
export const revokeIssuer = async (contract, issuerAddress) => {
  if (!contract) throw new Error('Contrato no inicializado');
  try {
    const tx = await contract.revokeIssuer(issuerAddress);
    toast.loading('Revocando emisor...', { id: 'revokeIssuer' });
    await tx.wait();
    toast.dismiss('revokeIssuer');
    return tx.hash;
  } catch (error) {
    toast.dismiss('revokeIssuer');
    handleContractError(error, 'Error al revocar emisor');
  }
};

// --------------------------------------------------------------
// Funciones de emisión y revocación de credenciales
// --------------------------------------------------------------

/**
 * Emite una nueva credencial académica.
 * Calcula el hash de los metadatos (Keccak-256) y envía la transacción.
 * @param {ethers.Contract} contract - Instancia del contrato con signer.
 * @param {string} ipfsCID - CID de la carpeta IPFS que contiene el PDF cifrado y metadata.json.
 * @param {string} metadataString - Cadena JSON con los metadatos (nombre, título, calificación, fecha).
 * @param {string} passwordHash - Hash de la clave de cifrado (prefijo 0x).
 * @returns {Promise<{credentialId: number, transactionHash: string}>} - ID de la nueva credencial y hash de la transacción.
 * @throws {Error} Si el contrato no está inicializado, la transacción falla o no se encuentra el evento.
 */
export const issueCredential = async (contract, ipfsCID, metadataString, passwordHash) => {
  if (!contract) throw new Error('Contrato no inicializado');
  
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(metadataString));
  
  try {
    console.log("Enviando a Blockchain:", { ipfsCID, metadataHash, passwordHash });
    const tx = await contract.issueCredential(ipfsCID, metadataHash, passwordHash);
    
    toast.loading('Confirmando en Blockchain...', { id: 'eth-tx' });
    const receipt = await tx.wait();
    toast.dismiss('eth-tx');

    // Extraer el ID de la credencial desde el evento CredentialIssued
    const event = receipt.logs
      .map(log => {
        try { return contract.interface.parseLog(log); } catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'CredentialIssued');

    return {
      credentialId: Number(event.args.credentialId),
      transactionHash: tx.hash,
    };
  } catch (error) {
    console.error("DETALLE DEL ERROR BLOCKCHAIN:", error);
    throw new Error(error.reason || "Error en la transacción blockchain");
  }
};

/**
 * Revoca una credencial existente (solo emisor original, emisor de la misma institución u owner).
 * @param {ethers.Contract} contract - Instancia del contrato con signer.
 * @param {number} credentialId - Identificador de la credencial a revocar.
 * @returns {Promise<string>} - Hash de la transacción.
 * @throws {Error} Si el contrato no está inicializado o la transacción falla.
 */
export const revokeCredential = async (contract, credentialId) => {
  if (!contract) throw new Error('Contrato no inicializado');
  try {
    const tx = await contract.revokeCredential(credentialId);
    toast.loading('Revocando credencial...', { id: 'revokeCred' });
    await tx.wait();
    toast.dismiss('revokeCred');
    return tx.hash;
  } catch (error) {
    toast.dismiss('revokeCred');
    handleContractError(error, 'Error al revocar credencial');
  }
};

// --------------------------------------------------------------
// Funciones de consulta (solo lectura)
// --------------------------------------------------------------

/**
 * Obtiene todos los datos de una credencial (incluyendo la institución emisora) a partir de su ID.
 * Puede usarse tanto con un contrato firmado como con uno de solo lectura.
 * @param {ethers.Contract} contract - Instancia del contrato (firmada o solo lectura).
 * @param {number} credentialId - ID de la credencial.
 * @returns {Promise<{credential: object, institution: object}>} - Objeto con dos campos: `credential` (datos de la credencial) y `institution` (datos de la institución).
 * @throws {Error} Si el contrato no está disponible o la consulta falla.
 */
export const getCredentialFull = async (contract, credentialId) => {
  if (!contract) throw new Error('Contrato no disponible');
  try {
    const result = await contract.getCredential(credentialId);
    const cred = result[0];
    const institution = result[1];
    return {
      credential: {
        institutionId: Number(cred.institutionId),
        issuer: cred.issuer,
        ipfsCID: cred.ipfsCID,
        metadataHash: cred.metadataHash,
        passwordHash: cred.passwordHash,
        timestamp: new Date(Number(cred.timestamp) * 1000),
        revoked: cred.revoked,
        credentialDID: cred.credentialDID
      },
      institution: {
        name: institution.name,
        country: institution.country,
        did: institution.did,
        active: institution.active,
        createdAt: new Date(Number(institution.createdAt) * 1000)
      }
    };
  } catch (error) {
    handleContractError(error, 'Error al consultar credencial');
  }
};

/**
 * Obtiene la institución asociada a una dirección de emisor autorizado.
 * @param {ethers.Contract} contract - Instancia del contrato (firmada o solo lectura).
 * @param {string} issuerAddress - Dirección del emisor.
 * @returns {Promise<{institution: object, institutionId: number}>} - Datos de la institución y su ID.
 * @throws {Error} Si el contrato no está disponible o la consulta falla.
 */
export const getInstitutionByIssuer = async (contract, issuerAddress) => {
  if (!contract) throw new Error('Contrato no disponible');
  try {
    const result = await contract.getInstitutionByIssuer(issuerAddress);
    const institution = result[0];
    const institutionId = Number(result[1]);
    return {
      institution: {
        name: institution.name,
        country: institution.country,
        did: institution.did,
        isActive: institution.isActive,
        createdAt: new Date(Number(institution.createdAt) * 1000)
      },
      institutionId
    };
  } catch (error) {
    handleContractError(error, 'Error al obtener institución del emisor');
  }
};

/**
 * Obtiene el número total de credenciales emitidas hasta el momento.
 * @param {ethers.Contract} contract - Instancia del contrato (firmada o solo lectura).
 * @returns {Promise<number>} - Cantidad de credenciales.
 * @throws {Error} Si el contrato no está disponible o la consulta falla.
 */
export const getCredentialCount = async (contract) => {
  if (!contract) throw new Error('Contrato no disponible');
  try {
    const count = await contract.getCredentialCount();
    return Number(count);
  } catch (error) {
    handleContractError(error, 'Error al obtener número de credenciales');
  }
};