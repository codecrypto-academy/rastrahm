'use client';

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'none';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-300 dark:border-green-700',
      icon: '▶️',
      label: 'Activo',
    },
    paused: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-200',
      border: 'border-orange-300 dark:border-orange-700',
      icon: '⏸️',
      label: 'Pausado',
    },
    none: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-800 dark:text-gray-200',
      border: 'border-gray-300 dark:border-gray-600',
      icon: '⏹️',
      label: 'Sin flujo',
    },
  };

  const statusConfig = config[status];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border rounded-full font-medium ${sizeClasses}`}
    >
      <span>{statusConfig.icon}</span>
      <span>{statusConfig.label}</span>
    </span>
  );
}

