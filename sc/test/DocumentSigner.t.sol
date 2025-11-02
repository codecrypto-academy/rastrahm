// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DocumentSigner} from "../src/DocumentSigner.sol";

contract DocumentSignerTest is Test {
    DocumentSigner public documentSigner;

    address public signer1 = address(0x1);
    address public signer2 = address(0x2);

    bytes32 public documentHash1 = keccak256("Documento 1");
    bytes32 public documentHash2 = keccak256("Documento 2");

    event SignatureCreated(
        bytes32 indexed documentHash,
        address indexed signer,
        uint256 timestamp
    );

    event DocumentVerified(
        bytes32 indexed documentHash,
        address indexed signer,
        bool isVerified,
        uint256 timestamp
    );

    function setUp() public {
        documentSigner = new DocumentSigner();
    }

    function testSignDocument() public {
        bytes memory signature = "firma1";
        
        // Firma el documento
        uint256 signatureId = documentSigner.signDocument(documentHash1, signature);
        
        // Verifica que el ID sea 0 (primera firma)
        assertEq(signatureId, 0);
        
        // Verifica que se puede obtener la firma
        DocumentSigner.Signature memory sig = documentSigner.getSignature(0);
        assertEq(sig.documentHash, documentHash1);
        assertEq(sig.signer, address(this));
        assertEq(sig.signature, signature);
    }

    function testSignDocumentEmitsEvent() public {
        bytes memory signature = "firma1";
        
        vm.expectEmit(true, true, false, true);
        emit SignatureCreated(documentHash1, address(this), block.timestamp);
        
        documentSigner.signDocument(documentHash1, signature);
    }

    function testGetSignatureCount() public {
        assertEq(documentSigner.getSignatureCount(), 0);
        
        documentSigner.signDocument(documentHash1, "firma1");
        assertEq(documentSigner.getSignatureCount(), 1);
        
        documentSigner.signDocument(documentHash2, "firma2");
        assertEq(documentSigner.getSignatureCount(), 2);
    }

    function testVerifySignature() public {
        bytes memory signature = "firma1";
        
        // Verifica que no ha firmado
        assertFalse(documentSigner.verifyAndEmit(documentHash1, address(this)));
        
        // Firma el documento
        documentSigner.signDocument(documentHash1, signature);
        
        // Verifica que ahora ha firmado
        assertTrue(documentSigner.verifyAndEmit(documentHash1, address(this)));
        
        // Verifica que otra dirección no ha firmado
        assertFalse(documentSigner.verifyAndEmit(documentHash1, signer1));
    }

    function testGetAllSignatures() public {
        bytes memory signature1 = "firma1";
        bytes memory signature2 = "firma2";
        
        documentSigner.signDocument(documentHash1, signature1);
        documentSigner.signDocument(documentHash2, signature2);
        
        DocumentSigner.Signature[] memory allSignatures = documentSigner.getAllSignatures();
        
        assertEq(allSignatures.length, 2);
        assertEq(allSignatures[0].documentHash, documentHash1);
        assertEq(allSignatures[0].signature, signature1);
        assertEq(allSignatures[1].documentHash, documentHash2);
        assertEq(allSignatures[1].signature, signature2);
    }

    function test_Revert_SignSameDocumentTwice() public {
        bytes memory signature1 = "firma1";
        bytes memory signature2 = "firma2";
        
        // Primera firma exitosa
        documentSigner.signDocument(documentHash1, signature1);
        
        // Debe fallar al intentar firmar el mismo documento de nuevo
        vm.expectRevert("Document already signed by this address");
        documentSigner.signDocument(documentHash1, signature2);
    }

    function test_Revert_SignZeroHash() public {
        bytes memory signature = "firma1";
        
        vm.expectRevert("Document hash cannot be zero");
        documentSigner.signDocument(bytes32(0), signature);
    }

    function test_Revert_GetNonExistentSignature() public {
        vm.expectRevert("Signature does not exist");
        documentSigner.getSignature(0);
    }

    function testMultipleSignersDifferentDocuments() public {
        bytes memory signature1 = "firma1";
        bytes memory signature2 = "firma2";
        
        // Signer1 firma documento1
        vm.prank(signer1);
        documentSigner.signDocument(documentHash1, signature1);
        
        // Signer2 firma documento2
        vm.prank(signer2);
        documentSigner.signDocument(documentHash2, signature2);
        
        // Verifica que ambos firmaron correctamente
        assertTrue(documentSigner.verifyAndEmit(documentHash1, signer1));
        assertTrue(documentSigner.verifyAndEmit(documentHash2, signer2));
        
        // Verifica que cada uno NO firmó el documento del otro
        assertFalse(documentSigner.verifyAndEmit(documentHash1, signer2));
        assertFalse(documentSigner.verifyAndEmit(documentHash2, signer1));
        
        // Verifica el conteo
        assertEq(documentSigner.getSignatureCount(), 2);
    }

    function testMultipleSignersSameDocument() public {
        bytes memory signature1 = "firma1";
        bytes memory signature2 = "firma2";
        
        // Signer1 firma documento1
        vm.prank(signer1);
        documentSigner.signDocument(documentHash1, signature1);
        
        // Signer2 puede firmar el mismo documento
        vm.prank(signer2);
        documentSigner.signDocument(documentHash1, signature2);
        
        // Verifica que ambos firmaron el mismo documento
        assertTrue(documentSigner.verifyAndEmit(documentHash1, signer1));
        assertTrue(documentSigner.verifyAndEmit(documentHash1, signer2));
        
        // Verifica que tenemos 2 firmas en total
        assertEq(documentSigner.getSignatureCount(), 2);
    }

    function testVerifyAndEmit() public {
        bytes memory signature = "firma1";
        
        // Primero firma el documento
        documentSigner.signDocument(documentHash1, signature);
        
        // Verifica y emite evento para una firma válida
        vm.expectEmit(true, true, false, true);
        emit DocumentVerified(documentHash1, address(this), true, block.timestamp);
        bool result = documentSigner.verifyAndEmit(documentHash1, address(this));
        assertTrue(result);
        
        // Verifica y emite evento para una firma inválida
        vm.expectEmit(true, true, false, true);
        emit DocumentVerified(documentHash2, address(this), false, block.timestamp);
        result = documentSigner.verifyAndEmit(documentHash2, address(this));
        assertFalse(result);
    }

    function testVerifyAndEmitWithDifferentSigners() public {
        bytes memory signature = "firma1";
        
        // Signer1 firma el documento
        vm.prank(signer1);
        documentSigner.signDocument(documentHash1, signature);
        
        // Verifica que signer1 tiene una firma válida
        vm.expectEmit(true, true, false, true);
        emit DocumentVerified(documentHash1, signer1, true, block.timestamp);
        bool result = documentSigner.verifyAndEmit(documentHash1, signer1);
        assertTrue(result);
        
        // Verifica que signer2 NO tiene una firma válida
        vm.expectEmit(true, true, false, true);
        emit DocumentVerified(documentHash1, signer2, false, block.timestamp);
        result = documentSigner.verifyAndEmit(documentHash1, signer2);
        assertFalse(result);
    }

    function testVerifyExistingDocument() public {
        bytes memory signature = "firma1";
        
        // Firma el documento
        documentSigner.signDocument(documentHash1, signature);
        
        // Verifica que el documento existe
        bool result = documentSigner.verifyExistingDocument(documentHash1, address(this));
        assertTrue(result);
    }

    function test_Revert_VerifyExistingDocumentWithoutSignature() public {
        // Intenta verificar un documento que no fue firmado
        vm.expectRevert("Document not signed by this address");
        documentSigner.verifyExistingDocument(documentHash1, address(this));
    }
}

