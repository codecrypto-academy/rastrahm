// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title MinimalForwarder
 * @dev Minimal forwarder compatible with EIP-2771
 * 
 * This forwarder allows users to sign transactions off-chain and have them
 * executed by a relayer that pays for gas.
 */
contract MinimalForwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        uint256 deadline;
        bytes data;
    }

    bytes32 private constant TYPEHASH = keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)");
    
    // Gas mínimo requerido para una transacción
    uint256 private constant MIN_GAS = 21000;
    
    error ForwardRequestExpired(uint256 deadline);
    error MinimalForwarderGasTooLow(uint256 gas);
    error MinimalForwarderInsufficientGas(uint256 gasLeft, uint256 requiredGas);
    error MinimalForwarderUntrustfulTarget(address target, address forwarder);

    mapping(address => uint256) private _nonces;

    event ForwardRequestExecuted(
        address indexed from,
        address indexed to,
        uint256 nonce,
        bool success,
        bytes returnData
    );

    constructor() EIP712("MinimalForwarder", "0.0.1") {}

    /**
     * @dev Returns the nonce for a given address
     * @param from The address to get the nonce for
     */
    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @dev Verifies if a forward request is valid
     * @param req The forward request to verify
     * @param signature The signature of the request
     * @return true if the request is valid, false otherwise
     */
    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        // Verificar deadline
        if (block.timestamp > req.deadline) {
            return false;
        }
        
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    req.deadline,
                    keccak256(req.data)
                )
            )
        ).recover(signature);

        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    /**
     * @dev Executes a forward request
     * @param req The forward request to execute
     * @param signature The signature of the request
     * @return success Whether the call was successful
     * @return ret The return data from the call
     */
    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool, bytes memory)
    {
        // Verificar deadline
        if (block.timestamp > req.deadline) {
            revert ForwardRequestExpired(req.deadline);
        }
        
        require(verify(req, signature), "MinimalForwarder: signature does not match request");
        
        // Validar gas mínimo
        if (req.gas < MIN_GAS) {
            revert MinimalForwarderGasTooLow(req.gas);
        }
        
        // Validar que hay suficiente gas disponible
        if (gasleft() < req.gas) {
            revert MinimalForwarderInsufficientGas(gasleft(), req.gas);
        }
        
        // Validar que el contrato destino confía en este forwarder
        if (req.to.code.length > 0) {
            (bool isTrusted, ) = req.to.staticcall(
                abi.encodeWithSelector(
                    ERC2771Context.isTrustedForwarder.selector,
                    address(this)
                )
            );
            if (!isTrusted) {
                revert MinimalForwarderUntrustfulTarget(req.to, address(this));
            }
        }
        
        _nonces[req.from] = req.nonce + 1;

        (bool success, bytes memory returndata) = req.to.call{value: req.value, gas: req.gas}(
            abi.encodePacked(req.data, req.from)
        );
        uint256 gasAfter = gasleft();

        // Validar que el gas fue suficiente (según EIP-150, al menos 1/64 del gas debe quedar)
        // Esto previene gas griefing donde el relayer especifica poco gas
        if (gasAfter < req.gas / 63) {
            // Gas insuficiente fue pasado, revertir todo
            assembly {
                invalid()
            }
        }

        emit ForwardRequestExecuted(req.from, req.to, req.nonce, success, returndata);

        return (success, returndata);
    }
}

