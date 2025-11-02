// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentSigner
 * @dev Contrato para almacenar, listar y verificar firmas digitales de documentos
 */
contract DocumentSigner {
    /**
     * @dev Estructura para almacenar información de una firma
     * @param documentHash Hash del documento firmado
     * @param signer Dirección que firmó el documento
     * @param timestamp Timestamp de cuando se firmó
     * @param signature Firma del documento
     */
    struct Signature {
        bytes32 documentHash;
        address signer;
        uint256 timestamp;
        bytes signature;
    }

    /**
     * @dev Array de firmas almacenadas
     */
    Signature[] public signatures;

    /**
     * @dev Mapping para verificar si un hash de documento ya fue firmado por una dirección
     * documentHash => signer => existe la firma
     */
    mapping(bytes32 => mapping(address => bool)) public hasSigned;

    /**
     * @dev Evento emitido cuando se crea una nueva firma
     * @param documentHash Hash del documento
     * @param signer Dirección que firmó
     * @param timestamp Timestamp de la firma
     */
    event SignatureCreated(
        bytes32 indexed documentHash,
        address indexed signer,
        uint256 timestamp
    );

    /**
     * @dev Evento emitido cuando se verifica un documento
     * @param documentHash Hash del documento verificado
     * @param signer Dirección que firmó el documento
     * @param isVerified true si la firma es válida, false en caso contrario
     * @param timestamp Timestamp de la verificación
     */
    event DocumentVerified(
        bytes32 indexed documentHash,
        address indexed signer,
        bool isVerified,
        uint256 timestamp
    );

    /**
     * @dev Modifier para verificar que el documento ya fue firmado
     * @param documentHash Hash del documento a verificar
     * @param signer Dirección que se quiere verificar
     */
    modifier documentExists(bytes32 documentHash, address signer) {
        require(hasSigned[documentHash][signer], "Document not signed by this address");
        _;
    }

    /**
     * @dev Modifier para verificar que el documento no haya sido firmado previamente
     * @param documentHash Hash del documento a verificar
     */
    modifier notAlreadySigned(bytes32 documentHash) {
        require(!hasSigned[documentHash][msg.sender], "Document already signed by this address");
        _;
    }

    /**
     * @dev Función para firmar un documento
     * @param documentHash Hash del documento a firmar
     * @param signature Firma del documento
     * @return El ID de la firma almacenada
     */
    function signDocument(bytes32 documentHash, bytes memory signature)
        public
        notAlreadySigned(documentHash)
        returns (uint256)
    {
        require(documentHash != bytes32(0), "Document hash cannot be zero");

        Signature memory newSignature = Signature({
            documentHash: documentHash,
            signer: msg.sender,
            timestamp: block.timestamp,
            signature: signature
        });

        signatures.push(newSignature);
        hasSigned[documentHash][msg.sender] = true;

        emit SignatureCreated(documentHash, msg.sender, block.timestamp);

        return signatures.length - 1;
    }

    /**
     * @dev Función para obtener el número total de firmas
     * @return Número total de firmas almacenadas
     */
    function getSignatureCount() public view returns (uint256) {
        return signatures.length;
    }

    /**
     * @dev Función para obtener una firma por ID
     * @param signatureId ID de la firma
     * @return Signature Estructura de la firma
     */
    function getSignature(uint256 signatureId)
        public
        view
        returns (Signature memory)
    {
        require(signatureId < signatures.length, "Signature does not exist");
        return signatures[signatureId];
    }

    /**
     * @dev Función para obtener todas las firmas
     * @return Array con todas las firmas
     */
    function getAllSignatures() public view returns (Signature[] memory) {
        return signatures;
    }

    /**
     * @dev Función para verificar un documento y emitir un evento
     * @param documentHash Hash del documento a verificar
     * @param signer Dirección que se quiere verificar
     * @return true si la dirección firmó el documento, false en caso contrario
     */
    function verifyAndEmit(bytes32 documentHash, address signer)
        public
        returns (bool)
    {
        bool isVerified = hasSigned[documentHash][signer];
        emit DocumentVerified(documentHash, signer, isVerified, block.timestamp);
        return isVerified;
    }

    /**
     * @dev Función para verificar un documento que ya fue firmado (solo verificación)
     * Requiere que el documento exista en el contrato
     * @param documentHash Hash del documento a verificar
     * @param signer Dirección que se quiere verificar
     * @return true si la dirección firmó el documento
     */
    function verifyExistingDocument(bytes32 documentHash, address signer)
        public
        view
        documentExists(documentHash, signer)
        returns (bool)
    {
        return hasSigned[documentHash][signer];
    }
}

