// ===============================================================
// Dashboard.jsx
// Componente principal que organiza la interfaz según el rol del usuario.
// Muestra diferentes vistas/páneles dependiendo de si el usuario está conectado
// y qué permisos tiene (owner, emisor autorizado, o solo verificador público).
// ===============================================================

import { React, useEffect } from 'react';
import { useWeb3 } from '../../hooks/useWeb3';                    // Hook con la información de conexión y roles
import { useWeb3Modal, useDisconnect } from '@web3modal/ethers/react';          // Hook para abrir el modal de selección de wallet
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminPanel from './AdminPanel';
import IssuerPanel from './IssuerPanel';
import VerifierTool from './VerifierTool';


const Dashboard = () => {
  // -------------------------------------------------------------
  // 1. Extracción de datos del hook useWeb3
  // -------------------------------------------------------------
  // - isConnected:      boolean que indica si hay una wallet conectada
  // - userAddress:      dirección de la wallet (formato hexadecimal)
  // - isOwner:          true si la dirección es la del propietario del contrato
  // - isIssuer:         true si la dirección está autorizada para emitir credenciales
  // - issuerInstitution: objeto con nombre y país de la institución a la que pertenece el emisor
  const { isConnected, userAddress, isOwner, isIssuer, issuerInstitution, disconnectAndClear } = useWeb3();
  // -------------------------------------------------------------
  // 2. Hook para abrir el modal de selección de wallet (Web3Modal)
  // -------------------------------------------------------------
  const { open } = useWeb3Modal();

  // -------------------------------------------------------------
  // 3. Renderizado cuando NO hay wallet conectada (modo público)
  // -------------------------------------------------------------
  // En este estado, solo se muestra el verificador público y un botón
  // para que las instituciones puedan iniciar sesión.
  if (!isConnected) {
    return (
      <div className="">
        {/* Sección Hero simplificada para usuarios no autenticados */}
        <div className="max-w-3xl bg-white px-4 mx-auto space-y-20 mb-12">
          <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Certificados Académicos <span className="text-blue-600">Blockchain</span>
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Plataforma de verificación inmediata de títulos. Si eres una institución autorizada, conecta tu wallet para gestionar credenciales.
            </p>
            {/* Botón que abre el modal de Web3Modal para conectar wallet */}
            <Button variant="outline" size="sm" onClick={() => open()} className="text-xs text-muted-foreground">
              Acceso Institucional
            </Button>
          </div>
        </div>

        {/* Verificador público siempre visible, incluso sin conexión */}
        <div className="max-w-3xl mx-auto px-4 space-y-20">
          <div className="relative">
            <div className="mb-6">
              <h2 className="text-xl font-black uppercase tracking-[0.3em] text-emerald-700 flex items-center justify-center gap-3">
                <span className="h-px w-20 bg-emerald-200"></span>
                Verificador Público
                <span className="h-px w-20 bg-emerald-200"></span>
              </h2>
            </div>
            <div className="transition-all duration-500 hover:translate-y-[-4px]">
              <VerifierTool />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. Renderizado cuando HAY wallet conectada (modo autenticado)
  // -------------------------------------------------------------
  // En este bloque se muestran diferentes páneles según los permisos del usuario.
  // - El panel de administración solo aparece si isOwner === true
  // - El panel de emisión solo aparece si isIssuer === true
  // - El verificador público aparece siempre (incluso para usuarios autenticados)
  return (
    <div className="">
      
      {/* ---------- HERO para usuario autenticado ---------- */}
      {/* Muestra información de la wallet conectada y los roles del usuario */}
      <div className="max-w-3xl bg-white px-4 mx-auto space-y-20 mb-12">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center space-y-5">
          
          {/* Indicador "Live" que muestra la red activa (Sepolia) */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Conexión Segura — Sepolia
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 italic">
            PANEL DE{' '}
            <span className="text-blue-600 not-italic">
              {isOwner ? 'ADMINISTRADOR' : isIssuer ? 'EMISOR' : 'USUARIO'}
            </span>
          </h1>

          {/* Badges que indican los roles del usuario */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-2">
              {isOwner && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 px-4 py-1 rounded-lg shadow-none font-bold text-[10px] tracking-wider uppercase">
                 Admin Owner
                </Badge>
              )}
              {isIssuer && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 px-4 py-1 rounded-lg shadow-none font-bold text-[10px] tracking-wider uppercase">
                  {issuerInstitution?.name || 'Emisor Autorizado'}
                </Badge>
              )}
            </div>

            {/* Dirección de la wallet (truncada para mejor visualización) */}
            <div className="group relative">
              <p className="font-mono text-[10px] text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-dashed transition-colors group-hover:border-blue-300 group-hover:text-blue-500">
                Wallet: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </p>
            </div>
          </div>

          {/* Botón para cambiar de wallet (abre el modal de Web3Modal) */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={disconnectAndClear} 
            className="text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:text-blue-600 transition-all hover:bg-transparent"
          >
            [ DESCONECTAR WALLET ]
          </Button>
        </div>
      </div>

      {/* ---------- CUERPO PRINCIPAL (Módulos) ---------- */}
      <div className="max-w-3xl mx-auto px-4 space-y-20">
        
        {/* MÓDULO 1: Panel de administración (solo para owner) */}
        {/* Se encarga del registro de instituciones y autorización/revocación de emisores */}
        {isOwner && (
          <div className="relative">
            <div className="mb-6">
              <h2 className="text-xl font-black uppercase tracking-[0.3em] text-amber-600 flex items-center justify-center gap-3">
                <span className="h-px w-20 bg-amber-200"></span>
                Panel de administración
                <span className="h-px w-20 bg-amber-200"></span>
              </h2>
            </div>
            <div className="transition-all duration-500 hover:translate-y-[-4px]">
              <AdminPanel />
            </div>
          </div>
        )}

        {/* MÓDULO 2: Panel de emisión (solo para emisores autorizados) */}
        {/* Permite cifrar, subir a IPFS y registrar nuevas credenciales */}
        {isIssuer && (
          <div className="relative">
            <div className="mb-1">
              <h2 className="text-xl font-black uppercase tracking-[0.3em] text-blue-700 flex items-center justify-center gap-3">
                <span className="h-px w-20 bg-blue-200"></span>
                Gestión Universitaria
                <span className="h-px w-20 bg-blue-200"></span>
              </h2>
            </div>
            <div className="transition-all duration-500 hover:translate-y-[-4px]">
              <IssuerPanel />
            </div>
          </div>
        )}

        {/* MÓDULO 3: Verificador público (siempre visible) */}
        {/* Permite consultar credenciales por ID y descifrar documentos con la clave correcta */}
        <div className="relative">
          <div className="mb-6">
            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-emerald-700 flex items-center justify-center gap-3">
              <span className="h-px w-20 bg-emerald-200"></span>
              Verificador Público
              <span className="h-px w-20 bg-emerald-200"></span>
            </h2>
          </div>
          <div className="transition-all duration-500 hover:translate-y-[-4px]">
            <VerifierTool />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;