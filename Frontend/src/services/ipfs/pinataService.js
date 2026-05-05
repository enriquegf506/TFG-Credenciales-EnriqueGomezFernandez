// ==============================================================
// pinataService.js
// Servicio para interactuar con Pinata (pinning sobre IPFS).
// Proporciona funciones para subir archivos individuales, carpetas
// y archivos cifrados, utilizando la API REST de Pinata.
// ==============================================================

import axios from 'axios';

// --------------------------------------------------------------
// Configuración de Pinata (claves desde variables de entorno)
// --------------------------------------------------------------
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
const PINATA_BASE_URL = 'https://api.pinata.cloud';

/**
 * Sube varios archivos como si fueran una sola carpeta virtual.
 * @param {Array<{file: File, filename: string}>} files - Lista de archivos con sus nombres.
 * @returns {Promise<string>} CID de la carpeta raíz.
 */
export const uploadFolderToIPFS = async (files) => {
  const formData = new FormData();
  const rootFolder = "credencial_academica";

  files.forEach(({ file, filename }) => {
    // Se añade cada archivo con una ruta dentro de la carpeta virtual
    formData.append('file', file, `${rootFolder}/${filename}`);
  });

  // Metadatos opcionales para identificar la carpeta en el panel de Pinata
  const metadata = JSON.stringify({name: `Carpeta_Credencial_${Date.now()}`,});
  formData.append('pinataMetadata', metadata);

  try {
    const response = await axios.post(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, formData, {
      maxBodyLength: "Infinity", // Necesario para archivos grandes como PDFs
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    if (response.data && response.data.IpfsHash) {
      console.log("Carpeta subida. CID:", response.data.IpfsHash);
      return response.data.IpfsHash;
    } else {
      throw new Error('No se recibió CID de Pinata');
    }
  } catch (error) {
    if (error.response) {
      console.error('Detalles del error Pinata:', error.response.data);
    }
    throw error;
  }
};
