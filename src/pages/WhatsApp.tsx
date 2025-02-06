import React from 'react';
import { ChatProvider } from '../context/ChatContext';
import WhatsAppContent from '../components/WhatsAppContent';

const WhatsApp: React.FC = () => {
    return (
        <ChatProvider>
            <div className="fixed inset-0 flex flex-col bg-[#eae6df] dark:bg-gray-900 md:pl-[250px]">
                <div className="flex-1 flex h-full overflow-hidden">
                    <WhatsAppContent />
                </div>
            </div>
        </ChatProvider>
    );
};

export default WhatsApp;