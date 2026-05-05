// ===============================================================
// AdminPanel.jsx
// Componente que agrupa los formularios de administración del sistema.
// Solo se muestra cuando el usuario conectado es el owner del contrato.
// Incluye:
//   - Registro de nuevas instituciones
//   - Autorización/revocación de emisores
//   - Revocación directa de credenciales (permiso del owner en el contrato)
// ===============================================================

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../../hooks/useWeb3';
import {
  registerInstitution,
  authorizeIssuer,
  revokeIssuer,
  revokeCredential,
  getCredentialFull
} from '../../services/web3/contractService';
import { isValidEthereumAddress, isValidCredentialId } from '../../utils/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Función auxiliar para acortar direcciones Ethereum (ej: 0x1234...5678)
const fmt = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

const AdminPanel = () => {
  // -------------------------------------------------------------
  // 1. Obtención del contrato desde el hook useWeb3
  // -------------------------------------------------------------
  // - contract: instancia firmada del contrato (para escritura)
  // - readOnlyContract: instancia de solo lectura (para consultas sin wallet)
  const { contract, readOnlyContract } = useWeb3();

  // -------------------------------------------------------------
  // 2. Estados del formulario "Registrar institución"
  // -------------------------------------------------------------
  const [instName,    setInstName]    = useState('');
  const [instCountry, setInstCountry] = useState('');
  const [instDid,     setInstDid]     = useState('');
  const [registering, setRegistering] = useState(false);   // Flag de carga para el botón

  // -------------------------------------------------------------
  // 3. Estados del formulario "Autorizar emisor"
  // -------------------------------------------------------------
  const [authIssuerAddress, setAuthIssuerAddress] = useState('');
  const [authInstitutionId, setAuthInstitutionId] = useState('');
  const [authorizing,       setAuthorizing]       = useState(false);   // Flag de carga

  // -------------------------------------------------------------
  // 4. Estados del formulario "Revocar emisor"
  // -------------------------------------------------------------
  const [revokeIssuerAddress, setRevokeIssuerAddress] = useState('');
  const [revoking,            setRevoking]            = useState(false);

  // -------------------------------------------------------------
  // 5. Estados para la revocación de credenciales (acción exclusiva del owner)
  // -------------------------------------------------------------
  const [revokeCredId,           setRevokeCredId]           = useState('');
  const [revokingCred,           setRevokingCred]           = useState(false);
  const [credentialToRevoke,     setCredentialToRevoke]     = useState(null);
  const [checkingCredential,     setCheckingCredential]     = useState(false);

  // -------------------------------------------------------------
  // 6. Función para registrar una nueva institución educativa
  // -------------------------------------------------------------
  const handleRegisterInstitution = async (e) => {
    e.preventDefault();
    if (!contract) return toast.error('Contrato no disponible');
    if (!instName.trim() || !instCountry.trim()) return toast.error('Nombre y país son obligatorios');

    setRegistering(true);
    try {
      const result = await registerInstitution(contract, instName, instCountry, instDid);
      toast.success(`Institución registrada con ID: ${result.institutionId}`);
      // Limpiar el formulario tras éxito
      setInstName('');
      setInstCountry('');
      setInstDid('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegistering(false);
    }
  };

  // -------------------------------------------------------------
  // 7. Función para autorizar una dirección como emisor
  // -------------------------------------------------------------
  const handleAuthorizeIssuer = async (e) => {
    e.preventDefault();
    if (!contract) return toast.error('Contrato no disponible');
    if (!isValidEthereumAddress(authIssuerAddress)) return toast.error('Dirección Ethereum inválida');

    const instId = Number(authInstitutionId);
    if (!Number.isInteger(instId) || instId <= 0) return toast.error('ID de institución inválido');

    setAuthorizing(true);
    try {
      await authorizeIssuer(contract, authIssuerAddress, instId);
      toast.success(`Emisor autorizado para institución ${instId}`);
      setAuthIssuerAddress('');
      setAuthInstitutionId('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAuthorizing(false);
    }
  };

  // -------------------------------------------------------------
  // 8. Función para revocar permisos de emisión
  // -------------------------------------------------------------
  const handleRevokeIssuer = async (e) => {
    e.preventDefault();
    if (!contract) return toast.error('Contrato no disponible');
    if (!isValidEthereumAddress(revokeIssuerAddress)) return toast.error('Dirección Ethereum inválida');

    setRevoking(true);
    try {
      await revokeIssuer(contract, revokeIssuerAddress);
      toast.success(`Emisor ${revokeIssuerAddress} revocado`);
      setRevokeIssuerAddress('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevoking(false);
    }
  };

  // -------------------------------------------------------------
  // 9. Función para consultar una credencial antes de revocarla (acción owner)
  // -------------------------------------------------------------
  // El owner puede revocar cualquier credencial, independientemente del emisor.
  // Se usa el contrato de solo lectura si no hay conexión (aunque para revocar sí se necesita conexión).
  const handleCheckCredential = async () => {
    const activeContract = contract || readOnlyContract;
    if (!activeContract) return toast.error('Servicio blockchain no disponible');
    if (!isValidCredentialId(revokeCredId)) return toast.error('ID de credencial inválido');

    setCheckingCredential(true);
    setCredentialToRevoke(null);
    try {
      const data = await getCredentialFull(activeContract, revokeCredId);
      // Si ya está revocada, no permitir volver a revocarla
      if (data.credential.revoked) return toast.error('Esta credencial ya está revocada');
      setCredentialToRevoke(data);
      toast.success('Credencial encontrada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCheckingCredential(false);
    }
  };

  // -------------------------------------------------------------
  // 10. Función para ejecutar la revocación de una credencial (acción owner)
  // -------------------------------------------------------------
  // Requiere el contrato firmado (wallet conectada) ya que es una transacción de escritura.
  const handleRevokeCredential = async () => {
    if (!contract) return toast.error('Conecta MetaMask para revocar');
    if (!credentialToRevoke) return;

    setRevokingCred(true);
    try {
      await revokeCredential(contract, revokeCredId);
      toast.success(`Credencial ${revokeCredId} revocada correctamente`);
      setCredentialToRevoke(null);
      setRevokeCredId('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevokingCred(false);
    }
  };

  // -------------------------------------------------------------
  // 11. Renderizado del panel (cuatro secciones separadas visualmente)
  // -------------------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Panel de Administración — Owner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* -------------- SECCIÓN 1: Registrar institución -------------- */}
        <form onSubmit={handleRegisterInstitution} className="space-y-3">
          <p className="text-sm font-bold text-orange-300">Registrar institución</p>
          <div className="space-y-2">
            <Label htmlFor="instName">Nombre</Label>
            <Input
              id="instName"
              placeholder="Universidad Nacional..."
              value={instName}
              onChange={e => setInstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instCountry">País</Label>
            <Input
              id="instCountry"
              placeholder="ES"
              value={instCountry}
              onChange={e => setInstCountry(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instDid">DID (opcional)</Label>
            <Input
              id="instDid"
              placeholder="did:ethr:sepolia:0x..."
              value={instDid}
              onChange={e => setInstDid(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={registering} className="w-full">
            {registering ? 'Registrando...' : 'Registrar institución'}
          </Button>
        </form>

        <Separator />

        {/* -------------- SECCIÓN 2: Autorizar emisor -------------- */}
        <form onSubmit={handleAuthorizeIssuer} className="space-y-3">
          <p className="text-sm font-bold text-orange-300">Autorizar emisor</p>
          <div className="space-y-2">
            <Label htmlFor="authAddr">Dirección del emisor</Label>
            <Input
              id="authAddr"
              placeholder="0x..."
              value={authIssuerAddress}
              onChange={e => setAuthIssuerAddress(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authInstId">ID de institución</Label>
            <Input
              id="authInstId"
              type="number"
              min="1"
              placeholder="1"
              value={authInstitutionId}
              onChange={e => setAuthInstitutionId(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={authorizing} variant="secondary" className="w-full">
            {authorizing ? 'Autorizando...' : 'Autorizar emisor'}
          </Button>
        </form>

        <Separator />

        {/* -------------- SECCIÓN 3: Revocar emisor -------------- */}
        <form onSubmit={handleRevokeIssuer} className="space-y-3">
          <p className="text-sm font-bold text-orange-300">Revocar emisor</p>
          <div className="space-y-2">
            <Label htmlFor="revokeAddr">Dirección a revocar</Label>
            <Input
              id="revokeAddr"
              placeholder="0x..."
              value={revokeIssuerAddress}
              onChange={e => setRevokeIssuerAddress(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={revoking} variant="destructive" className="w-full">
            {revoking ? 'Revocando...' : 'Revocar emisor'}
          </Button>
        </form>

        <Separator />

        {/* -------------- SECCIÓN 4: Revocar credencial (acción owner) -------------- */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-orange-300">Revocar credencial </p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>ID de credencial</Label>
              <Input
                type="number"
                placeholder="1"
                value={revokeCredId}
                onChange={e => setRevokeCredId(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="self-end"
              onClick={handleCheckCredential}
              disabled={!revokeCredId || checkingCredential}
            >
              {checkingCredential ? 'Buscando...' : 'Verificar ID'}
            </Button>
          </div>

          {credentialToRevoke && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Emisor</span>
                <span className="font-mono text-xs">{fmt(credentialToRevoke.credential.issuer)}</span>
                <span className="text-muted-foreground">Institución</span>
                <span>{credentialToRevoke.institution.name}</span>
                <span className="text-muted-foreground">Estado</span>
                <span>{credentialToRevoke.credential.revoked ? 'Revocada' : 'Activa'}</span>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleRevokeCredential}
                disabled={revokingCred}
              >
                {revokingCred ? 'Revocando...' : 'Revocar credencial (owner)'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;