import React from 'react';
import { ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import { formatTime } from '../../../utils/dateUtils';
import { formatAmount } from '../../../utils/formatUtils';

interface TransactionHistoryItemProps {
  transaction: {
    id: string;
    type: 'income' | 'expense';
    fromUser: string;
    toUser: string;
    amount: number;
    description: string;
    date: any;
    isSalary?: boolean;
    isCashless?: boolean;
    files?: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
      path: string;
    }>;
  };
  swipedTransactionId: string | null;
  onDelete: () => void;
}

export const TransactionHistoryItem: React.FC<TransactionHistoryItemProps> = ({
  transaction,
  swipedTransactionId,
  onDelete
}) => {
  return (
    <div className={`relative overflow-hidden ${
      transaction.isSalary ? 'bg-emerald-50' :
      transaction.isCashless ? 'bg-purple-50' :
      'bg-white'
    }`}>
      <div
        className={`absolute inset-y-0 right-0 w-16 bg-red-500 flex items-center justify-center transition-opacity duration-200 ${
          swipedTransactionId === transaction.id ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={onDelete}
          className="w-full h-full flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div
        className={`p-4 transition-transform ${
          swipedTransactionId === transaction.id ? '-translate-x-16' : 'translate-x-0'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {transaction.type === 'income' ? (
                <ArrowUpRight className={`w-5 h-5 ${
                  transaction.isSalary ? 'text-emerald-600' :
                  transaction.isCashless ? 'text-purple-600' :
                  'text-emerald-500'
                }`} />
              ) : (
                <ArrowDownRight className={`w-5 h-5 ${
                  transaction.isSalary ? 'text-emerald-600' :
                  transaction.isCashless ? 'text-purple-600' :
                  'text-red-500'
                }`} />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{transaction.fromUser}</div>
              <div className="text-sm text-gray-500">{transaction.toUser}</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(transaction.date)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className={`font-medium ${
              transaction.isSalary ? 'text-emerald-600' :
              transaction.isCashless ? 'text-purple-600' :
              transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
            </div>
            <div className="text-sm text-gray-500 mt-1 text-right">
              {transaction.description}
            </div>
            <div className="flex gap-1 mt-1">
              {transaction.isSalary && (
                <div className="text-xs text-emerald-600 font-medium px-1.5 py-0.5 bg-emerald-50 rounded">
                  ЗП
                </div>
              )}
              {transaction.isCashless && (
                <div className="text-xs text-purple-600 font-medium px-1.5 py-0.5 bg-purple-50 rounded">
                  Безнал
                </div>
              )}
              {transaction.files && transaction.files.length > 0 && (
                <div className="text-xs text-blue-600 font-medium px-1.5 py-0.5 bg-blue-50 rounded flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {transaction.files.length}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};