import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WhatsAppMessage } from '../types/WhatsAppTypes';

interface WhatsAppChatProps {
    serverUrl: string;
}

const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ serverUrl }) => {
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const newSocket = io(serverUrl, {
            withCredentials: true
        });

        newSocket.on('connect', () => {
            setConnected(true);
            console.log('Connected to WebSocket server');
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
            console.log('Disconnected from WebSocket server');
        });

        newSocket.on('whatsapp-message', (message: WhatsAppMessage) => {
            console.log('Received message:', message);
            setMessages(prev => [...prev, message]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [serverUrl]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-100">
            {/* Статус подключения */}
            <div className="bg-white p-4 shadow-sm">
                <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                        connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-600">
                        {connected ? 'Подключено' : 'Отключено'}
                    </span>
                </div>
            </div>

            {/* Область сообщений */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-4">
                        Нет сообщений
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                    message.fromMe
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-800'
                                }`}
                            >
                                {message.isGroup && !message.fromMe && (
                                    <div className="text-sm font-semibold mb-1">
                                        {message.sender || message.from}
                                    </div>
                                )}
                                <div className="break-words">{message.body}</div>
                                <div className={`text-xs mt-1 ${
                                    message.fromMe ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                    {formatTime(message.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default WhatsAppChat;
