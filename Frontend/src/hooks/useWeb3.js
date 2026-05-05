// ===============================================================
// useWeb3.js
// Hook personalizado que gestiona la conexión con wallets blockchain
// utilizando Web3Modal (soportando MetaMask, WalletConnect, Coinbase, etc.).
// Proporciona la instancia del contrato inteligente y los roles del usuario.
// ===============================================================

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  createWeb3Modal, 
  defaultConfig, 
  useWeb3ModalProvider, 
  useWeb3ModalAccount 
} from '@web3modal/ethers/react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../services/web3/config';
import { readOnlyContract } from '../services/web3/readOnlyProvider';

const projectId = import.meta.env.VITE_WEB3MODAL_PROJECT_ID;   // ID del proyecto en Web3Modal Cloud

// Definición de la red Sepolia (testnet de Ethereum)
const sepolia = {
  chainId: 11155111,                                   // Identificador numérico de Sepolia
  name: 'Sepolia',                                     // Nombre de la red
  currency: 'ETH',                                     // Moneda
  explorerUrl: 'https://sepolia.etherscan.io',         // URL del explorador de bloques
  rpcUrl: 'https://rpc.ankr.com/eth_sepolia'           // Endpoint RPC público
};

// Inicializar Web3Modal con la configuración de la red y metadatos de la aplicación
createWeb3Modal({
  ethersConfig: defaultConfig({ 
    metadata: { 
      name: 'TFG Títulos', 
      description: 'Sistema de Credenciales', 
      url: '', 
      icons: [] 
    } 
  }),
  chains: [sepolia],
  projectId
});

/**
 * Hook que gestiona la conexión con la wallet, el contrato inteligente y los roles del usuario.
 * @returns {Object} Estado actual de la conexión y datos del contrato.
 */
export const useWeb3 = () => {
  // Hooks de Web3Modal para acceder al estado de la wallet conectada
  const { address, isConnected } = useWeb3ModalAccount();   // Dirección y estado de conexión
  const { walletProvider } = useWeb3ModalProvider();        // Proveedor EIP-1193 (inyectado por la wallet)

  // Estados internos del hook
  const [contract, setContract] = useState(null);           // Instancia del contrato (firmada)
  const [isOwner, setIsOwner] = useState(false);            // Indica si la wallet es el owner del contrato
  const [isIssuer, setIsIssuer] = useState(false);          // Indica si la wallet es emisor autorizado
  const [issuerInstitution, setIssuerInstitution] = useState(null); // Datos de la institución asociada

  /**
   * Consulta el contrato inteligente para obtener el owner, verificar si la dirección
   * está autorizada como emisor y recuperar los metadatos de su institución.
   * @async
   * @function loadBlockchainData
   * @returns {Promise<void>}
   */
  const loadBlockchainData = useCallback(async () => {
    // Solo ejecutar si hay conexión activa y dirección disponible
    if (!isConnected || !walletProvider || !address) return;

    try {
      // Crear un proveedor ethers a partir del walletProvider de Web3Modal
      const ethersProvider = new ethers.BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();        // Obtener el firmante (signer)
      
      // Instanciar el contrato inteligente con el signer (permite transacciones de escritura)
      const inst = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(inst);

      // Consultar el owner del contrato y comparar con la dirección actual
      const owner = await inst.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());

      // Verificar si la dirección está autorizada como emisor
      const authorized = await inst.isAuthorizedIssuer(address);
      setIsIssuer(authorized);

      // Si es emisor, obtener los datos de su institución
      if (authorized) {
        const instId = await inst.issuerToInstitution(address);   // ID de institución
        const instData = await inst.institutions(instId);         // Datos de la institución
        setIssuerInstitution({
          name: instData.name,
          country: instData.country
        });
      }
    } catch (err) {
      console.error("Error cargando datos de contrato:", err);
    }
  }, [isConnected, walletProvider, address]);

  /**
   * Ejecuta `loadBlockchainData` cada vez que cambian las dependencias.
   * Esto garantiza que los roles se actualicen al conectar/desconectar la wallet
   * o al cambiar de cuenta.
   */
  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  return {
    userAddress: address,           // Dirección de la wallet (undefined si no conectada)
    isConnected,                    // Booleano: hay wallet conectada
    contract,                       // Instancia del contrato con signer (para escritura)
    readOnlyContract,               // Instancia de solo lectura (importada externamente)
    isOwner,                        // Booleano: el usuario es el owner del contrato
    isIssuer,                       // Booleano: el usuario es emisor autorizado
    issuerInstitution               // Objeto { name, country } de la institución (si aplica)
  };
};