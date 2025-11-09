// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DAOVoting} from "../src/DAOVoting.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";

contract DAOVotingTest is Test {
    MinimalForwarder public forwarder;
    DAOVoting public dao;
    
    address public user1;
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    address public beneficiary = address(0x4);
    address public relayer = address(0x5);
    
    // Clave privada conocida para testing (address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    uint256 private user1PrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 private user2PrivateKey = 0x2345678901234567890123456789012345678901234567890123456789012345;

    function setUp() public {
        forwarder = new MinimalForwarder();
        dao = new DAOVoting(address(forwarder));
        
        // Obtener el address de la clave privada
        user1 = vm.addr(user1PrivateKey);
        
        // Fundear cuentas
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
        vm.deal(relayer, 100 ether);
    }

    // ============ Tests de Financiación ============

    function test_FundDAO() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();
        
        assertEq(dao.getUserBalance(user1), 10 ether, "User1 balance should be 10 ether");
        assertEq(dao.totalBalance(), 10 ether, "Total balance should be 10 ether");
    }

    function test_FundDAO_Receive() public {
        vm.prank(user1);
        (bool success, ) = address(dao).call{value: 5 ether}("");
        assertTrue(success);
        
        assertEq(dao.getUserBalance(user1), 5 ether, "User1 balance should be 5 ether");
    }

    // ============ Tests de Creación de Propuestas ============

    function test_CreateProposal() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.id, 1, "Proposal ID should be 1");
        assertEq(proposal.recipient, beneficiary, "Recipient should match");
        assertEq(proposal.amount, 5 ether, "Amount should match");
        assertEq(proposal.deadline, deadline, "Deadline should match");
        assertFalse(proposal.executed, "Proposal should not be executed");
    }

    function test_CreateProposal_InsufficientThreshold() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 1 ether}(); // Solo 1 ETH, no suficiente para crear propuesta
        
        uint256 deadline = block.timestamp + 7 days;
        vm.expectRevert();
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
    }

    function test_CreateProposal_InvalidRecipient() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        
        uint256 deadline = block.timestamp + 7 days;
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.InvalidRecipient.selector, address(0)));
        dao.createProposal(address(0), 5 ether, deadline);
        vm.stopPrank();
    }

    function test_CreateProposal_InvalidAmount() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        
        uint256 deadline = block.timestamp + 7 days;
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.InvalidAmount.selector, uint256(0)));
        dao.createProposal(beneficiary, 0, deadline);
        vm.stopPrank();
    }

    function test_CreateProposal_DeadlineInPast() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        
        uint256 deadline = block.timestamp - 1; // Deadline en el pasado
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.DeadlineInPast.selector, deadline));
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
    }

    // ============ Tests de Votación ============

    function test_Vote_For() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        vm.startPrank(user1);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 1, "Votes for should be 1 (1 vote = 1 person)");
        assertEq(proposal.votesAgainst, 0, "Votes against should be 0");
        assertEq(uint256(dao.getUserVote(user1, 1)), uint256(DAOVoting.VoteType.A_FAVOR), "User vote should be A_FAVOR");
    }

    function test_Vote_Against() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        vm.startPrank(user1);
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 0, "Votes for should be 0");
        assertEq(proposal.votesAgainst, 1, "Votes against should be 1 (1 vote = 1 person)");
    }

    function test_Vote_Abstention() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        vm.startPrank(user1);
        dao.vote(1, DAOVoting.VoteType.ABSTENCION);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesAbstention, 1, "Votes abstention should be 1 (1 vote = 1 person)");
    }

    function test_Vote_ChangeVote() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal1 = dao.getProposal(1);
        assertEq(proposal1.votesFor, 1, "Initial votes for should be 1 (1 vote = 1 person)");
        
        vm.prank(user1);
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        
        DAOVoting.Proposal memory proposal2 = dao.getProposal(1);
        assertEq(proposal2.votesFor, 0, "Votes for should be 0 after change");
        assertEq(proposal2.votesAgainst, 1, "Votes against should be 1 (1 vote = 1 person)");
        assertEq(uint256(dao.getUserVote(user1, 1)), uint256(DAOVoting.VoteType.EN_CONTRA), "User vote should be EN_CONTRA");
    }

    function test_Vote_CannotVoteSameTwice() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal1 = dao.getProposal(1);
        assertEq(proposal1.votesFor, 1, "Initial votes for should be 1");
        
        // Intentar votar A_FAVOR de nuevo debe fallar
        vm.startPrank(user1);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.AlreadyVoted.selector, uint256(1), user1));
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        // Verificar que el voto no cambió
        DAOVoting.Proposal memory proposal2 = dao.getProposal(1);
        assertEq(proposal2.votesFor, 1, "Votes for should still be 1");
    }

    function test_Vote_ChangeFromForToAgainst() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal1 = dao.getProposal(1);
        assertEq(proposal1.votesFor, 1, "Initial votes for should be 1");
        assertEq(proposal1.votesAgainst, 0, "Initial votes against should be 0");
        
        // Cambiar voto de A_FAVOR a EN_CONTRA
        vm.prank(user1);
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        
        DAOVoting.Proposal memory proposal2 = dao.getProposal(1);
        assertEq(proposal2.votesFor, 0, "Votes for should be 0 after change");
        assertEq(proposal2.votesAgainst, 1, "Votes against should be 1 after change");
        assertEq(uint256(dao.getUserVote(user1, 1)), uint256(DAOVoting.VoteType.EN_CONTRA), "User vote should be EN_CONTRA");
    }

    function test_Vote_ChangeFromAgainstToAbstention() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal1 = dao.getProposal(1);
        assertEq(proposal1.votesAgainst, 1, "Initial votes against should be 1");
        assertEq(proposal1.votesAbstention, 0, "Initial votes abstention should be 0");
        
        // Cambiar voto de EN_CONTRA a ABSTENCION
        vm.prank(user1);
        dao.vote(1, DAOVoting.VoteType.ABSTENCION);
        
        DAOVoting.Proposal memory proposal2 = dao.getProposal(1);
        assertEq(proposal2.votesAgainst, 0, "Votes against should be 0 after change");
        assertEq(proposal2.votesAbstention, 1, "Votes abstention should be 1 after change");
        assertEq(uint256(dao.getUserVote(user1, 1)), uint256(DAOVoting.VoteType.ABSTENCION), "User vote should be ABSTENCION");
    }

    function test_Vote_MultipleUsers() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        vm.startPrank(user2);
        dao.fundDAO{value: 5 ether}();
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        vm.stopPrank();
        
        vm.startPrank(user3);
        dao.fundDAO{value: 3 ether}();
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 2, "Total votes for should be 2 (user1 and user3, 1 vote = 1 person)");
        assertEq(proposal.votesAgainst, 1, "Total votes against should be 1 (user2, 1 vote = 1 person)");
    }

    function test_Vote_InsufficientBalance() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        vm.startPrank(user2);
        // Usuario sin balance
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.InsufficientBalance.selector, user2));
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
    }

    function test_Vote_ProposalNotFound() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalNotFound.selector, uint256(999)));
        dao.vote(999, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
    }

    function test_Vote_DeadlinePassed() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 1 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        // Avanzar el tiempo más allá del deadline
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(user1);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.VotingDeadlinePassed.selector, uint256(1)));
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
    }

    function test_Vote_AlreadyExecuted() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 1 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        // Avanzar tiempo y ejecutar
        vm.warp(block.timestamp + 2 days);
        vm.warp(block.timestamp + 1 days + 1); // Pasar período de seguridad
        
        vm.prank(user1);
        dao.executeProposal(1);
        
        // Intentar votar después de ejecución
        vm.startPrank(user2);
        dao.fundDAO{value: 5 ether}();
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalAlreadyExecuted.selector, uint256(1)));
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
    }

    // ============ Tests de Ejecución ============

    function test_ExecuteProposal() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 1 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        // Avanzar tiempo
        vm.warp(block.timestamp + 2 days);
        vm.warp(block.timestamp + 1 days + 1); // Pasar período de seguridad
        
        uint256 balanceBefore = beneficiary.balance;
        vm.prank(user1);
        dao.executeProposal(1);
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertTrue(proposal.executed, "Proposal should be executed");
        assertEq(beneficiary.balance, balanceBefore + 5 ether, "Beneficiary should receive funds");
    }

    function test_ExecuteProposal_NotApproved() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 1 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        vm.stopPrank();
        
        vm.startPrank(user2);
        dao.fundDAO{value: 5 ether}();
        dao.vote(1, DAOVoting.VoteType.EN_CONTRA);
        vm.stopPrank();
        
        // Avanzar tiempo
        vm.warp(block.timestamp + 2 days);
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalNotApproved.selector, uint256(1)));
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_DeadlineNotPassed() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalDeadlineNotPassed.selector, uint256(1)));
        vm.prank(user1);
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_SecurityPeriodNotPassed() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 1 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        // Avanzar tiempo solo hasta el deadline
        vm.warp(block.timestamp + 1 days);
        
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.SecurityPeriodNotPassed.selector, uint256(1)));
        vm.prank(user1);
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_AlreadyExecuted() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 1 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        dao.vote(1, DAOVoting.VoteType.A_FAVOR);
        vm.stopPrank();
        
        // Avanzar tiempo y ejecutar
        vm.warp(block.timestamp + 2 days);
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.prank(user1);
        dao.executeProposal(1);
        
        // Intentar ejecutar de nuevo
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalAlreadyExecuted.selector, uint256(1)));
        vm.prank(user1);
        dao.executeProposal(1);
    }

    // ============ Tests de Meta-transacciones (Gasless) ============

    function test_Vote_Gasless() public {
        vm.startPrank(user1);
        dao.fundDAO{value: 10 ether}();
        uint256 deadline = block.timestamp + 7 days;
        dao.createProposal(beneficiary, 5 ether, deadline);
        vm.stopPrank();
        
        // Preparar meta-transacción
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from: user1,
            to: address(dao),
            value: 0,
            gas: 100000,
            nonce: forwarder.getNonce(user1),
            deadline: block.timestamp + 1 days,
            data: abi.encodeWithSelector(DAOVoting.vote.selector, 1, DAOVoting.VoteType.A_FAVOR)
        });
        
        bytes32 digest = _hashTypedDataV4(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(user1PrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // Relayer ejecuta la transacción
        vm.prank(relayer);
        forwarder.execute(req, signature);
        
        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 1, "Votes for should be 1 (1 vote = 1 person)");
        assertEq(uint256(dao.getUserVote(user1, 1)), uint256(DAOVoting.VoteType.A_FAVOR), "User vote should be A_FAVOR");
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

