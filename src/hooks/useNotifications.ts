import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export interface Notification {
    id: string;
    company_id: string;
    user_id: string;
    type:
        | "task_assigned"
        | "task_updated"
        | "task_completed"
        | "task_overdue"
        | "message"
        | "incident"
        | "other";
    title: string;
    message: string | null;
    link: string | null;
    read: boolean;
    metadata: any;
    created_at: string;
}

export function useNotifications() {
    const { userId } = useAppContext();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Load notifications
    const loadNotifications = async () => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount((data || []).filter((n) => !n.read).length);
        } catch (error) {
            console.error("Error loading notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", notificationId);

            if (error) throw error;

            // Update local state
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, read: true } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from("notifications")
                .update({ read: true })
                .eq("user_id", userId)
                .eq("read", false);

            if (error) throw error;

            // Update local state
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", notificationId);

            if (error) throw error;

            // Update local state
            const notification = notifications.find((n) =>
                n.id === notificationId
            );
            setNotifications((prev) =>
                prev.filter((n) => n.id !== notificationId)
            );
            if (notification && !notification.read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    // Initial load
    useEffect(() => {
        loadNotifications();
    }, [userId]);

    // Real-time subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel("notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications((prev) => [newNotification, ...prev]);
                    setUnreadCount((prev) => prev + 1);
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const updatedNotification = payload.new as Notification;
                    setNotifications((prev) =>
                        prev.map((n) =>
                            n.id === updatedNotification.id
                                ? updatedNotification
                                : n
                        )
                    );
                    // Recalculate unread count
                    setUnreadCount((prev) => {
                        const oldNotification = notifications.find((n) =>
                            n.id === updatedNotification.id
                        );
                        if (
                            oldNotification && !oldNotification.read &&
                            updatedNotification.read
                        ) {
                            return Math.max(0, prev - 1);
                        }
                        return prev;
                    });
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const deletedId = payload.old.id;
                    const deletedNotification = notifications.find((n) =>
                        n.id === deletedId
                    );
                    setNotifications((prev) =>
                        prev.filter((n) => n.id !== deletedId)
                    );
                    if (deletedNotification && !deletedNotification.read) {
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh: loadNotifications,
    };
}
