import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import { addMessage } from './utils/chatStorage';
import { ChatMessage } from './types/chat';
import qrcode from 'qrcode';
import { downloadMedia } from './utils/mediaUtils';

let client: Client;
let io: Server;

export const initializeWhatsApp = async (socketIO: Server): Promise<void> => {
    io = socketIO;

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox']
        }
    });

    client.on('qr', async (qr) => {
        try {
            console.log('QR Code received');
            const qrCode = await qrcode.toDataURL(qr);
            io.emit('qr', qrCode);
            console.log('QR Code sent to client');
        } catch (error: any) {
            console.error('Error generating QR code:', error);
        }
    });

    client.on('ready', () => {
        console.log('WhatsApp client is ready!');
        io.emit('ready');
    });

    client.on('message', async (msg: Message) => {
        try {
            console.log('Received message:', msg);

            let mediaUrl = '';
            let mediaType = '';
            let fileName = '';
            let fileSize = 0;
            let duration = 0;
            let isVoiceMessage = false;

            // Обработка медиафайлов
            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        const savedMedia = await downloadMedia(media);
                        mediaUrl = savedMedia.url;
                        mediaType = media.mimetype;
                        fileName = savedMedia.fileName;
                        fileSize = savedMedia.fileSize;
                        duration = savedMedia.duration || 0;
                        isVoiceMessage = msg.type === 'ptt' || media.mimetype.startsWith('audio/');
                    }
                } catch (error) {
                    console.error('Error downloading media:', error);
                }
            }

            // Создаем объект сообщения
            const chatMessage: ChatMessage = {
                id: msg.id.id,
                body: msg.body,
                from: msg.from,
                to: msg.to,
                timestamp: msg.timestamp.toString(),
                fromMe: msg.fromMe,
                hasMedia: msg.hasMedia,
                mediaUrl,
                mediaType,
                fileName,
                fileSize,
                isVoiceMessage,
                duration
            };

            // Добавляем сообщение в хранилище
            const chat = await addMessage(chatMessage);

            // Отправляем сообщение всем подключенным клиентам
            io.emit('whatsapp-message', chatMessage);
            io.emit('chat-updated', chat);

            console.log('Message processed and sent to clients');
        } catch (error: any) {
            console.error('Error processing incoming message:', error);
        }
    });

    client.on('disconnected', () => {
        console.log('Client disconnected');
        io.emit('disconnected');
    });

    try {
        await client.initialize();
        console.log('WhatsApp client initialized');
    } catch (error: any) {
        console.error('Error initializing WhatsApp client:', error);
        throw error;
    }
};

export const sendMessage = async (
    to: string,
    message: string,
    mediaUrl?: string
): Promise<ChatMessage | null> => {
    try {
        if (!client) {
            throw new Error('WhatsApp client not initialized');
        }

        let msg: Message;

        if (mediaUrl) {
            // Отправка медиафайла
            try {
                const media = await downloadMedia({ url: mediaUrl });
                msg = await client.sendMessage(to, media);
            } catch (error) {
                console.error('Error sending media message:', error);
                throw new Error('Failed to send media message');
            }
        } else {
            // Отправка текстового сообщения
            msg = await client.sendMessage(to, message);
        }

        // Создаем объект сообщения
        const chatMessage: ChatMessage = {
            id: msg.id.id,
            body: message,
            from: msg.from,
            to: msg.to,
            timestamp: new Date().toISOString(),
            fromMe: true,
            hasMedia: !!mediaUrl,
            mediaUrl: mediaUrl || '',
            mediaType: '',
            fileName: '',
            fileSize: 0,
            isVoiceMessage: false,
            duration: 0
        };

        return chatMessage;
    } catch (error: any) {
        console.error('Error sending message:', error);
        return null;
    }
};
