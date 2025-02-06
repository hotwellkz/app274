import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { loadChats, addMessage, saveChats, initializeChatsCache, clearUnread } from './utils/chatStorage';
import { Chat, ChatMessage } from './types/chat';
import fileUpload from 'express-fileupload';
import { uploadMediaToSupabase, initializeMediaBucket } from './config/supabase';
import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import os from 'os';

// Загружаем переменные окружения
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Инициализация Express
const app = express();
const httpServer = createServer(app);

// Инициализация Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    pingTimeout: 60000,
    transports: ['websocket', 'polling']
});

// Настройка CORS для Express
app.use(cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Настройка express-fileupload и JSON parsing
app.use(fileUpload());
app.use(express.json());

// Инициализация клиента WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

let qrCode: string | null = null;

// Функция для получения длительности аудио
const getAudioDuration = async (buffer: Buffer): Promise<number> => {
    try {
        const { getAudioDurationInSeconds } = await import('get-audio-duration');
        const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.webm`);
        await fs.writeFile(tempFile, buffer);
        const duration = await getAudioDurationInSeconds(tempFile);
        await fs.unlink(tempFile);
        return Math.round(duration);
    } catch (error: any) {
        console.error('Error getting audio duration:', error);
        return 0;
    }
};

// Получение списка чатов
app.get('/chats', async (req, res) => {
    try {
        console.log('GET /chats request received');
        const chats = await loadChats();
        console.log('Sending chats to client:', chats);
        // Отправляем чаты в том же формате, что ожидает фронтенд
        res.json(chats);
    } catch (error: any) {
        console.error('Error getting chats:', error);
        res.status(500).json({ 
            error: 'Failed to load chats',
            details: error?.message || 'Unknown error'
        });
    }
});

// API endpoint для очистки непрочитанных сообщений
app.post('/chats/:phoneNumber/clear-unread', async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        await clearUnread(phoneNumber);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error clearing unread messages:', error);
        res.status(500).json({ 
            error: 'Failed to clear unread messages',
            details: error?.message || 'Unknown error'
        });
    }
});

// API endpoint для загрузки медиафайлов
app.post('/upload-media', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadedFile = req.files.file as fileUpload.UploadedFile;
        const buffer = Buffer.from(uploadedFile.data);
        const fileName = uploadedFile.name;
        const mediaType = uploadedFile.mimetype;

        console.log('Uploading file:', fileName, 'type:', mediaType);

        let duration = 0;
        if (mediaType.startsWith('audio/')) {
            duration = await getAudioDuration(buffer);
        }

        // Загружаем файл в Supabase Storage
        const publicUrl = await uploadMediaToSupabase(buffer, fileName, mediaType);
        console.log('File uploaded successfully:', publicUrl);

        res.json({
            url: publicUrl,
            duration,
            isVoiceMessage: mediaType.startsWith('audio/') && fileName.includes('voice_message')
        });
    } catch (error: any) {
        console.error('Error uploading media:', error);
        res.status(500).json({ 
            error: 'Failed to upload media',
            details: error?.message || 'Unknown error'
        });
    }
});

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('Client connected');

    // Отправляем текущие чаты при подключении
    (async () => {
        try {
            const chats = await loadChats();
            socket.emit('chats', chats);
        } catch (error: any) {
            console.error('Error sending chats:', error);
        }
    })();

    socket.on('send_message', async (data: {
        phoneNumber: string;
        message: string;
        mediaUrl?: string;
        fileName?: string;
        fileSize?: number;
        mediaType?: string;
        isVoiceMessage?: boolean;
        duration?: number;
    }) => {
        try {
            const { phoneNumber, message, mediaUrl, fileName, fileSize, mediaType, isVoiceMessage, duration } = data;
            
            // Форматируем номер телефона
            const formattedNumber = phoneNumber.includes('@c.us') 
                ? phoneNumber 
                : `${phoneNumber.replace(/[^\d]/g, '')}@c.us`;
            
            let whatsappMessage;
            
            // Если есть медиафайл, скачиваем его и отправляем через WhatsApp
            if (mediaUrl) {
                console.log('Downloading media from:', mediaUrl);
                try {
                    const response = await axios.get(mediaUrl, {
                        responseType: 'arraybuffer'
                    });
                    
                    const buffer = Buffer.from(response.data as ArrayBuffer);
                    const mimeType = mediaType || 'application/octet-stream';
                    
                    // Создаем объект MessageMedia
                    const media = new MessageMedia(
                        mimeType,
                        buffer.toString('base64'),
                        fileName
                    );
                    
                    // Отправляем медиафайл через WhatsApp
                    whatsappMessage = await client.sendMessage(formattedNumber, media, {
                        caption: message, // Добавляем текст сообщения как подпись к медиафайлу
                        sendAudioAsVoice: isVoiceMessage // Отправляем аудио как голосовое сообщение
                    });
                    
                    console.log('Media message sent successfully:', whatsappMessage.id._serialized);
                } catch (error: any) {
                    console.error('Error downloading or sending media:', error);
                    throw new Error('Failed to send media message');
                }
            } else {
                // Отправляем обычное текстовое сообщение
                whatsappMessage = await client.sendMessage(formattedNumber, message);
                console.log('Text message sent successfully:', whatsappMessage.id._serialized);
            }
            
            // Создаем объект сообщения для сохранения
            const chatMessage: ChatMessage = {
                id: whatsappMessage.id._serialized,
                body: message || '',
                from: whatsappMessage.from,
                to: formattedNumber,
                timestamp: new Date().toISOString(),
                fromMe: true,
                hasMedia: !!mediaUrl,
                mediaUrl,
                fileName,
                fileSize,
                mediaType,
                isVoiceMessage,
                duration
            };

            // Сохраняем сообщение и получаем обновленный чат
            const updatedChat = await addMessage(chatMessage);
            
            // Оповещаем всех клиентов о новом сообщении и обновлении чата
            io.emit('whatsapp-message', chatMessage);
            io.emit('chat-updated', updatedChat);

        } catch (error: any) {
            console.error('Error sending message:', error);
            socket.emit('error', { 
                message: 'Failed to send message',
                error: error?.message || 'Unknown error'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Обработчики событий WhatsApp
client.on('qr', async (qr) => {
    try {
        qrCode = await qrcode.toDataURL(qr);
        io.emit('qr', qrCode);
        console.log('QR Code generated');
    } catch (error: any) {
        console.error('Error generating QR code:', error);
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    io.emit('ready');
    qrCode = null;
});

client.on('message', async (msg) => {
    try {
        console.log('Received message:', msg.body);
        
        let mediaUrl = '';
        let mediaType = '';
        let fileName = '';
        let fileSize = 0;
        let isVoiceMessage = false;
        let duration = 0;

        // Если сообщение содержит медиа
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            if (media) {
                // Создаем имя файла из типа сообщения и timestamp, если оригинальное имя не указано
                const defaultFileName = `${msg.type}_${Date.now()}.${media.mimetype.split('/')[1]}`;
                
                // Загружаем медиа в Supabase
                mediaUrl = await uploadMediaToSupabase(
                    Buffer.from(media.data, 'base64'),
                    media.filename || defaultFileName,
                    media.mimetype
                );
                mediaType = media.mimetype;
                fileName = media.filename || defaultFileName;
                isVoiceMessage = msg.type === 'ptt'; // ptt = push to talk (голосовое сообщение)
                
                if (isVoiceMessage) {
                    // Получаем длительность аудио
                    const buffer = Buffer.from(media.data, 'base64');
                    duration = await getAudioDuration(buffer);
                }
            }
        }

        // Создаем объект сообщения
        const message: ChatMessage = {
            id: msg.id.id,
            body: msg.body,
            from: msg.from,
            to: msg.to,
            timestamp: new Date().toISOString(),
            fromMe: msg.fromMe,
            hasMedia: msg.hasMedia,
            mediaUrl,
            mediaType,
            fileName,
            fileSize,
            isVoiceMessage,
            duration
        };

        // Добавляем сообщение в чат
        const chat = await addMessage(message);
        
        // Отправляем сообщение всем подключенным клиентам
        io.emit('whatsapp-message', message);
        io.emit('chat-updated', chat);
        
    } catch (error: any) {
        console.error('Error processing message:', error);
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    io.emit('disconnected', reason);
    qrCode = null;
});

// Сохраняем чаты перед выходом
process.on('SIGINT', async () => {
    try {
        await saveChats();
        console.log('Chats saved successfully');
        process.exit(0);
    } catch (error: any) {
        console.error('Error saving chats:', error);
        process.exit(1);
    }
});

// Инициализируем все компоненты и запускаем сервер
(async () => {
    try {
        // Загружаем чаты
        await initializeChatsCache();
        console.log('Chats loaded successfully');

        // Инициализируем хранилище медиафайлов
        await initializeMediaBucket();
        console.log('Media storage initialized successfully');

        // Запускаем WhatsApp клиент
        await client.initialize();
        console.log('WhatsApp client initialized');

        // Запускаем сервер
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Socket.IO is configured with CORS origin: ${FRONTEND_URL}`);
        });

        // Обработка ошибок сервера
        httpServer.on('error', (error: Error) => {
            console.error('Server error:', error);
        });
    } catch (error: any) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
})();

// Обработка необработанных исключений
process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error: Error) => {
    console.error('Unhandled Rejection:', error);
});
