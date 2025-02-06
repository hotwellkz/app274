import { createClient } from '@supabase/supabase-js';
import { ChatStore, Chat } from '../types/chat';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Создаем клиент Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Загрузка чатов из Supabase
export async function getChatsFromSupabase(): Promise<ChatStore> {
    try {
        const { data, error } = await supabase
            .from('whatsapp_chats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        if (data && data.length > 0 && data[0].chats) {
            console.log('Loaded chats from Supabase:', Object.keys(data[0].chats).length);
            return data[0].chats as ChatStore;
        }

        return {};
    } catch (error) {
        console.error('Error loading chats from Supabase:', error);
        return {};
    }
}

// Сохранение чата в Supabase
export async function saveChatToSupabase(chat: Chat): Promise<void> {
    try {
        // Получаем текущие чаты
        const { data, error: fetchError } = await supabase
            .from('whatsapp_chats')
            .select('chats')
            .order('created_at', { ascending: false })
            .limit(1);

        let currentChats: ChatStore = {};
        if (data && data.length > 0 && data[0].chats) {
            currentChats = data[0].chats as ChatStore;
        }

        // Обновляем чаты
        currentChats[chat.phoneNumber] = chat;

        // Сохраняем обновленные чаты
        const { error } = await supabase
            .from('whatsapp_chats')
            .insert({
                chats: currentChats,
                created_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error saving chat to Supabase:', error);
        throw error;
    }
}

// Инициализация бакета для медиафайлов
export async function initializeMediaBucket() {
    try {
        // Проверяем существование бакета
        const { data: buckets, error: listError } = await supabase
            .storage
            .listBuckets();

        if (listError) {
            throw listError;
        }

        const whatsappBucket = buckets?.find(b => b.name === 'whatsapp-media');

        if (!whatsappBucket) {
            // Создаем бакет, если он не существует
            const { error: createError } = await supabase
                .storage
                .createBucket('whatsapp-media', {
                    public: true,
                    fileSizeLimit: 50000000 // 50MB лимит
                });

            if (createError) {
                throw createError;
            }
            console.log('Created whatsapp-media bucket');
        } else {
            console.log('whatsapp-media bucket already exists');
        }
    } catch (error) {
        console.error('Error initializing media bucket:', error);
        throw error;
    }
}

// Загрузка медиафайла в Supabase Storage
export async function uploadMediaToSupabase(
    file: Buffer,
    fileName: string,
    mediaType: string
): Promise<string> {
    try {
        const fileExt = fileName.split('.').pop() || '';
        const timestamp = new Date().getTime();
        const uniqueFileName = `${timestamp}_${fileName}`;
        
        let folderPath = 'other';
        if (mediaType.startsWith('image/')) {
            folderPath = 'images';
        } else if (mediaType.startsWith('video/')) {
            folderPath = 'videos';
        } else if (mediaType.startsWith('audio/')) {
            folderPath = 'audio';
        }

        const filePath = `${folderPath}/${uniqueFileName}`;

        const { error: uploadError } = await supabase
            .storage
            .from('whatsapp-media')
            .upload(filePath, file, {
                contentType: mediaType,
                cacheControl: '3600'
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('whatsapp-media')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading media to Supabase:', error);
        throw error;
    }
}
