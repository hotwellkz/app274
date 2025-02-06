import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { WhatsAppMessage } from '../types/WhatsAppTypes';

interface Chat {
    phoneNumber: string;
    name: string;
    messages: Message[];
    lastMessage?: Message;
}

interface Message {
    from: string;
    to?: string;
    body: string;
    timestamp: string;
    isGroup: boolean;
    sender?: string;
    fromMe: boolean;
}

interface ChatContextType {
    chats: { [key: string]: Chat };
    setChats: React.Dispatch<React.SetStateAction<{ [key: string]: Chat }>>;
    activeChat: string | null;
    setActiveChat: React.Dispatch<React.SetStateAction<string | null>>;
    loadChats: () => Promise<void>;
    createChat: (phoneNumber: string) => Promise<void>;
    qrCode: string;
    setQrCode: (code: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [chats, setChats] = useState<{ [key: string]: Chat }>({});
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const previousChatsRef = useRef<string>('');

    const loadChats = async () => {
        if (isLoading) return;
        try {
            setIsLoading(true);
            const response = await axios.get('http://localhost:3000/chats');
            const loadedChats = response.data;
            
            // Сравниваем новые данные с предыдущими
            const currentChatsString = JSON.stringify(loadedChats);
            if (currentChatsString !== previousChatsRef.current) {
                setChats(loadedChats);
                previousChatsRef.current = currentChatsString;
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createChat = async (phoneNumber: string) => {
        try {
            await axios.post('http://localhost:3000/chat', { phoneNumber });
            await loadChats();
            setActiveChat(phoneNumber);
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    };

    useEffect(() => {
        // Загружаем чаты при монтировании компонента
        const fetchInitialChats = async () => {
            await loadChats();
        };
        fetchInitialChats();

        // Устанавливаем интервал для периодического обновления чатов
        const interval = setInterval(async () => {
            await loadChats();
        }, 30000); // Обновляем каждые 30 секунд

        return () => {
            clearInterval(interval);
        };
    }, []); // Пустой массив зависимостей

    return (
        <ChatContext.Provider value={{
            chats,
            setChats,
            activeChat,
            setActiveChat,
            loadChats,
            createChat,
            qrCode,
            setQrCode
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
