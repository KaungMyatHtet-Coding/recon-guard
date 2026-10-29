export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    company_name?: string | null;
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

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash?: FlashMessages;
};
