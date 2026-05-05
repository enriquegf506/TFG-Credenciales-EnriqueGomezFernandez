// ===============================================================
// Header.jsx
// Componente de cabecera fija en la parte superior de la aplicación.
// Muestra información de estado: red blockchain, roles del usuario,
// dirección de la wallet y estado de conexión.
// ===============================================================

import React from 'react';
import { useWeb3 } from '../../hooks/useWeb3';
import { Badge } from '@/components/ui/badge';

// Función auxiliar: acorta direcciones Ethereum de 42 caracteres a un formato legible
// Ejemplo: 0x1234567890abcdef... → 0x1234…cdef
const fmt = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

const Header = () => {
  // -------------------------------------------------------------
  // 1. Obtención de datos desde el hook useWeb3
  // -------------------------------------------------------------
  // - chainId:        identificador numérico de la red conectada
  //                   (11155111 = Sepolia, 1 = Ethereum Mainnet, etc.)
  // - isConnected:    booleano que indica si hay una wallet conectada
  // - userAddress:    dirección de la wallet (formato hexadecimal)
  // - isOwner:        true si la dirección conectada es el owner del contrato
  // - isIssuer:       true si la dirección tiene permisos de emisor autorizado
  const { chainId, isConnected, userAddress, isOwner, isIssuer } = useWeb3();
  
  // Detección de red incorrecta: solo se soporta Sepolia (chainId 11155111)
  const wrongNetwork = chainId && chainId !== 11155111;

  // -------------------------------------------------------------
  // 2. Renderizado del header
  // -------------------------------------------------------------
  // El header es fijo y visible en todas las páginas (sticky top-0)
  // Incluye:
  // - Logo/nombre de la aplicación en la izquierda
  // - Badges de estado y dirección de wallet en la derecha
  return (
    <header className="border-b bg-background px-6 h-14 flex items-center justify-between sticky top-0 z-50">
      
      {/* LOGO / NOMBRE DE LA APLICACIÓN */}
      <span className="font-semibold tracking-tight">
        Blockchain Academic Credentials
      </span>

      {/* ÁREA DE INFORMACIÓN DE ESTADO (esquina derecha) */}
      <div className="flex items-center gap-3">
        
        {/* Badge rojo que aparece si el usuario está en la red incorrecta */}
        {wrongNetwork && (
          <Badge variant="destructive"> Usa la red Sepolia</Badge>
        )}
        
        {/* Badge de "Owner": aparece cuando el usuario conectado es el propietario del contrato */}
        {isOwner  && <Badge>Owner</Badge>}
        
        {/* Badge de "Emisor": aparece cuando el usuario tiene permisos de emisión */}
        {isIssuer && <Badge variant="secondary">Emisor</Badge>}
        
        {/* Dirección formateada o mensaje de "no conectado" según el estado de conexión */}
        {isConnected ? (
          <span className="text-sm text-muted-foreground font-mono"> 
            {fmt(userAddress)} 
          </span>
        ) : (
          <span className="text-sm text-muted-foreground font-mono"> 
            No conectado a ninguna wallet 
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;