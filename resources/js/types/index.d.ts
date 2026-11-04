export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    nrc_number?: string | null;
    address?: string | null;
    emergency_contact?: string | null;
    company_name?: string | null;
    avatar_path?: string | null;
    avatar_url?: string | null;
    is_blacklisted: boolean;
    blacklist_reason?: string | null;
    roles?: string[];
    email_verified_at?: string;
}

export interface FlashMessages {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
}

export interface AccountNotificationItem {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    notifications?: AccountNotificationItem[];
    unread_notifications_count?: number;
    flash?: FlashMessages;
};
