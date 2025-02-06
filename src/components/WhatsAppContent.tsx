import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import WhatsAppConnect from './WhatsAppConnect';
import { MdArrowBack, MdQrCode2 } from 'react-icons/md';

const WhatsAppContent: React.FC = () => {
    const { qrCode } = useChat();
    const [showQR, setShowQR] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Определяем, является ли устройство мобильным
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    return (
        <div className="flex flex-col h-full w-full">
            {/* Верхняя панель */}
            <div className="bg-[#00a884] text-white px-4 py-2 flex items-center justify-between shadow-sm">
                {/* Левая часть */}
                <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold">Подключено к серверу</span>
                </div>

                {/* Правая часть */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setShowQR(true)}
                        className="flex items-center space-x-2 hover:bg-[#017561] px-3 py-1 rounded transition-colors"
                    >
                        <MdQrCode2 className="w-5 h-5" />
                        <span className="text-sm hidden md:inline">Сканировать QR-код</span>
                    </button>
                </div>
            </div>

            {/* Модальное окно с QR-кодом */}
            {showQR && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Сканируйте QR-код</h2>
                            <button
                                onClick={() => setShowQR(false)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="flex justify-center">
                            {qrCode ? (
                                <img 
                                    src={qrCode}
                                    alt="WhatsApp QR Code"
                                    className="mx-auto"
                                    width={256}
                                    height={256}
                                />
                            ) : (
                                <div className="flex items-center justify-center w-64 h-64 bg-gray-100 rounded-lg">
                                    <span className="text-gray-500">QR-код загружается...</span>
                                </div>
                            )}
                        </div>
                        <p className="mt-4 text-center text-gray-600">
                            Откройте WhatsApp на вашем телефоне и отсканируйте QR-код
                        </p>
                    </div>
                </div>
            )}

            {/* Основной контент */}
            <div className="flex-1 overflow-hidden">
                <WhatsAppConnect serverUrl={import.meta.env.VITE_API_URL} isMobile={isMobile} />
            </div>
        </div>
    );
};

export default WhatsAppContent;
