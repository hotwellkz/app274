export interface ChatMessage {
    id: string;
    body: string;
    from?: string;
    to: string;
    timestamp: string;
    fromMe: boolean;
    hasMedia?: boolean;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    isVoiceMessage?: boolean;
    duration?: number; // Длительность голосового сообщения в секундах
}

export interface Chat {
    id: string;
    phoneNumber: string;
    name?: string;
    messages: ChatMessage[];
    lastMessage?: ChatMessage;
    unreadCount?: number;
    timestamp: string;
}

export interface ChatStore {
    [key: string]: Chat;
}
