'use client';

import { CheckCircle, Clock, AlertTriangle } from '@/components/ui/icons';

// ============================================================================
// WhatsApp message delivery status badge
// ============================================================================

interface MessageStatusProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: React.ElementType;
}> = {
  queued: { label: 'Queued', color: 'text-yellow-500', icon: Clock },
  sent: { label: 'Sent', color: 'text-blue-500', icon: CheckCircle },
  delivered: { label: 'Delivered', color: 'text-emerald-500', icon: CheckCircle },
  read: { label: 'Read', color: 'text-emerald-600', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-500', icon: AlertTriangle },
  received: { label: 'Received', color: 'text-blue-400', icon: CheckCircle },
};

export default function MessageStatus({ status, className = '' }: MessageStatusProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
