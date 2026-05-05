// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniversityCredentialRegistry
 * @dev Registro de credenciales académicas con privacidad mediante hashes de contraseña.
 * Todas las credenciales se asumen cifradas; la blockchain solo guarda el hash de la llave.
 */
contract UniversityCredentialRegistry is Ownable {

    // --- Estructuras de Datos ---

    struct Institution {
        string name;           // Nombre de la Universidad
        string country;        // País de origen
        string did;            // Identificador Descentralizado (opcional)
        bool active;           // Estado de la institución
        uint256 createdAt;     // Fecha de registro en el contrato
    }

    struct Credential {
        uint256 institutionId; // ID de la universidad emisora
        address issuer;        // Wallet específica que firmó la emisión
        string ipfsCID;        // CID del JSON de metadatos en IPFS
        bytes32 metadataHash;  // Hash para verificar integridad de los metadatos
        bytes32 passwordHash;  // SHA-256 de la clave de descifrado (Generado en JS)
        uint256 timestamp;     // Fecha de emisión
        bool revoked;          // Estado de validez de la credencial
    }

    // --- Estado del Contrato ---

    mapping(uint256 => Institution) public institutions;
    mapping(address => uint256) public issuerToInstitution;
    mapping(uint256 => Credential) public credentials;

    uint256 public institutionCount;
    uint256 public credentialCount;

    // --- Eventos ---

    event InstitutionRegistered(uint256 indexed institutionId, string name, address indexed registrar);
    event InstitutionUpdated(uint256 indexed institutionId, string name, string country, string did);
    event InstitutionStatusChanged(uint256 indexed institutionId, bool active);
    event IssuerAuthorized(uint256 indexed institutionId, address indexed issuer);
    event IssuerRevoked(uint256 indexed institutionId, address indexed issuer);
    event CredentialIssued(uint256 indexed credentialId, uint256 indexed institutionId, address indexed issuer, string ipfsCID);
    event CredentialRevoked(uint256 indexed credentialId);

    // --- Modificadores ---

    modifier onlyAuthorizedIssuer() {
        require(issuerToInstitution[msg.sender] != 0, "Not an authorized issuer");
        _;
    }

    modifier institutionExists(uint256 institutionId) {
        require(institutions[institutionId].active, "Institution does not exist or is inactive");
        _;
    }

    // El owner inicial será quien despliegue el contrato
    constructor() Ownable(msg.sender) {}

    // =============================================================
    //        FUNCIONES DE ADMINISTRACIÓN (Solo Owner/Admin)
    // =============================================================

    /**
     * @dev Registra una nueva universidad en el sistema.
     */
    function registerInstitution(
        string memory _name,
        string memory _country,
        string memory _did
    ) external onlyOwner returns (uint256) {
        institutionCount++;
        institutions[institutionCount] = Institution({
            name: _name,
            country: _country,
            did: _did,
            active: true,
            createdAt: block.timestamp
        });
        emit InstitutionRegistered(institutionCount, _name, msg.sender);
        return institutionCount;
    }

    /**
     * @dev Actualiza los datos informativos de una institución.
     */
    function updateInstitution(
        uint256 _institutionId,
        string memory _name,
        string memory _country,
        string memory _did
    ) external onlyOwner institutionExists(_institutionId) {
        Institution storage inst = institutions[_institutionId];
        inst.name = _name;
        inst.country = _country;
        inst.did = _did;
        emit InstitutionUpdated(_institutionId, _name, _country, _did);
    }

    /**
     * @dev Activa o desactiva una institución.
     */
    function setInstitutionStatus(uint256 _institutionId, bool _active) external onlyOwner {
        require(institutions[_institutionId].createdAt != 0, "Institution not found");
        institutions[_institutionId].active = _active;
        emit InstitutionStatusChanged(_institutionId, _active);
    }

    /**
     * @dev Autoriza a una wallet específica para emitir en nombre de una universidad.
     */
    function authorizeIssuer(address _issuer, uint256 _institutionId) 
        external 
        onlyOwner 
        institutionExists(_institutionId) 
    {
        require(_issuer != address(0), "Invalid address");
        issuerToInstitution[_issuer] = _institutionId;
        emit IssuerAuthorized(_institutionId, _issuer);
    }

    /**
     * @dev Revoca el permiso de emisión a una wallet.
     */
    function revokeIssuer(address _issuer) external onlyOwner {
        uint256 instId = issuerToInstitution[_issuer];
        require(instId != 0, "Issuer not authorized");
        delete issuerToInstitution[_issuer];
        emit IssuerRevoked(instId, _issuer);
    }

    // =============================================================
    //             FUNCIONES PARA EMISORES (Universidades)
    // =============================================================

    /**
     * @dev Emite una credencial. Recibe el CID de IPFS y el hash de la contraseña.
     */
    function issueCredential(
        string memory _ipfsCID,
        bytes32 _metadataHash,
        bytes32 _passwordHash
    ) external onlyAuthorizedIssuer returns (uint256) {
        uint256 instId = issuerToInstitution[msg.sender];
        require(institutions[instId].active, "Your institution is currently inactive");

        credentialCount++;
        credentials[credentialCount] = Credential({
            institutionId: instId,
            issuer: msg.sender,
            ipfsCID: _ipfsCID,
            metadataHash: _metadataHash,
            passwordHash: _passwordHash,
            timestamp: block.timestamp,
            revoked: false
        });

        emit CredentialIssued(credentialCount, instId, msg.sender, _ipfsCID);
        return credentialCount;
    }

    /**
     * @dev Permite la revocación por parte de:
     * 1. El Administrador (Owner del contrato).
     * 2. El Emisor original que firmó la credencial.
     * 3. Cualquier emisor activo de la misma institución.
     */
    function revokeCredential(uint256 _credentialId) external {
        Credential storage cred = credentials[_credentialId];
        
        require(cred.issuer != address(0), "Credential not found");
        require(!cred.revoked, "Credential is already revoked");

        uint256 callerInstitutionId = issuerToInstitution[msg.sender];
        
        bool isAdmin = (msg.sender == owner());
        bool isFromSameInstitution = (callerInstitutionId != 0 && callerInstitutionId == cred.institutionId);

        require(isAdmin || isFromSameInstitution, "Unauthorized to revoke this credential");

        cred.revoked = true;
        emit CredentialRevoked(_credentialId);
    }

    // =============================================================
    //                     FUNCIONES DE CONSULTA
    // =============================================================

    /**
     * @dev Devuelve toda la información de una credencial.
     */
    function getCredential(uint256 _credentialId) 
        external 
        view 
        returns (Credential memory cred, Institution memory inst) 
    {
        cred = credentials[_credentialId];
        require(cred.issuer != address(0), "Credential does not exist");
        inst = institutions[cred.institutionId];
    }

    /**
     * @dev Verifica si una dirección tiene permisos de emisión.
     */
    function isAuthorizedIssuer(address _issuer) external view returns (bool) {
        return issuerToInstitution[_issuer] != 0;
    }

    /**
     * @dev Obtiene la universidad a la que pertenece un emisor.
     */
    function getInstitutionByIssuer(address _issuer) external view returns (Institution memory) {
        uint256 instId = issuerToInstitution[_issuer];
        require(instId != 0, "Issuer not found");
        return institutions[instId];
    }
}