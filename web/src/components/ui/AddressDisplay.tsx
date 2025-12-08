'use client';

interface AddressDisplayProps {
  address: string;
  showCopy?: boolean;
  maxLength?: number;
}

export default function AddressDisplay({ address, showCopy = true, maxLength = 10 }: AddressDisplayProps) {
  const truncateAddress = (addr: string) => {
    if (addr.length <= maxLength * 2 + 2) return addr;
    return `${addr.slice(0, maxLength)}...${addr.slice(-maxLength)}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    // Puedes agregar un toast aquí si lo deseas
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{truncateAddress(address)}</span>
      {showCopy && (
        <button
          onClick={copyToClipboard}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
          title="Copiar dirección"
        >
          📋
        </button>
      )}
    </div>
  );
}

