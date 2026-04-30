import { BrowserWindow } from 'electron';

export interface BrowserAccountSession {
    id: string;
    platform: 'airbnb' | 'gathern' | 'whatsapp';
    accountName: string;
    partition: string;
    createdBy: string;
    authToken?: string;
    chatAuthToken?: string;
    platformUserId?: string;
    window?: BrowserWindow; // Reference to the actual BrowserWindow if open
}

export interface SessionHealthResult {
    healthy: boolean;
    reason: string;
}

export interface AirbnbStandardText {
    accessibilityText?: string;
    components?: Array<{
        text?: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}

export interface AirbnbThreadParticipant {
    node?: {
        accountId?: string;
        participantRole?: string;
        productRole?: string;
        [key: string]: unknown;
    };
}

export interface AirbnbMessage {
    id?: string;
    messageId?: string;
    text?: string | AirbnbStandardText;
    body?: string | AirbnbStandardText;
    content?: string | AirbnbStandardText;
    message?: string;
    createdAt?: string;
    createdAtMs?: number;
    created_at?: string;
    updatedAtMs?: number;
    senderId?: string;
    sender?: {
        id?: string;
        firstName?: string;
    };
    author?: {
        firstName?: string;
    };
    role?: string;
    hydratedContent?: {
        plainText?: string;
        content?: {
            body?: string;
            subMessages?: Array<{
                body?: string;
                [key: string]: unknown;
            }>;
        };
    };
    contentPreview?: {
        content?: string;
        translatedContent?: string;
    };
    threadId?: string;
    thread_id?: string;
    thread?: {
        id?: string;
    };
    guestName?: string;
    account?: {
        accountId?: string;
        [key: string]: unknown;
    };
    sender_id?: string | number;
    senderName?: string;
}

export interface AirbnbThreadNode {
    id: string;
    threadId?: string;
    inboxTitle?: string | AirbnbStandardText;
    name?: string;
    otherUser?: {
        firstName?: string;
    };
    messages?: {
        edges: Array<{
            node: AirbnbMessage;
            [key: string]: unknown;
        }>;
    };
    lastMessage?: AirbnbMessage;
    messagePreview?: AirbnbMessage;
    inboxMessage?: AirbnbMessage;
    inboxPreview?: AirbnbMessage;
    previewMessage?: AirbnbMessage;
    lastMessageAt?: string;
    updatedAt?: string;
    participants?: {
        edges: AirbnbThreadParticipant[];
    };
    threadData?: {
        participants?: {
            edges: AirbnbThreadParticipant[];
        };
    };
    orderedParticipants?: Array<{
        accountId?: string;
        [key: string]: unknown;
    }>;
    userThreadTags?: Array<{
        userThreadTagName?: string;
        additionalValues?: string[];
        [key: string]: unknown;
    }>;
    listingId?: string;
    listing_id?: string;
    reservationId?: string;
    reservation_id?: string;
    reservation?: {
        id?: string;
        listingId?: string;
    };
}

export interface GathernMessage {
    id?: string | number;
    message_id?: string | number;
    sender_id?: string | number;
    message?: string;
    body?: string;
    created_at?: number;
    chat_uid?: string;
    thread_uid?: string;
    is_provider?: boolean;
    sender_name?: string;
}

export interface GathernChat {
    chat_uid?: string;
    id?: string | number;
    name?: string;
    name_verified?: string;
    last_message?: GathernMessage;
    updated_at?: number;
    provider_id?: string | number;
    unit_id?: string | number;
    chalet_id?: string | number;
    reservation_id?: string | number;
}
