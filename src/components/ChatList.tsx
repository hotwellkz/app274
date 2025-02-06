import React from 'react';
import { MdSearch, MdArrowBack } from 'react-icons/md';
import { Chat, WhatsAppMessage } from '../types/WhatsAppTypes';

interface ChatListProps {
    chats: { [key: string]: Chat };
    activeChat: string | null;
    setActiveChat: (chatId: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onNewChat: () => void;
    isMobile: boolean;
}

const ChatList: React.FC<ChatListProps> = ({
    chats,
    activeChat,
    setActiveChat,
    searchQuery,
    setSearchQuery,
    onNewChat,
    isMobile
}) => {
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatLastMessage = (message: WhatsAppMessage) => {
        if (message.fromMe) {
            return `Вы: ${message.body}`;
        }
        return message.body;
    };

    const filteredChats = Object.entries(chats)
        .filter(([_, chat]) => {
            const query = searchQuery || '';
            const name = chat.name || '';
            return name.toLowerCase().includes(query.toLowerCase()) ||
                chat.phoneNumber.includes(query);
        })
        .map(([id, chat]) => ({
            id,
            ...chat
        }));

    return (
        <div className={`flex flex-col h-full ${isMobile && activeChat ? 'hidden' : 'flex'} bg-white md:w-[400px] w-full`}>
            {/* Верхняя панель */}
            <div className="bg-[#f0f2f5] p-2 flex items-center gap-2">
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Поиск или новый чат"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2 px-4 pl-10 rounded-lg bg-white"
                        />
                        <MdSearch className="absolute left-3 top-3 text-gray-500" />
                    </div>
                </div>
                <button
                    onClick={onNewChat}
                    className="p-2 hover:bg-gray-200 rounded-full"
                >
                    +
                </button>
            </div>

            {/* Список чатов */}
            <div className="flex-1 overflow-y-auto">
                {filteredChats.map((chat) => (
                    <div
                        key={`${chat.id}-${chat.phoneNumber}`}
                        onClick={() => setActiveChat(chat.phoneNumber)}
                        className={`flex items-center p-3 cursor-pointer hover:bg-[#f0f2f5] border-b ${
                            activeChat === chat.phoneNumber ? 'bg-[#f0f2f5]' : ''
                        }`}
                    >
                        {/* Аватар с индикатором непрочитанных сообщений */}
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white">
                                {(chat.name || '?')[0]?.toUpperCase() || '?'}
                            </div>
                            {chat.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 bg-[#25D366] text-white rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-xs font-medium px-1">
                                    {chat.unreadCount}
                                </div>
                            )}
                        </div>
                        
                        {/* Информация о чате */}
                        <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{chat.name}</span>
                                {chat.lastMessage && (
                                    <span className="text-xs text-gray-500">
                                        {formatTime(chat.lastMessage.timestamp)}
                                    </span>
                                )}
                            </div>
                            {chat.lastMessage && (
                                <p className="text-sm text-gray-500 truncate">
                                    {formatLastMessage(chat.lastMessage)}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;
