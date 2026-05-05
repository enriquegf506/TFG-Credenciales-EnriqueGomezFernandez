// ==============================================================
// readOnlyProvider.js
// Crea una instancia del contrato con un proveedor de solo lectura.
// Se usa para consultas públicas (verificación) sin necesidad de wallet.
// ==============================================================

import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';

// RPC público de Sepolia (no requiere autenticación)
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

let readOnlyProvider;
let readOnlyContract;

try {
  readOnlyProvider = new ethers.JsonRpcProvider(RPC_URL);
  readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readOnlyProvider);
  console.log('Proveedor de solo lectura configurado correctamente');
} catch (error) {
  console.error('Error configurando proveedor de solo lectura:', error);
}

export { readOnlyProvider, readOnlyContract };