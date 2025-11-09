// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";
import {DAOVoting} from "../src/DAOVoting.sol";

contract MinimalForwarderTest is Test {
    MinimalForwarder public forwarder;
    DAOVoting public dao;
    
    address public relayer = address(0x2);
    
    // Clave privada conocida para testing (address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    uint256 private userPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address public user;

    function setUp() public {
        forwarder = new MinimalForwarder();
        dao = new DAOVoting(address(forwarder));
        
        // Obtener el address de la clave privada
        user = vm.addr(userPrivateKey);
        
        // Fundear el DAO con ETH
        vm.deal(user, 10 ether);
        vm.deal(relayer, 10 ether);
    }

    function test_GetNonce() public {
        uint256 nonce = forwarder.getNonce(user);
        assertEq(nonce, 0, "Nonce should be 0 initially");
    }

    function test_Verify_ValidRequest() public {
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user,
            to: address(dao),
            value: 0,
            gas: 50000,
            nonce: 0,
            deadline: block.timestamp + 1 days,
            data: abi.encodeWithSelector(DAOVoting.fundDAO.selector)
        });

        bytes32 digest = _hashTypedDataV4(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        bool isValid = forwarder.verify(req, signature);
        assertTrue(isValid, "Request should be valid");
    }

    function test_Verify_InvalidNonce() public {
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user,
            to: address(dao),
            value: 0,
            gas: 50000,
            nonce: 1, // Nonce incorrecto
            deadline: block.timestamp + 1 days,
            data: abi.encodeWithSelector(DAOVoting.fundDAO.selector)
        });

        bytes32 digest = _hashTypedDataV4(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        bool isValid = forwarder.verify(req, signature);
        assertFalse(isValid, "Request should be invalid with wrong nonce");
    }

    function test_Execute_ValidRequest() public {
        vm.startPrank(user);
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user,
            to: address(dao),
            value: 1 ether,
            gas: 50000,
            nonce: 0,
            deadline: block.timestamp + 1 days,
            data: abi.encodeWithSelector(DAOVoting.fundDAO.selector)
        });

        bytes32 digest = _hashTypedDataV4(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();

        // El relayer ejecuta la transacción
        vm.prank(relayer);
        (bool success, ) = forwarder.execute{value: 1 ether}(req, signature);
        
        assertTrue(success, "Execution should succeed");
        assertEq(forwarder.getNonce(user), 1, "Nonce should be incremented");
        assertEq(dao.getUserBalance(user), 1 ether, "User balance should be updated");
    }

    function test_Execute_ReplayAttack() public {
        vm.startPrank(user);
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user,
            to: address(dao),
            value: 1 ether,
            gas: 50000,
            nonce: 0,
            deadline: block.timestamp + 1 days,
            data: abi.encodeWithSelector(DAOVoting.fundDAO.selector)
        });

        bytes32 digest = _hashTypedDataV4(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();

        // Primera ejecución
        vm.prank(relayer);
        forwarder.execute{value: 1 ether}(req, signature);

        // Intento de replay attack
        vm.prank(relayer);
        vm.expectRevert("MinimalForwarder: signature does not match request");
        forwarder.execute{value: 1 ether}(req, signature);
    }

    function test_Execute_InvalidSignature() public {
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user,
            to: address(dao),
            value: 0,
            gas: 50000,
            nonce: 0,
            deadline: block.timestamp + 1 days,
            data: abi.encodeWithSelector(DAOVoting.fundDAO.selector)
        });

        // Firma inválida (longitud incorrecta)
        bytes memory signature = "invalid";

        vm.prank(relayer);
        vm.expectRevert();
        forwarder.execute(req, signature);
    }

    // Helper function para hash de tipo EIP-712
    function _hashTypedDataV4(MinimalForwarder.ForwardRequest memory req) internal view returns (bytes32) {
        bytes32 typeHash = keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)"
        );
        
        bytes32 structHash = keccak256(
            abi.encode(
                typeHash,
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                req.deadline,
                keccak256(req.data)
            )
        );

        // Calcular domain separator exactamente como EIP712
        bytes32 domainTypeHash = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
        
        bytes32 domainSeparator = keccak256(
            abi.encode(
                domainTypeHash,
                keccak256(bytes("MinimalForwarder")),
                keccak256(bytes("0.0.1")),
                block.chainid,
                address(forwarder)
            )
        );

        // Usar el mismo método que MessageHashUtils.toTypedDataHash
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}

