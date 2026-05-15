# TFG-Credenciales-EnriqueGomezFernandez

Prototipo de aplicación descentralizada (dApp) para la emisión y verificación de títulos académicos utilizando tecnología blockchain (Ethereum/Sepolia) e IPFS.

## Requisitos previos

Antes de comenzar, asegúrese de tener instalado:
* **Node.js (v18+):** Incluye `npm` para gestionar las librerías.
* **Git:** Para la descarga del código.
* **Wallet Web3:** Cualquier cartera compatible (MetaMask, Rabby, Coinbase Wallet, etc.) con saldo en la red **Sepolia**.

## Obtención de credenciales externas

El sistema requiere configurar los siguientes servicios externos:

1. **Pinata (IPFS):** Cree una cuenta en [Pinata](https://www.pinata.cloud/) y genere un **API Key** y un **API Secret** en el panel de desarrollador.
2. **Web3Modal:** Regístrese en [WalletConnect Cloud](https://cloud.walletconnect.com/) y obtenga un **Project ID**.

## Despliegue del Contrato Inteligente

1. Suba el archivo `CredentialSystem.sol` a [Remix IDE](https://remix.ethereum.org/).
2. Compile y despliegue en la red **Sepolia** usando "Injected Provider".
3. **Copie la dirección del contrato** resultante para el siguiente paso.

## Instalación y Configuración

Ejecute los siguientes comandos en su terminal para preparar el proyecto:
```bash
# Clonar el repositorio
git clone git@github.com:enriquegf506/TFG-Credenciales-EnriqueGomezFernandez.git
cd tu-proyecto

# Instalar dependencias
npm install
```
Tras esto, debe configurar las variables de entorno

Cree un archivo llamado .env en la raíz y pegue lo siguiente:
```env
VITE_CONTRACT_ADDRESS=tu_direccion_de_contrato_aqui

VITE_PINATA_API_KEY=tu_api_key_aqui

VITE_PINATA_SECRET_KEY=tu_api_secret_aqui

VITE_WEB3MODAL_PROJECT_ID=tu_project_id_aqui
```
**Nota:** Si realiza modificaciones en el código fuente de Solidity, recuerde actualizar el archivo \texttt{contractABI.json} dentro de la carpeta \texttt{/src/web3/} del proyecto frontend.

## Ejecución

Para iniciar la aplicación en su navegador:

```Bash
npm run dev
```

La aplicación estará disponible en http://localhost:5173.

## Guía rápida de prueba funcional:

* **Rol Administrador:** Conecta la misma wallet que utilizaste para desplegar el contrato (ya que posee los permisos de owner). Registra una nueva Institución Educativa.

* **Rol Emisor:** Autoriza tu dirección (u otra secundaria) como emisor vinculado a la institución. Accede al panel de emisión, carga un archivo PDF de prueba, completa los datos académicos y firma la transacción.

* **Rol Verificador:** Tras la emisión, copia el CID y la clave AES proporcionados. Desconecta tu wallet (o usa el panel público) para probar el flujo de verificación de integridad y el descifrado local del documento.

## Compilación para producción

Si deseas generar la versión optimizada para desplegar la aplicación en un servidor web real ejecuta:

```Bash
npm run build
```

Este comando generará una carpeta dist con los archivos estáticos listos para producción.

---
*Desarrollado como Trabajo de Fin de Grado.*
