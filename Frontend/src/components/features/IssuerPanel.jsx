// ===============================================================
// IssuerPanel.jsx
// Componente principal para la emisión y revocación de credenciales.
// Solo se renderiza cuando el usuario conectado tiene permisos de emisor.
// ===============================================================

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { generateRandomKey, hashKey, encryptFile } from '../../lib/crypto';
import toast from 'react-hot-toast';
import { useWeb3 } from '../../hooks/useWeb3';
import { uploadFolderToIPFS } from '../../services/ipfs/pinataService';
import { issueCredential, revokeCredential, getCredentialFull } from '../../services/web3/contractService';
import { isValidCredentialId } from '../../utils/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AdminPanel from './AdminPanel';
import { Copy, CheckCircle } from "lucide-react";

// Función auxiliar para formatear direcciones Ethereum (ej: 0x1234...5678)
const fmt = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

const IssuerPanel = () => {
  // -------------------------------------------------------------
  // 1. Obtención de datos desde el hook useWeb3
  // -------------------------------------------------------------
  // - userAddress:       dirección conectada (para mostrarla en la UI)
  // - contract:          instancia firmada del contrato (para escritura)
  // - isOwner:           booleano que indica si el usuario es el owner del sistema
  // - isIssuer:          booleano que indica si el usuario tiene permisos de emisión
  // - readOnlyContract:  instancia de solo lectura (para consultas sin wallet)
  // - issuerInstitution: datos de la institución a la que pertenece el emisor
  const { userAddress, contract, isOwner, isIssuer, readOnlyContract, issuerInstitution } = useWeb3();
  // -------------------------------------------------------------
  // 2. Estados para el formulario de emisión
  // -------------------------------------------------------------
  const [file,     setFile]     = useState(null);      // Archivo PDF seleccionado
  const [formData, setFormData] = useState({ nombre: '', nota: '', titulo: '', fecha: '' }); // Metadatos
  const [issuing,  setIssuing]  = useState(false);     // Flag de carga durante la emisión
  const [result,   setResult]   = useState(null);      // Resultado de la emisión (ID, clave, txHash)

  // -------------------------------------------------------------
  // 3. Estados para la revocación de credenciales
  // -------------------------------------------------------------
  const [revokeId,           setRevokeId]           = useState('');        // ID de la credencial a revocar
  const [revoking,           setRevoking]           = useState(false);      // Flag de carga durante revocación
  const [credentialToRevoke, setCredentialToRevoke] = useState(null);       // Datos de la credencial consultada
  const [checkingCredential, setCheckingCredential] = useState(false);      // Flag durante la consulta previa

  // -------------------------------------------------------------
  // 4. Configuración de react-dropzone (arrastrar y soltar archivos)
  // -------------------------------------------------------------
  // onDrop: callback que se ejecuta cuando se suelta un archivo en el área de dropzone
  // Solo se acepta un archivo (multiple: false) y únicamente formato PDF
  const onDrop = useCallback((files) => { if (files.length > 0) setFile(files[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false
  });

  // -------------------------------------------------------------
  // 5. Manejo de cambios en los campos del formulario
  // -------------------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Valida que todos los campos de metadatos estén completos y que haya un archivo seleccionado
  const validateForm = () => formData.nombre && formData.nota && formData.titulo && formData.fecha && file;

  // -------------------------------------------------------------
  // 6. Función principal de emisión de credenciales
  // -------------------------------------------------------------
  // Flujo completo:
  // 1. Validar que el contrato existe y los datos son correctos
  // 2. Generar clave aleatoria y calcular su hash
  // 3. Cifrar el PDF con AES-256-GCM
  // 4. Construir el JSON de metadatos
  // 5. Subir ambos archivos a IPFS (obtener CID de carpeta)
  // 6. Registrar la credencial en el contrato (CID, hash del JSON, hash de la clave)
  // 7. Mostrar el ID de credencial y la clave al usuario
  const handleIssue = async () => {
    if (!contract) return toast.error('Conecta MetaMask para emitir');
    if (!validateForm()) return toast.error('Rellena todos los campos y selecciona un PDF');
    
    setIssuing(true); 
    setResult(null);
    
    try {
      // Generación de clave y hash (Privacy by Design)
      const clearKey = generateRandomKey();
      const pHash = hashKey(clearKey);

      // Cifrado local del PDF con AES-256-GCM
      toast.loading('Cifrando documento...', { id: 'crypto' });
      const encryptedBlob = await encryptFile(file, clearKey);
      const encryptedFile = new File([encryptedBlob], "titulo.pdf.enc", { type: 'text/plain' });
      toast.success('Documento cifrado', { id: 'crypto' });

      // Construcción del JSON de metadatos (texto plano, público)
      const metadataObj = {
        nombre: formData.nombre.trim(), 
        nota: formData.nota.toString(),
        titulo: formData.titulo.trim(), 
        fecha: formData.fecha, 
      };
      const metadataJsonString = JSON.stringify(metadataObj);
      const jsonFile = new File([metadataJsonString], 'metadata.json', { type: 'application/json' });

      // Subida de la carpeta completa a IPFS (PDF cifrado + JSON)
      toast.loading('Subiendo a IPFS...', { id: 'ipfs' });
      const folderCID = await uploadFolderToIPFS([
        { file: encryptedFile, filename: 'titulo.pdf.enc' },
        { file: jsonFile, filename: 'metadata.json' }
      ]);
      toast.success('Archivos en IPFS', { id: 'ipfs' });

      // Registro en la blockchain (firma mediante MetaMask)
      const issueResult = await issueCredential(contract, folderCID, metadataJsonString, pHash);
      
      setResult({ ...issueResult, clearKey });
      
      toast.success(`Emitida con éxito - ID: ${issueResult.credentialId}`);
      // Limpiar el formulario tras éxito
      setFile(null);
      setFormData({ nombre: '', nota: '', titulo: '', fecha: '' });

    } catch (err) { 
      toast.error(err.message); 
    } finally { 
      setIssuing(false); 
    }
  };

  // -------------------------------------------------------------
  // 7. Función para consultar una credencial antes de revocarla
  // -------------------------------------------------------------
  // Se utiliza el contrato de solo lectura (readOnlyContract) si no hay conexión
  const handleCheckCredential = async () => {
    const activeContract = contract || readOnlyContract;
    if (!activeContract) return toast.error('Servicio blockchain no disponible');
    if (!isValidCredentialId(revokeId)) return toast.error('ID inválido');
    setCheckingCredential(true); setCredentialToRevoke(null);
    try {
      const data = await getCredentialFull(activeContract, revokeId);
      if (data.credential.revoked) return toast.error('Esta credencial ya está revocada');
      setCredentialToRevoke(data);
    } catch (err) { toast.error(err.message); }
    finally { setCheckingCredential(false); }
  };

  // -------------------------------------------------------------
  // 8. Función para ejecutar la revocación de una credencial
  // -------------------------------------------------------------
  // Requiere el contrato firmado (solo posible con wallet conectada)
  const handleRevoke = async () => {
    if (!contract) return toast.error('Conecta MetaMask para revocar');
    if (!credentialToRevoke) return;
    setRevoking(true);
    try {
      await revokeCredential(contract, revokeId);
      toast.success(`Credencial ${revokeId} revocada`);
      setCredentialToRevoke(null); setRevokeId('');
    } catch (err) { toast.error(err.message); }
    finally { setRevoking(false); }
  };

  // -------------------------------------------------------------
  // 9. Renderizado del componente
  // -------------------------------------------------------------
  return (
    <div className="">
      {/* Muestra la dirección del usuario conectado (formateada) */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span className="font-mono">{fmt(userAddress)}</span>
      </div>

      {/* Panel de administración: solo visible si el usuario es owner */}
      {isOwner && <AdminPanel />}

      {/* Panel de emisión y revocación: solo visible si el usuario es emisor autorizado */}
      {isIssuer && (
        <>
          {/* ---------- Tarjeta de emisión ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Emitir credencial — {issuerInstitution?.name || 'Institución'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario de metadatos (2 columnas) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del alumno</Label>
                  <Input name="nombre" placeholder="Juan García" value={formData.nombre} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Título académico</Label>
                  <Input name="titulo" placeholder="Grado en Informática" value={formData.titulo} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Calificación</Label>
                  <Input name="nota" type="number" step="0.1" placeholder="9.5" value={formData.nota} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de emisión</Label>
                  <Input name="fecha" type="date" value={formData.fecha} onChange={handleInputChange} />
                </div>
              </div>

              {/* Área de dropzone para el PDF */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer text-sm transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}
                  ${file ? 'border-green-500 text-green-500' : 'text-muted-foreground'}`}
              >
                <input {...getInputProps()} />
                {file ? `${file.name}` : 'Arrastra el PDF aquí o haz clic para seleccionarlo'}
              </div>

              {/* Botón de emisión */}
              <Button className="w-full" onClick={handleIssue} disabled={issuing || !validateForm()}>
                {issuing ? 'Procesando transacción…' : 'Emitir credencial en blockchain'}
              </Button>

              {/* Resultado de la emisión (se muestra tras éxito) */}
              {result && (
                <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-4 text-sm space-y-3 border border-gray-200 dark:border-gray-700">
                  
                  {/* Mensaje de éxito */}
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Credencial emitida correctamente
                  </div>

                  {/* Cuadro de la clave de acceso (para copiar) */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-yellow-300 dark:border-yellow-600">
                    <Label className="text-[10px] uppercase text-gray-500 dark:text-gray-400 italic">
                      Clave de acceso (Entregar al alumno)
                    </Label>

                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
                        {result.clearKey}
                      </code>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={() => {
                          navigator.clipboard.writeText(result.clearKey);
                          toast.success("Clave copiada");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Información adicional: ID de credencial y hash de transacción */}
                  <div className="text-[11px] font-mono text-muted-foreground pt-1">
                    <p>ID: {result.credentialId}</p>
                    <p className="break-all opacity-70">TX: {result.transactionHash}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* ---------- Tarjeta de revocación ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revocar credencial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para introducir el ID y consultar */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>ID de credencial</Label>
                  <Input type="number" placeholder="1" value={revokeId} onChange={e => setRevokeId(e.target.value)} />
                </div>
                <Button
                  variant="outline"
                  className="self-end"
                  onClick={handleCheckCredential}
                  disabled={!revokeId || checkingCredential}
                >
                  {checkingCredential ? 'Buscando...' : 'Verificar ID'}
                </Button>
              </div>

              {/* Muestra los datos de la credencial si existe y está activa */}
              {credentialToRevoke && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">Emisor</span>
                    <span className="font-mono text-xs">{fmt(credentialToRevoke.credential.issuer)}</span>
                    <span className="text-muted-foreground">Institución</span>
                    <span>{credentialToRevoke.institution.name}</span>
                  </div>
                  <Button variant="destructive" className="w-full" onClick={handleRevoke} disabled={revoking}>
                    {revoking ? 'Revocando...' : 'Confirmar revocación definitiva'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default IssuerPanel;