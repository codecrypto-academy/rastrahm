import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setInterval as setIntervalTimer, clearInterval } from "node:timers";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env.local (prioridad) y .env como respaldo
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(__dirname, "..", envFile);
  loadEnv({ path: envPath, override: true });
}

const requiredEnv = [
  "NEXT_PUBLIC_DAO_ADDRESS",
  "RELAYER_PRIVATE_KEY",
  "RPC_URL",
];

const missing = requiredEnv.filter((key) => {
  const value = process.env[key];
  return !value || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error(
    `[daemon] Variables de entorno faltantes: ${missing.join(", ")}. ` +
      "Define estos valores en .env.local o .env antes de ejecutar el daemon."
  );
  process.exit(1);
}

const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS as string;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY as string;
const RPC_URL = process.env.RPC_URL as string;

const INTERVAL_MS = (() => {
  const raw = process.env.DAEMON_INTERVAL_MS ?? "60000";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(
      `[daemon] Valor inválido para DAEMON_INTERVAL_MS (${raw}). Usando 60000 ms.`
    );
    return 60_000;
  }
  return parsed;
})();

const runOnce = process.argv.includes("--once");

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

const daoAbi = [
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256 proposalId) view returns (uint256 id, address recipient, uint256 amount, uint256 deadline, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstention, bool executed, uint256 executionTime, uint256 creationTime)",
  "function SECURITY_PERIOD() view returns (uint256)",
  "function executeProposal(uint256 proposalId)"
];

const daoContract = new ethers.Contract(DAO_ADDRESS, daoAbi, wallet);

type ProposalStruct = {
  id: bigint;
  recipient: string;
  amount: bigint;
  deadline: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstention: bigint;
  executed: boolean;
  executionTime: bigint;
  creationTime: bigint;
};

const formatEtherSafe = (value: bigint) => ethers.formatEther(value);

let isCycleRunning = false;
let intervalHandle: NodeJS.Timeout | undefined;

const log = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[daemon][${timestamp}] ${message}`);
};

const logError = (message: string, error: unknown) => {
  const timestamp = new Date().toISOString();
  console.error(`[daemon][${timestamp}] ${message}`);
  console.error(error);
};

const shouldExecuteProposal = (
  proposal: ProposalStruct,
  now: bigint,
  securityPeriod: bigint
) => {
  if (proposal.id === 0n) {
    return false;
  }
  if (proposal.executed) {
    return false;
  }
  if (proposal.deadline > now) {
    return false;
  }
  if (proposal.votesFor <= proposal.votesAgainst) {
    return false;
  }
  if (proposal.deadline + securityPeriod > now) {
    return false;
  }
  return true;
};

const fetchProposal = async (proposalId: bigint): Promise<ProposalStruct> => {
  const proposal = (await daoContract.proposals(proposalId)) as ProposalStruct & {
    [key: number]: unknown;
  };

  return {
    id: proposal.id,
    recipient: proposal.recipient,
    amount: proposal.amount,
    deadline: proposal.deadline,
    votesFor: proposal.votesFor,
    votesAgainst: proposal.votesAgainst,
    votesAbstention: proposal.votesAbstention,
    executed: proposal.executed,
    executionTime: proposal.executionTime,
    creationTime: proposal.creationTime,
  };
};

const executeCycle = async () => {
  if (isCycleRunning) {
    log("Ciclo anterior aún en ejecución. Saltando esta iteración.");
    return;
  }

  isCycleRunning = true;

  try {
    const [network, proposalCount, securityPeriod] = await Promise.all([
      provider.getNetwork(),
      daoContract.proposalCount() as Promise<bigint>,
      daoContract.SECURITY_PERIOD() as Promise<bigint>,
    ]);

    log(
      `Red: ${network.name ?? network.chainId} | Propuestas registradas: ${proposalCount}`
    );

    if (proposalCount === 0n) {
      log("Sin propuestas registradas. Esperando siguiente ciclo...");
      return;
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const executableProposals: bigint[] = [];

    for (let id = 1n; id <= proposalCount; id++) {
      const proposal = await fetchProposal(id);

      if (!shouldExecuteProposal(proposal, now, securityPeriod)) {
        continue;
      }

      executableProposals.push(id);
    }

    if (executableProposals.length === 0) {
      log("No hay propuestas elegibles para ejecutar en este ciclo.");
      return;
    }

    log(
      `Propuestas pendientes de ejecución: ${executableProposals
        .map((id) => id.toString())
        .join(", ")}`
    );

    let availableBalance = await provider.getBalance(DAO_ADDRESS);

    for (const proposalId of executableProposals) {
      const proposal = await fetchProposal(proposalId);

      if (proposal.executed) {
        log(`Propuesta ${proposalId} ya ejecutada. Omitiendo.`);
        continue;
      }

      if (proposal.amount > availableBalance) {
        log(
          `Fondos insuficientes para la propuesta ${proposalId}. ` +
            `Balance DAO: ${formatEtherSafe(availableBalance)} ETH | ` +
            `Requerido: ${formatEtherSafe(proposal.amount)} ETH`
        );
        continue;
      }

      try {
        log(
          `Ejecutando propuesta ${proposalId} -> Destinatario: ${proposal.recipient} | ` +
            `Monto: ${formatEtherSafe(proposal.amount)} ETH`
        );

        const tx = await daoContract.executeProposal(proposalId);
        log(`Transacción enviada: ${tx.hash}`);

        const receipt = await tx.wait();
        log(
          `Propuesta ${proposalId} ejecutada correctamente en el bloque ${receipt.blockNumber}.`
        );

        availableBalance = await provider.getBalance(DAO_ADDRESS);
      } catch (error) {
        logError(`Error al ejecutar la propuesta ${proposalId}.`, error);
      }
    }
  } catch (error) {
    logError("Error inesperado durante el ciclo de ejecución.", error);
  } finally {
    isCycleRunning = false;
  }
};

const start = async () => {
  log("Iniciando daemon de ejecución de propuestas...");
  log(`Intervalo configurado: ${INTERVAL_MS} ms`);
  log(`Dirección DAO: ${DAO_ADDRESS}`);
  log(`Relayer: ${wallet.address}`);

  await executeCycle();

  if (runOnce) {
    log("Ejecución única completada. Cerrando daemon.");
    process.exit(0);
  }

  intervalHandle = setIntervalTimer(executeCycle, INTERVAL_MS);
};

const shutdown = (signal: NodeJS.Signals) => {
  log(`Recibida señal ${signal}. Terminando daemon...`);
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch((error) => {
  logError("Error crítico al iniciar el daemon.", error);
  process.exit(1);
});

