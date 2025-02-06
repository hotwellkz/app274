import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WhatsAppMessage } from '../types/WhatsAppTypes';
import { useChat } from '../context/ChatContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { MdArrowBack } from 'react-icons/md';
import axios from 'axios'; // Add axios import

const BACKEND_URL = 'http://localhost:3000';

interface WhatsAppConnectProps {
    serverUrl: string;
    isMobile: boolean;
}

interface Chat {
    phoneNumber: string;
    name: string;
    lastMessage?: WhatsAppMessage;
    messages: WhatsAppMessage[];
    unreadCount: number;
}

const WhatsAppConnect: React.FC<WhatsAppConnectProps> = ({ serverUrl, isMobile }) => {
    const { setQrCode, chats: contextChats, loadChats } = useChat();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isQrScanned, setIsQrScanned] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Подключение...');
    const [message, setMessage] = useState<string>('');
    const [chats, setChats] = useState<{ [key: string]: Chat }>({});
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showNewChatDialog, setShowNewChatDialog] = useState(false);
    const [newChatPhone, setNewChatPhone] = useState('');
    const [newChatName, setNewChatName] = useState('');

    // Функция для форматирования номера телефона
    const formatPhoneNumber = (phoneNumber: string) => {
        const cleaned = phoneNumber.replace(/\D/g, '');
        return cleaned.endsWith('@c.us') ? cleaned : `${cleaned}@c.us`;
    };

    // Функция создания нового контакта
    const handleCreateNewChat = () => {
        if (!newChatPhone) {
            alert('Пожалуйста, введите номер телефона');
            return;
        }

        const formattedPhone = formatPhoneNumber(newChatPhone);
        
        const newChat: Chat = {
            phoneNumber: formattedPhone,
            name: newChatName || formattedPhone.replace('@c.us', ''),
            messages: [],
            unreadCount: 0
        };

        setChats(prevChats => ({
            ...prevChats,
            [formattedPhone]: newChat
        }));

        setActiveChat(formattedPhone);
        setNewChatPhone('');
        setNewChatName('');
        setShowNewChatDialog(false);
        setSearchQuery('');
    };

    // Функция для добавления сообщения в чат
    const addMessageToChat = (message: WhatsAppMessage) => {
        const phoneNumber = message.fromMe ? message.to! : message.from;
        
        setChats(prevChats => {
            const updatedChats = { ...prevChats };
            if (!updatedChats[phoneNumber]) {
                updatedChats[phoneNumber] = {
                    phoneNumber,
                    name: message.sender || formatPhoneNumber(phoneNumber).replace('@c.us', ''),
                    messages: [],
                    unreadCount: 0
                };
            }

            const messageExists = updatedChats[phoneNumber].messages.some(
                existingMsg => 
                    existingMsg.body === message.body && 
                    existingMsg.fromMe === message.fromMe &&
                    Math.abs(new Date(existingMsg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
            );

            if (!messageExists) {
                updatedChats[phoneNumber].messages = [...updatedChats[phoneNumber].messages, message];
                updatedChats[phoneNumber].lastMessage = message;
                if (!message.fromMe && phoneNumber !== activeChat) {
                    updatedChats[phoneNumber].unreadCount += 1;
                }
            }

            return updatedChats;
        });
    };

    // Функция для сброса счетчика непрочитанных сообщений
    const resetUnreadCount = (phoneNumber: string) => {
        setChats(prevChats => ({
            ...prevChats,
            [phoneNumber]: {
                ...prevChats[phoneNumber],
                unreadCount: 0
            }
        }));
    };

    // Загрузка существующих чатов при монтировании компонента
    useEffect(() => {
        if (!contextChats) return;
        
        const formattedChats: { [key: string]: Chat } = {};
        Object.entries(contextChats).forEach(([phoneNumber, chat]) => {
            formattedChats[phoneNumber] = {
                phoneNumber,
                name: chat.name,
                messages: chat.messages,
                lastMessage: chat.lastMessage,
                unreadCount: 0
            };
        });
        setChats(formattedChats);
    }, [contextChats]);

    useEffect(() => {
        const newSocket = io(serverUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('Connected to server, socket id:', newSocket.id);
            setStatus('Подключено к серверу');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setStatus('Ошибка подключения к серверу');
        });

        newSocket.on('qr', (qrData: string) => {
            console.log('Получен QR-код, длина:', qrData.length);
            try {
                const parsedData = JSON.parse(qrData);
                console.log('QR данные в формате JSON:', parsedData);
                
                if (typeof parsedData === 'object') {
                    const qrString = parsedData.code || parsedData.qr || parsedData.data || qrData;
                    console.log('Извлеченная строка QR:', qrString);
                    setQrCode(qrString);
                } else {
                    setQrCode(qrData);
                }
            } catch (e) {
                console.log('QR данные в обычном формате:', qrData);
                setQrCode(qrData);
            }
            
            setIsQrScanned(false);
            setStatus('Ожидание сканирования QR-кода');
        });

        newSocket.on('ready', () => {
            console.log('WhatsApp готов');
            setStatus('WhatsApp подключен');
            setIsQrScanned(true);
            setQrCode('');
        });

        newSocket.on('whatsapp-message', (message: WhatsAppMessage) => {
            console.log('Получено новое сообщение:', message);
            addMessageToChat(message);
        });

        newSocket.on('chat-updated', (updatedChat: Chat) => {
            console.log('Получено обновление чата:', updatedChat);
            if (updatedChat && updatedChat.phoneNumber) {
                setChats(prevChats => ({
                    ...prevChats,
                    [updatedChat.phoneNumber]: {
                        ...updatedChat,
                        messages: Array.isArray(updatedChat.messages) ? updatedChat.messages : [],
                        unreadCount: !updatedChat.fromMe && updatedChat.phoneNumber !== activeChat 
                            ? (prevChats[updatedChat.phoneNumber]?.unreadCount || 0) + 1 
                            : prevChats[updatedChat.phoneNumber]?.unreadCount || 0
                    }
                }));
            }
        });

        newSocket.on('disconnected', () => {
            console.log('WhatsApp отключен');
            setStatus('WhatsApp отключен');
            setIsQrScanned(false);
            setQrCode('');
        });

        newSocket.on('auth_failure', (error: string) => {
            console.error('Ошибка аутентификации:', error);
            setStatus(`Ошибка: ${error}`);
        });

        setSocket(newSocket);

        fetch(`${BACKEND_URL}/chats`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(chatsData => {
                console.log('Received chats from server:', chatsData);
                if (chatsData && typeof chatsData === 'object') {
                    const formattedChats: { [key: string]: Chat } = {};
                    Object.entries(chatsData).forEach(([phoneNumber, chat]: [string, any]) => {
                        if (chat && chat.phoneNumber) {
                            formattedChats[phoneNumber] = {
                                phoneNumber: chat.phoneNumber,
                                name: chat.name || chat.phoneNumber.replace('@c.us', ''),
                                messages: Array.isArray(chat.messages) ? chat.messages.map((msg: any) => ({
                                    ...msg,
                                    isVoiceMessage: msg.isVoiceMessage || false,
                                    duration: msg.duration || 0
                                })) : [],
                                lastMessage: chat.lastMessage ? {
                                    ...chat.lastMessage,
                                    isVoiceMessage: chat.lastMessage.isVoiceMessage || false,
                                    duration: chat.lastMessage.duration || 0
                                } : undefined,
                                unreadCount: typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
                            };
                        }
                    });
                    console.log('Formatted chats:', formattedChats);
                    setChats(formattedChats);
                } else {
                    console.warn('Received invalid chats data:', chatsData);
                    setChats({});
                }
            })
            .catch(error => {
                console.error('Error loading chats:', error);
                setChats({});
            });

        return () => {
            newSocket.close();
        };
    }, [serverUrl, setQrCode]);

    // Функция для отправки сообщения
    const handleSendMessage = async (phoneNumber: string, message: string, file?: File) => {
        if (!socket) return;

        try {
            let mediaUrl = '';
            let mediaType = '';
            let fileName = '';
            let fileSize = 0;

            if (file) {
                // Создаем FormData для загрузки файла
                const formData = new FormData();
                formData.append('file', file);

                // Загружаем файл на сервер
                const response = await axios.post(`${BACKEND_URL}/upload-media`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    withCredentials: true
                });

                if (response.data.url) {
                    mediaUrl = response.data.url;
                    mediaType = file.type || 'application/octet-stream';
                    fileName = file.name;
                    fileSize = file.size;
                }
            }

            // Отправляем сообщение через сокет
            socket.emit('send_message', {
                phoneNumber,
                message,
                mediaUrl,
                mediaType,
                fileName,
                fileSize
            });

            // Добавляем сообщение в локальный стейт
            const newMessage: WhatsAppMessage = {
                id: Date.now().toString(),
                body: message,
                from: 'me',
                to: phoneNumber,
                timestamp: new Date().toISOString(),
                fromMe: true,
                hasMedia: !!mediaUrl,
                mediaUrl,
                mediaType,
                fileName,
                fileSize
            };

            addMessageToChat(newMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    };

    const handleNewChat = () => {
        setShowNewChatDialog(true);
    };

    return (
        <div className="flex h-full">
            {/* Модальное окно создания нового чата */}
            {showNewChatDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg w-96 mx-4">
                        <h2 className="text-lg font-semibold mb-4">Новый чат</h2>
                        <input
                            type="text"
                            placeholder="Номер телефона"
                            value={newChatPhone}
                            onChange={(e) => setNewChatPhone(e.target.value)}
                            className="w-full p-2 mb-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Имя (необязательно)"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            className="w-full p-2 mb-4 border rounded"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowNewChatDialog(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleCreateNewChat}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Список чатов (скрывается на мобильных при открытом чате) */}
            <div className={`${isMobile && activeChat ? 'hidden' : 'flex-1 md:flex-none md:w-[400px]'}`}>
                <ChatList
                    chats={chats}
                    activeChat={activeChat}
                    setActiveChat={(chatId) => {
                        setActiveChat(chatId);
                        resetUnreadCount(chatId);
                    }}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onNewChat={handleNewChat}
                    isMobile={isMobile}
                />
            </div>
            
            {/* Окно чата (на мобильных занимает весь экран) */}
            <div className={`${isMobile && !activeChat ? 'hidden' : 'flex-1'}`}>
                {activeChat && chats[activeChat] ? (
                    <div className="flex flex-col h-full">
                        {/* Шапка чата с кнопкой "Назад" для мобильной версии */}
                        {isMobile ? (
                            <div className="sticky top-0 z-10 bg-[#f0f2f5] flex items-center p-2 border-b border-gray-200">
                                <button
                                    onClick={() => setActiveChat(null)}
                                    className="p-2 hover:bg-gray-200 rounded-full mr-2 transition-colors"
                                >
                                    <MdArrowBack size={24} />
                                </button>
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-xl text-white">
                                            {chats[activeChat].name && chats[activeChat].name.length > 0 
                                                ? chats[activeChat].name[0].toUpperCase() 
                                                : '#'}
                                        </span>
                                    </div>
                                    <div className="ml-3">
                                        <div className="font-semibold">{chats[activeChat].name || 'Без имени'}</div>
                                        <div className="text-sm text-gray-500">онлайн</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#f0f2f5] p-2 flex items-center border-b border-gray-200">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-xl text-white">
                                            {chats[activeChat].name && chats[activeChat].name.length > 0 
                                                ? chats[activeChat].name[0].toUpperCase() 
                                                : '#'}
                                        </span>
                                    </div>
                                    <div className="ml-3">
                                        <div className="font-semibold">{chats[activeChat].name || 'Без имени'}</div>
                                        <div className="text-sm text-gray-500">онлайн</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <ChatWindow
                            chat={activeChat ? chats[activeChat] : null}
                            message={message}
                            setMessage={setMessage}
                            onSendMessage={(text, file) => handleSendMessage(activeChat!, text, file)}
                            status={status}
                            isMobile={isMobile}
                        />
                    </div>
                ) : (
                    <div className="bg-[#f0f2f5] p-2 flex items-center justify-center border-b border-gray-200">
                        <div className="text-gray-500">Выберите чат для начала общения</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppConnect;
