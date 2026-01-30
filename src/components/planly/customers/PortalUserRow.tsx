'use client';

import { useState } from 'react';
import { Trash2, Send, Check, Clock, AlertCircle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface PortalUser {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  is_primary: boolean;
  invite_sent_at?: string;
  invite_expires_at?: string;
  auth_user_id?: string;
}

interface PortalUserRowProps {
  user: PortalUser;
  onUpdate: (updates: Partial<PortalUser>) => void;
  onRemove: () => void;
  onSendInvite: () => void;
  isNew?: boolean;
}

export function PortalUserRow({
  user,
  onUpdate,
  onRemove,
  onSendInvite,
  isNew,
}: PortalUserRowProps) {
  const [isSending, setIsSending] = useState(false);

  // Calculate status
  const getStatus = () => {
    if (user.auth_user_id) return 'active';
    if (!user.invite_sent_at) return 'not_invited';
    if (user.invite_expires_at && new Date(user.invite_expires_at) < new Date()) return 'expired';
    return 'invited';
  };

  const status = getStatus();

  const handleSendInvite = async () => {
    setIsSending(true);
    try {
      await onSendInvite();
    } finally {
      setIsSending(false);
    }
  };

  const statusConfig = {
    not_invited: {
      icon: AlertCircle,
      label: 'Not Invited',
      className: 'text-gray-500 dark:text-white/40',
      bgClassName: 'bg-gray-100 dark:bg-white/10',
    },
    invited: {
      icon: Clock,
      label: 'Invite Sent',
      className: 'text-amber-600 dark:text-amber-400',
      bgClassName: 'bg-amber-50 dark:bg-amber-500/10',
    },
    expired: {
      icon: AlertCircle,
      label: 'Expired',
      className: 'text-red-600 dark:text-red-400',
      bgClassName: 'bg-red-50 dark:bg-red-500/10',
    },
    active: {
      icon: Check,
      label: 'Active',
      className: 'text-green-600 dark:text-green-400',
      bgClassName: 'bg-green-50 dark:bg-green-500/10',
    },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
      {/* Primary indicator */}
      <button
        type="button"
        onClick={() => onUpdate({ is_primary: !user.is_primary })}
        className={cn(
          'p-1 rounded',
          user.is_primary
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-gray-300 dark:text-white/20 hover:text-gray-400 dark:hover:text-white/40'
        )}
        title={user.is_primary ? 'Primary contact' : 'Set as primary'}
      >
        <Crown className="h-4 w-4" />
      </button>

      {/* Name */}
      <div className="w-40">
        <Input
          value={user.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Name"
          className="h-8 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40"
        />
      </div>

      {/* Email */}
      <div className="flex-1">
        <Input
          type="email"
          value={user.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          placeholder="Email address"
          disabled={!!user.auth_user_id}
          className="h-8 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 disabled:opacity-50"
        />
      </div>

      {/* Status Badge */}
      <div className={cn(
        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
        statusConfig[status].bgClassName,
        statusConfig[status].className
      )}>
        <StatusIcon className="h-3 w-3" />
        {statusConfig[status].label}
      </div>

      {/* Send/Resend Invite Button */}
      {status !== 'active' && !isNew && (
        <Button
          type="button"
          variant="outline"
          onClick={handleSendInvite}
          disabled={isSending || !user.email}
          className="h-8 px-3 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
        >
          <Send className="h-3 w-3 mr-1" />
          {isSending ? 'Sending...' : status === 'not_invited' ? 'Invite' : 'Resend'}
        </Button>
      )}

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        onClick={onRemove}
        disabled={!!user.auth_user_id}
        className="h-8 w-8 px-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
        title={user.auth_user_id ? 'Cannot remove active user' : 'Remove'}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
