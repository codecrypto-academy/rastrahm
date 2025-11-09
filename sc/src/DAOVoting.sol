// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DAOVoting
 * @dev DAO contract with voting system that supports EIP-2771 meta-transactions
 */
contract DAOVoting is ERC2771Context, ReentrancyGuard {
    // Enum para tipos de voto
    enum VoteType {
        A_FAVOR,      // 0
        EN_CONTRA,    // 1
        ABSTENCION    // 2
    }

    // Estructura de una propuesta
    struct Proposal {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 deadline;
        uint256 votesFor;        // Número de personas que votaron A FAVOR (1 voto = 1 persona)
        uint256 votesAgainst;    // Número de personas que votaron EN CONTRA (1 voto = 1 persona)
        uint256 votesAbstention; // Número de personas que se abstuvieron (1 voto = 1 persona)
        bool executed;
        uint256 executionTime;
        uint256 creationTime;
    }

    // Mapeo de propuestas
    mapping(uint256 => Proposal) public proposals;
    
    // Mapeo de votos por usuario y propuesta: user => proposalId => VoteType
    mapping(address => mapping(uint256 => VoteType)) public userVotes;
    
    // Mapeo para rastrear si un usuario ha votado en una propuesta
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    
    // Mapeo de balances por usuario
    mapping(address => uint256) public userBalances;
    
    // Balance total del DAO
    uint256 public totalBalance;
    
    // Contador de propuestas
    uint256 public proposalCount;
    
    // Período de seguridad antes de ejecutar (en segundos)
    uint256 public constant SECURITY_PERIOD = 1 days;
    
    // Duración máxima permitida para deadline de propuestas (90 días)
    uint256 public constant MAX_DEADLINE_DURATION = 90 days;
    
    // Porcentaje mínimo para crear propuestas (10% = 1000 de 10000)
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 1000; // 10%
    uint256 public constant PERCENTAGE_BASE = 10000; // 100%

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        address recipient,
        uint256 amount,
        uint256 deadline
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteType voteType
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        address recipient,
        uint256 amount
    );

    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);

    error ProposalNotFound(uint256 proposalId);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error ProposalDeadlineNotPassed(uint256 proposalId);
    error ProposalNotApproved(uint256 proposalId);
    error SecurityPeriodNotPassed(uint256 proposalId);
    error InsufficientBalance(address user);
    error InsufficientProposalThreshold(address user);
    error DeadlineInPast(uint256 deadline);
    error DeadlineTooFar(uint256 deadline);
    error InvalidRecipient(address recipient);
    error InvalidAmount(uint256 amount);
    error VotingDeadlinePassed(uint256 proposalId);
    error AlreadyVoted(uint256 proposalId, address voter);

    /**
     * @dev Constructor
     * @param trustedForwarder Address del forwarder de confianza (MinimalForwarder)
     */
    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    /**
     * @dev Deposita fondos en el DAO
     */
    function fundDAO() external payable {
        require(msg.value > 0, "DAOVoting: amount must be greater than 0");
        
        userBalances[_msgSender()] += msg.value;
        totalBalance += msg.value;
        
        emit FundsDeposited(_msgSender(), msg.value);
    }

    /**
     * @dev Crea una nueva propuesta
     * @param recipient Dirección del beneficiario
     * @param amount Monto en ETH a transferir
     * @param deadline Fecha límite de votación (timestamp)
     */
    function createProposal(address recipient, uint256 amount, uint256 deadline) external {
        address sender = _msgSender();
        
        // Validar que el usuario tiene al menos 10% del balance total
        require(
            userBalances[sender] * PERCENTAGE_BASE >= totalBalance * MIN_PROPOSAL_THRESHOLD,
            "DAOVoting: insufficient balance to create proposal"
        );
        
        // Validaciones
        if (recipient == address(0)) {
            revert InvalidRecipient(recipient);
        }
        if (amount == 0) {
            revert InvalidAmount(amount);
        }
        if (deadline <= block.timestamp) {
            revert DeadlineInPast(deadline);
        }
        if (deadline > block.timestamp + MAX_DEADLINE_DURATION) {
            revert DeadlineTooFar(deadline);
        }
        if (amount > address(this).balance) {
            revert InsufficientBalance(address(this));
        }

        proposalCount++;
        uint256 proposalId = proposalCount;

        proposals[proposalId] = Proposal({
            id: proposalId,
            recipient: recipient,
            amount: amount,
            deadline: deadline,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstention: 0,
            executed: false,
            executionTime: 0,
            creationTime: block.timestamp
        });

        emit ProposalCreated(proposalId, sender, recipient, amount, deadline);
    }

    /**
     * @dev Vota en una propuesta
     * @param proposalId ID de la propuesta
     * @param voteType Tipo de voto (A_FAVOR, EN_CONTRA, ABSTENCION)
     */
    function vote(uint256 proposalId, VoteType voteType) external {
        address sender = _msgSender();
        
        // Validar que el usuario tiene balance
        if (userBalances[sender] == 0) {
            revert InsufficientBalance(sender);
        }

        Proposal storage proposal = proposals[proposalId];
        
        // Validar que la propuesta existe
        if (proposal.id == 0) {
            revert ProposalNotFound(proposalId);
        }
        
        // Validar que la propuesta no ha sido ejecutada
        if (proposal.executed) {
            revert ProposalAlreadyExecuted(proposalId);
        }
        
        // Validar que el deadline no ha pasado
        if (block.timestamp >= proposal.deadline) {
            revert VotingDeadlinePassed(proposalId);
        }

        // Obtener el voto anterior del usuario
        VoteType previousVote = userVotes[sender][proposalId];
        bool userHasVoted = hasVoted[sender][proposalId];
        
        // Si el usuario ya votó con el mismo voto, no permitir votar de nuevo
        if (userHasVoted && previousVote == voteType) {
            revert AlreadyVoted(proposalId, sender);
        }
        
        // Si el usuario ya votó con un voto diferente, restar su voto anterior (1 voto = 1 persona)
        if (userHasVoted && previousVote != voteType) {
            if (previousVote == VoteType.A_FAVOR) {
                proposal.votesFor -= 1;
            } else if (previousVote == VoteType.EN_CONTRA) {
                proposal.votesAgainst -= 1;
            } else if (previousVote == VoteType.ABSTENCION) {
                proposal.votesAbstention -= 1;
            }
        }

        // Agregar el nuevo voto (1 voto = 1 persona)
        if (voteType == VoteType.A_FAVOR) {
            proposal.votesFor += 1;
        } else if (voteType == VoteType.EN_CONTRA) {
            proposal.votesAgainst += 1;
        } else if (voteType == VoteType.ABSTENCION) {
            proposal.votesAbstention += 1;
        }

        // Actualizar el voto del usuario
        userVotes[sender][proposalId] = voteType;
        hasVoted[sender][proposalId] = true;

        emit VoteCast(proposalId, sender, voteType);
    }

    /**
     * @dev Ejecuta una propuesta aprobada
     * @param proposalId ID de la propuesta a ejecutar
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        // Validar que la propuesta existe
        if (proposal.id == 0) {
            revert ProposalNotFound(proposalId);
        }
        
        // Validar que la propuesta no ha sido ejecutada
        if (proposal.executed) {
            revert ProposalAlreadyExecuted(proposalId);
        }
        
        // Validar que el deadline ha pasado
        if (block.timestamp < proposal.deadline) {
            revert ProposalDeadlineNotPassed(proposalId);
        }
        
        // Validar que la propuesta fue aprobada (más votos a favor que en contra)
        if (proposal.votesFor <= proposal.votesAgainst) {
            revert ProposalNotApproved(proposalId);
        }
        
        // Validar que ha pasado el período de seguridad
        if (block.timestamp < proposal.deadline + SECURITY_PERIOD) {
            revert SecurityPeriodNotPassed(proposalId);
        }
        
        // Validar que hay suficientes fondos
        if (proposal.amount > address(this).balance) {
            revert InsufficientBalance(address(this));
        }

        // Validar que el recipient es válido (no es address(0))
        if (proposal.recipient == address(0)) {
            revert InvalidRecipient(proposal.recipient);
        }

        // Transferir fondos al beneficiario ANTES de marcar como ejecutada
        // Esto previene que la propuesta quede marcada como ejecutada si la transferencia falla
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "DAOVoting: transfer failed");

        // Solo después de éxito, marcar como ejecutada
        proposal.executed = true;
        proposal.executionTime = block.timestamp;

        emit ProposalExecuted(proposalId, proposal.recipient, proposal.amount);
    }

    /**
     * @dev Obtiene los detalles de una propuesta
     * @param proposalId ID de la propuesta
     * @return La estructura Proposal completa
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (proposals[proposalId].id == 0) {
            revert ProposalNotFound(proposalId);
        }
        return proposals[proposalId];
    }

    /**
     * @dev Obtiene el balance de un usuario en el DAO
     * @param user Dirección del usuario
     * @return Balance del usuario
     */
    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    /**
     * @dev Obtiene el voto de un usuario en una propuesta
     * @param user Dirección del usuario
     * @param proposalId ID de la propuesta
     * @return El tipo de voto del usuario
     */
    function getUserVote(address user, uint256 proposalId) external view returns (VoteType) {
        return userVotes[user][proposalId];
    }

    /**
     * @dev Función para recibir ETH directamente
     */
    receive() external payable {
        userBalances[_msgSender()] += msg.value;
        totalBalance += msg.value;
        emit FundsDeposited(_msgSender(), msg.value);
    }
}

