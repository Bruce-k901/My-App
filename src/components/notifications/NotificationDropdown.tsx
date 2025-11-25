"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isButton = buttonRef.current?.contains(target);
      const isDropdown = dropdownRef.current?.contains(target);

      if (!isButton && !isDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to link if exists
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return '✅';
      case 'task_assigned':
        return '📋';
      case 'task_updated':
        return '🔄';
      case 'task_overdue':
        return '⚠️';
      case 'message':
        return '💬';
      case 'incident':
        return '🚨';
      default:
        return '🔔';
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.1]
          transition-all duration-200
          ${
            isOpen
              ? 'bg-pink-500/20 text-pink-400 border-pink-500/30'
              : 'text-white/60 hover:text-white hover:bg-white/[0.12]'
          }
        `}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-pink-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && mounted && (() => {
        const buttonRect = buttonRef.current?.getBoundingClientRect();
        const buttonTop = buttonRect?.top ?? 0;
        const buttonRight = buttonRect?.right ?? 0;

        const backdrop = createPortal(
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            style={{
              zIndex: 9998,
              pointerEvents: 'auto',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />,
          document.body
        );

        return (
          <>
            {backdrop}

            {/* Dropdown */}
            {createPortal(
              <div
                ref={dropdownRef}
                className="fixed"
                style={{
                  zIndex: 9999,
                  top: `${buttonTop + (buttonRect?.height ?? 0) + 8}px`,
                  right: typeof window !== 'undefined' ? `${window.innerWidth - buttonRight}px` : '24px',
                  pointerEvents: 'auto',
                  position: 'fixed',
                  maxHeight: 'calc(100vh - 100px)',
                  width: '380px',
                  maxWidth: 'calc(100vw - 32px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#0f1119] border border-pink-500/20 border-t-2 border-t-pink-500 rounded-xl backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col" style={{ backgroundColor: 'rgba(15, 17, 25, 0.98)' }}>
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/[0.1] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-pink-400" />
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-xs text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto max-h-[400px]">
                    {loading ? (
                      <div className="p-8 text-center text-white/40 text-sm">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-white/20 mx-auto mb-2" />
                        <p className="text-white/40 text-sm">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.06]">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`
                              p-3 transition-colors cursor-pointer group relative
                              ${notification.read 
                                ? 'bg-transparent hover:bg-white/[0.03]' 
                                : 'bg-pink-500/5 hover:bg-pink-500/10'
                              }
                            `}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex gap-3">
                              {/* Icon */}
                              <div className="flex-shrink-0 text-2xl">
                                {getNotificationIcon(notification.type)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className={`text-sm font-medium ${notification.read ? 'text-white/80' : 'text-white'}`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0 mt-1" />
                                  )}
                                </div>
                                {notification.message && (
                                  <p className="text-xs text-white/60 mb-2 line-clamp-2">
                                    {notification.message}
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/40">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notification.read && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id);
                                        }}
                                        className="p-1 hover:bg-white/[0.1] rounded transition-colors"
                                        title="Mark as read"
                                      >
                                        <Check className="w-3 h-3 text-white/60" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-400/60" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        );
      })()}
    </>
  );
}
