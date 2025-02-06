import React from 'react';
import { ScrollText, Warehouse, ArrowLeftRight, MessageSquare, Users } from 'lucide-react';
import { useIsAdmin } from '../hooks/useIsAdmin';

interface StickyNavigationProps {
  onNavigate: (page: string) => void;
}

export const StickyNavigation: React.FC<StickyNavigationProps> = ({ onNavigate }) => {
  const { isAdmin } = useIsAdmin();

  return (
    <div className="fixed bottom-32 right-4 flex flex-col gap-3 z-50">
      {isAdmin && (
        <button
          onClick={() => onNavigate('feed')}
          className="p-3 text-gray-700 hover:text-gray-900 rounded-full transition-colors duration-200 shadow-lg"
          title="Лента"
        >
          <ScrollText className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={() => onNavigate('clients')}
        className="p-3 text-gray-700 hover:text-gray-900 rounded-full transition-colors duration-200 shadow-lg"
        title="Клиенты"
      >
        <Users className="w-5 h-5" />
      </button>
      <button
        onClick={() => onNavigate('warehouse')}
        className="p-3 text-gray-700 hover:text-gray-900 rounded-full transition-colors duration-200 shadow-lg"
        title="Склад"
      >
        <Warehouse className="w-5 h-5" />
      </button>
      <button
        onClick={() => onNavigate('transactions')}
        className="p-3 text-gray-700 hover:text-gray-900 rounded-full transition-colors duration-200 shadow-lg"
        title="Транзакции"
      >
        <ArrowLeftRight className="w-5 h-5" />
      </button>
      <button
        onClick={() => onNavigate('whatsapp')}
        className="p-3 text-gray-700 hover:text-gray-900 rounded-full transition-colors duration-200 shadow-lg"
        title="WhatsApp"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    </div>
  );
};
