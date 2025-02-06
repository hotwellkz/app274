import { supabase } from '../config/supabase';
import { Chat, ChatMessage, ChatStore } from '../types/chat';

let chatsCache: ChatStore = {};

// Загрузка чатов из Supabase
export const loadChats = async (): Promise<ChatStore> => {
    try {
        console.log('Loading chats from Supabase...');
        const { data: chatsData, error } = await supabase
            .from('whatsapp_chats')
            .select('*');

        if (error) {
            console.error('Error loading chats from Supabase:', error);
            throw error;
        }

        console.log('Loaded chats from Supabase:', chatsData);

        // Обновляем кэш
        const formattedChats: ChatStore = {};
        if (chatsData && Array.isArray(chatsData)) {
            chatsData.forEach((chat: any) => {
                if (!chat.phoneNumber) {
                    console.warn('Chat without phoneNumber:', chat);
                    return;
                }

                // Форматируем сообщения
                const messages = Array.isArray(chat.messages) ? chat.messages.map((msg: ChatMessage) => ({
                    ...msg,
                    isVoiceMessage: msg.isVoiceMessage || false,
                    duration: msg.duration || 0
                })) : [];

                // Форматируем последнее сообщение
                const lastMessage = chat.lastMessage ? {
                    ...chat.lastMessage,
                    isVoiceMessage: chat.lastMessage.isVoiceMessage || false,
                    duration: chat.lastMessage.duration || 0
                } : undefined;

                formattedChats[chat.phoneNumber] = {
                    id: chat.id || `chat_${Date.now()}`,
                    phoneNumber: chat.phoneNumber,
                    name: chat.name || chat.phoneNumber.replace('@c.us', ''),
                    messages: messages,
                    lastMessage: lastMessage,
                    unreadCount: typeof chat.unreadCount === 'number' ? chat.unreadCount : 0,
                    timestamp: chat.timestamp || new Date().toISOString()
                };
            });
        }

        chatsCache = formattedChats;
        console.log('Formatted chats:', formattedChats);
        return formattedChats;
    } catch (error) {
        console.error('Error in loadChats:', error);
        return {};
    }
};

// Инициализация кэша чатов
export const initializeChatsCache = async (): Promise<void> => {
    try {
        console.log('Initializing chats cache...');
        const chats = await loadChats();
        chatsCache = chats;
        console.log('Chats cache initialized:', chatsCache);
    } catch (error) {
        console.error('Error initializing chats cache:', error);
        throw error;
    }
};

// Добавление сообщения в чат
export const addMessage = async (message: ChatMessage): Promise<Chat> => {
    try {
        console.log('Adding message:', message);
        
        // Определяем номер телефона для чата
        const phoneNumber = message.fromMe ? message.to : message.from;
        if (!phoneNumber) {
            throw new Error('No phone number in message');
        }

        console.log('Phone number for chat:', phoneNumber);

        // Получаем или создаем чат
        let chat = chatsCache[phoneNumber];
        if (!chat) {
            chat = {
                id: `chat_${Date.now()}`,
                phoneNumber,
                name: phoneNumber.replace('@c.us', ''),
                messages: [],
                unreadCount: 0,
                timestamp: new Date().toISOString()
            };
            chatsCache[phoneNumber] = chat;
            console.log('Created new chat:', chat);
        }

        // Проверяем, не дубликат ли это сообщение
        const isDuplicate = chat.messages.some(msg => msg.id === message.id);
        if (isDuplicate) {
            console.log('Duplicate message, skipping');
            return chat;
        }

        // Добавляем сообщение в массив
        chat.messages.push(message);
        
        // Обновляем последнее сообщение
        chat.lastMessage = message;
        
        // Обновляем временную метку чата
        chat.timestamp = message.timestamp;

        // Увеличиваем счетчик непрочитанных для входящих сообщений
        if (!message.fromMe) {
            chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        console.log('Updated chat:', chat);

        // Сохраняем в Supabase
        try {
            const { error } = await supabase
                .from('whatsapp_chats')
                .upsert({
                    id: chat.id,
                    phoneNumber: chat.phoneNumber,
                    name: chat.name,
                    messages: chat.messages,
                    lastMessage: chat.lastMessage,
                    unreadCount: chat.unreadCount,
                    timestamp: chat.timestamp
                });

            if (error) {
                console.error('Error saving chat to Supabase:', error);
            } else {
                console.log('Chat saved to Supabase successfully');
            }
        } catch (error) {
            console.error('Error in Supabase operation:', error);
        }

        return chat;
    } catch (error) {
        console.error('Error in addMessage:', error);
        throw error;
    }
};

// Сохранение чатов в Supabase
export const saveChats = async (): Promise<void> => {
    try {
        console.log('Saving chats to Supabase...');
        // Получаем массив чатов
        const chats = Object.values(chatsCache);
        console.log('Chats to save:', chats);

        // Удаляем все существующие чаты
        const { error: deleteError } = await supabase
            .from('whatsapp_chats')
            .delete()
            .neq('id', '0');

        if (deleteError) {
            console.error('Error deleting existing chats:', deleteError);
            throw deleteError;
        }

        // Вставляем обновленные чаты
        if (chats.length > 0) {
            const { error: insertError } = await supabase
                .from('whatsapp_chats')
                .insert(chats);

            if (insertError) {
                console.error('Error inserting chats:', insertError);
                throw insertError;
            }
        }

        console.log('Chats saved successfully');
    } catch (error) {
        console.error('Error in saveChats:', error);
        throw error;
    }
};

// Получение чата по номеру телефона
export const getChat = (phoneNumber: string): Chat | undefined => {
    return chatsCache[phoneNumber];
};

// Очистка непрочитанных сообщений
export const clearUnread = async (phoneNumber: string): Promise<void> => {
    const chat = chatsCache[phoneNumber];
    if (chat) {
        chat.unreadCount = 0;
        await saveChats();
    }
};
