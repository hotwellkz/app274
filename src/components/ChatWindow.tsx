import React, { useState, useRef, useEffect } from 'react';
import { WhatsAppMessage } from '../types/WhatsAppTypes';
import { MdSend, MdAttachFile, MdArrowBack, MdMic, MdStop } from 'react-icons/md';

interface ChatWindowProps {
    chat: {
        phoneNumber: string;
        name: string;
        messages: WhatsAppMessage[];
    };
    onSendMessage: (message: string, file?: File) => Promise<void>;
    isMobile: boolean;
    onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onSendMessage, isMobile, onBack }) => {
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], `voice_message_${Date.now()}.webm`, {
                    type: 'audio/webm'
                });
                await onSendMessage('', file);
                setRecordingTime(0);
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Запускаем таймер
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Не удалось получить доступ к микрофону');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);

            // Останавливаем таймер
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const handleSend = async () => {
        if (message.trim() || selectedFile) {
            await onSendMessage(message, selectedFile || undefined);
            setMessage('');
            setSelectedFile(null);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const renderMedia = (message: WhatsAppMessage) => {
        if (!message.hasMedia || !message.mediaUrl) return null;

        const mediaType = message.mediaType?.toLowerCase() || '';
        console.log('Media type:', mediaType, 'URL:', message.mediaUrl);

        if (mediaType.startsWith('image/') || mediaType === 'image') {
            return (
                <img
                    src={message.mediaUrl}
                    alt="Изображение"
                    className="max-w-[200px] max-h-[200px] rounded-lg cursor-pointer"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                />
            );
        } else if (mediaType.startsWith('video/') || mediaType === 'video') {
            return (
                <video
                    src={message.mediaUrl}
                    controls
                    className="max-w-[200px] max-h-[200px] rounded-lg"
                />
            );
        } else if (mediaType.startsWith('audio/') || message.isVoiceMessage) {
            return (
                <div className="flex items-center gap-2">
                    <audio src={message.mediaUrl} controls className="max-w-[200px]" />
                    {message.duration && (
                        <span className="text-sm text-gray-500">
                            {formatDuration(message.duration)}
                        </span>
                    )}
                </div>
            );
        } else {
            return (
                <a
                    href={message.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:text-blue-700"
                >
                    <MdAttachFile />
                    <span>{message.fileName || 'Скачать файл'}</span>
                    {message.fileSize && (
                        <span className="text-sm text-gray-500">
                            ({(message.fileSize / 1024 / 1024).toFixed(2)} MB)
                        </span>
                    )}
                </a>
            );
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat.messages]);

    // Очищаем таймер при размонтировании компонента
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Заголовок чата */}
            <div className="bg-[#f0f2f5] p-4 flex items-center gap-4">
                {isMobile && (
                    <button onClick={onBack} className="text-gray-600">
                        <MdArrowBack size={24} />
                    </button>
                )}
                <div>
                    <h2 className="font-semibold">{chat.name}</h2>
                    <p className="text-sm text-gray-500">{chat.phoneNumber}</p>
                </div>
            </div>

            {/* Область сообщений */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                                msg.fromMe ? 'bg-[#d9fdd3]' : 'bg-white'
                            }`}
                        >
                            {renderMedia(msg)}
                            {msg.body && <p className="break-words">{msg.body}</p>}
                            <span className="text-xs text-gray-500 mt-1 block">
                                {formatTime(msg.timestamp)}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Панель ввода */}
            <div className="bg-[#f0f2f5] p-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <MdAttachFile size={24} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Введите сообщение"
                        className="flex-1 rounded-lg px-4 py-2 focus:outline-none"
                        disabled={isRecording}
                    />
                    {!isRecording ? (
                        <>
                            {message.trim() || selectedFile ? (
                                <button
                                    onClick={handleSend}
                                    className="text-[#00a884] hover:text-[#017561]"
                                >
                                    <MdSend size={24} />
                                </button>
                            ) : (
                                <button
                                    onClick={startRecording}
                                    className="text-[#00a884] hover:text-[#017561]"
                                >
                                    <MdMic size={24} />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 animate-pulse">
                                {formatDuration(recordingTime)}
                            </span>
                            <button
                                onClick={stopRecording}
                                className="text-red-500 hover:text-red-700"
                            >
                                <MdStop size={24} />
                            </button>
                        </div>
                    )}
                </div>
                {selectedFile && (
                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        <MdAttachFile />
                        <span>{selectedFile.name}</span>
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="text-red-500 hover:text-red-700"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
