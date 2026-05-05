// ===============================================================
// VerifierTool.jsx
// Componente para la verificación pública de credenciales.
// Permite consultar el estado y autenticidad de un título,
// y descifrar el documento original si se dispone de la clave.
// Funciona sin necesidad de wallet (modo solo lectura).
// ===============================================================

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { useWeb3 } from '../../hooks/useWeb3';
import { getCredentialFull } from '../../services/web3/contractService';
import { isValidCredentialId } from '../../utils/validators';
import { hashKey, decryptFile } from '../../lib/crypto';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, Unlock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

// Función auxiliar: formatea direcciones Ethereum para mostrar solo primeros y últimos caracteres
const fmt = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

const VerifierTool = () => {
  // -------------------------------------------------------------
  // 1. Obtención de datos desde el hook useWeb3
  // -------------------------------------------------------------
  // - readOnlyContract: instancia del contrato con proveedor público
  //                     (no necesita wallet conectada)
  // - isConnected:      indica si hay wallet conectada (solo informativo,
  //                     no es necesario para la verificación)
  const { readOnlyContract, isConnected } = useWeb3();

  // -------------------------------------------------------------
  // 2. Estados para la consulta y verificación
  // -------------------------------------------------------------
  const [credentialId, setCredentialId] = useState('');        // ID introducido por el usuario
  const [credentialData, setCredentialData] = useState(null);  // Datos completos de la credencial (on-chain)
  const [loading, setLoading] = useState(false);               // Flag durante la consulta
  const [error, setError] = useState('');                      // Mensaje de error si algo falla
  const [metadataValid, setMetadataValid] = useState(null);    // Resultado de la comparación de hashes
  const [metadataContent, setMetadataContent] = useState(null);// Contenido del JSON descargado de IPFS

  // -------------------------------------------------------------
  // 3. Estados para el descifrado del documento
  // -------------------------------------------------------------
  const [unlockKey, setUnlockKey] = useState('');              // Clave introducida por el usuario
  const [decrypting, setDecrypting] = useState(false);        // Flag durante el proceso de descifrado

  // -------------------------------------------------------------
  // 4. Función principal de verificación pública
  // -------------------------------------------------------------
  // Flujo:
  // 1. Validar que el ID sea correcto
  // 2. Obtener datos del contrato (getCredentialFull)
  // 3. Descargar el archivo metadata.json desde IPFS usando el CID
  // 4. Recalcular el hash Keccak-256 del JSON descargado
  // 5. Comparar con el metadataHash almacenado en el contrato
  // 6. Mostrar el resultado (válido/alterado) y los metadatos
  const handleVerify = async () => {
    if (!readOnlyContract) return toast.error('Servicio de verificación no disponible');
    if (!isValidCredentialId(credentialId)) return toast.error('ID de credencial inválido');
    
    setLoading(true); 
    setError(''); 
    setCredentialData(null);
    setMetadataValid(null); 
    setMetadataContent(null);
    setUnlockKey('');

    try {
      // Paso 1: Consultar el contrato inteligente (solo lectura, sin gas)
      const data = await getCredentialFull(readOnlyContract, credentialId);
      setCredentialData(data);
      
      // Paso 2: Descargar el JSON de metadatos desde IPFS
      // Se utiliza el gateway público de Pinata
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${data.credential.ipfsCID}/metadata.json`);
      if (!response.ok) throw new Error('No se pudo descargar metadata.json de IPFS');
      
      const raw = await response.text();
      const metadataJson = JSON.parse(raw);
      setMetadataContent(metadataJson);
      
      // Paso 3: Verificar la integridad mediante hash
      // Se recalcula el hash Keccak-256 del JSON descargado
      const calculatedHash = ethers.keccak256(ethers.toUtf8Bytes(raw));
      const isValid = calculatedHash === data.credential.metadataHash;
      
      setMetadataValid(isValid);
      isValid ? toast.success('Metadatos verificados y auténticos') : toast.error('¡Cuidado! Metadatos alterados');
      
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally { 
      setLoading(false); 
    }
  };

  // -------------------------------------------------------------
  // 5. Función para descifrar el documento original
  // -------------------------------------------------------------
  // Flujo:
  // 1. Validar que la clave no esté vacía
  // 2. Calcular el hash de la clave introducida
  // 3. Comparar con el passwordHash almacenado en el contrato
  // 4. Si coincide, descargar el PDF cifrado desde IPFS
  // 5. Descifrar localmente con AES-256-GCM
  // 6. Abrir el PDF descifrado en una nueva pestaña
  const handleDecrypt = async () => {
    if (!unlockKey.trim()) return toast.error("Introduce la clave de acceso");
    
    setDecrypting(true);
    try {
      // Validación de la clave mediante hash (sin exponer la clave original)
      const inputHash = hashKey(unlockKey.trim());
      
      if (inputHash !== credentialData.credential.passwordHash) {
        throw new Error("Clave incorrecta. Acceso denegado.");
      }

      toast.success("Clave correcta. Descargando documento...");

      // Descargar el archivo cifrado desde IPFS
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${credentialData.credential.ipfsCID}/titulo.pdf.enc`);
      if (!response.ok) throw new Error("No se encontró el archivo cifrado en IPFS");
      
      const encryptedText = await response.text();

      // Descifrar el documento localmente
      toast.loading("Descifrando...", { id: 'decrypt' });
      const pdfBlob = await decryptFile(encryptedText, unlockKey.trim());
      toast.success("Documento descifrado con éxito", { id: 'decrypt' });

      // Mostrar el PDF en una nueva pestaña del navegador
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

    } catch (err) {
      toast.dismiss('decrypt');
      toast.error(err.message);
    } finally {
      setDecrypting(false);
    }
  };

  // Estado revocado: si la credencial está revocada, se deshabilita el descifrado
  const revoked = credentialData?.credential?.revoked;

  // -------------------------------------------------------------
  // 6. Renderizado del componente
  // -------------------------------------------------------------
  return (
    <div className="">
      {/* ---------- Tarjeta de búsqueda ---------- */}
      <Card className="shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Verificador Público de Credenciales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Introduce el ID de registro para comprobar la autenticidad y estado de un título.
            {!isConnected && ' No se requiere conexión a wallet.'}
          </p>
          <div className="space-y-2">
            <Label htmlFor="credId">ID de Credencial en Blockchain</Label>
            <div className="flex gap-2">
              <Input
                id="credId"
                type="number"
                placeholder="Ej. 1"
                value={credentialId}
                onChange={e => setCredentialId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                className="font-mono text-lg"
              />
              <Button onClick={handleVerify} disabled={loading} className="w-32">
                {loading ? 'Buscando...' : 'Verificar'}
              </Button>
            </div>
          </div>

          {/* Mensaje de error (si lo hay) */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Resultados de la verificación (si hay datos) ---------- */}
      {credentialData && (
        <Card className="border-t-4 border-t-slate-800 shadow-xl">
          <CardHeader className="pb-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                Registro <span className="font-mono text-blue-600">#{credentialId}</span>
              </CardTitle>
              {/* Badge de estado: revocada o activa */}
              <Badge variant={revoked ? 'destructive' : 'default'} className={!revoked ? "bg-emerald-500" : ""}>
                {revoked ? 'REVOCADA' : 'ACTIVA Y VÁLIDA'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4 text-sm">
            
            {/* ----- SECCIÓN 1: Datos públicos de la blockchain ----- */}
            <div className="grid grid-cols-2 gap-y-3 p-4 bg-slate-50 rounded-xl border">
              <span className="text-muted-foreground font-semibold">Institución</span>
              <span>{credentialData.institution.name}</span>
              
              <span className="text-muted-foreground font-semibold">Emisor (Wallet)</span>
              <span className="font-mono text-xs">{fmt(credentialData.credential.issuer)}</span>
              
              <span className="text-muted-foreground font-semibold">Sello de Tiempo</span>
              <span>{credentialData.credential.timestamp.toLocaleString()}</span>
              
              <span className="text-muted-foreground font-semibold">Integridad IPFS</span>
              <div className="flex items-center gap-1">
                {metadataValid ? (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="w-3 h-3 mr-1"/> Intacta
                  </Badge>
                ) : (
                  <Badge variant="destructive">Alterada</Badge>
                )}
              </div>
            </div>

            {/* ----- SECCIÓN 2: Metadatos del título (públicos) ----- */}
            {metadataContent && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 border-b pb-1">Datos del Título</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm pl-2">
                  <span className="text-muted-foreground">Alumno</span>
                  <span className="font-medium">{metadataContent.nombre}</span>
                  <span className="text-muted-foreground">Titulación</span>
                  <span className="font-medium">{metadataContent.titulo}</span>
                  <span className="text-muted-foreground">Calificación</span>
                  <span>{metadataContent.nota}</span>
                  <span className="text-muted-foreground">Fecha Emisión</span>
                  <span>{metadataContent.fecha}</span>
                </div>
              </div>
            )}

            <Separator />

            {/* ----- SECCIÓN 3: Zona de privacidad (descifrado del PDF) ----- */}
            <div className="bg-slate-900 rounded-xl p-5 text-slate-100 space-y-4 relative overflow-hidden">
              {/* Icono decorativo de fondo */}
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Lock className="w-24 h-24" />
              </div>
              
              <div>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Documento Cifrado
                </h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[80%]">
                  El PDF original está protegido criptográficamente. Introduce la clave proporcionada por el emisor para visualizarlo.
                </p>
              </div>

              {/* Formulario de entrada de clave */}
              <div className="flex gap-2 relative z-10">
                <Input
                  type="password"
                  placeholder="Introduce la clave de acceso..."
                  value={unlockKey}
                  onChange={e => setUnlockKey(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                <Button 
                  onClick={handleDecrypt} 
                  disabled={decrypting || !unlockKey.trim() || revoked}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  {decrypting ? 'Abriendo...' : <><Unlock className="w-4 h-4 mr-2" /> Descifrar PDF</>}
                </Button>
              </div>
            </div>

            {/* ----- Enlace para auditores (JSON raw en IPFS) ----- */}
            <div className="pt-2 text-center">
              <a href={`https://gateway.pinata.cloud/ipfs/${credentialData.credential.ipfsCID}/metadata.json`}
                target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                Ver JSON original en IPFS
              </a>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VerifierTool;