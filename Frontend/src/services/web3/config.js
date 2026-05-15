// ==============================================================
// config.js
// Configuración básica para conectar con el contrato inteligente.
// La dirección del contrato se obtiene de variables de entorno.
// El ABI se copia desde Remix tras compilar el contrato.
// ==============================================================

import contractABI from './contractABI.json';

// Dirección del contrato desplegado en Sepolia (variable de entorno)
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;


// ABI (Application Binary Interface) del contrato.
// Define las funciones, eventos y estructuras que puede llamar el frontend.
export const CONTRACT_ABI = contractABI;

// Redes soportadas (para validación)
export const SUPPORTED_CHAINS = {
  11155111: { name: 'Sepolia', explorer: 'https://sepolia.etherscan.io' },
  80002: { name: 'Amoy', explorer: 'https://amoy.polygonscan.com' } 
};