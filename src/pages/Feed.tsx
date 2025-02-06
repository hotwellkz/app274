import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, ArrowDownRight, FileText, Search, X } from 'lucide-react';
import { formatTime } from '../utils/dateUtils';
import { WaybillModal } from '../components/waybills/WaybillModal';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Transaction {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  type: 'income' | 'expense';
  categoryId: string;
  waybillId?: string;
  waybillType?: 'income' | 'expense';
  waybillNumber?: string;
}

interface WaybillData {
  documentNumber: string;
  date: any;
  supplier: string;
  note: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
  }>;
}

export const Feed: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillData | null>(null);
  const [showWaybill, setShowWaybill] = useState(false);
  const [waybillType, setWaybillType] = useState<'income' | 'expense'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    // Ждем завершения проверки авторизации
    if (authLoading) {
      return;
    }

    // Если пользователь не авторизован, перенаправляем на логин
    if (!user) {
      navigate('/login');
      return;
    }

    // Если пользователь не админ, перенаправляем на главную
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'transactions'),
          orderBy('date', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, 
          (querySnapshot) => {
            try {
              const transactionsMap = new Map<string, Transaction>();
              
              querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                const transaction: Transaction = {
                  id: doc.id,
                  fromUser: data.fromUser,
                  toUser: data.toUser,
                  amount: data.amount,
                  description: data.description,
                  date: data.date,
                  type: data.type,
                  categoryId: data.categoryId,
                  waybillId: data.waybillId,
                  waybillType: data.waybillType,
                  waybillNumber: data.waybillNumber
                };
                
                const key = `${data.fromUser}-${data.toUser}-${data.amount}-${data.date.seconds}-${data.description}`;
                
                if (data.type === 'expense' || !transactionsMap.has(key)) {
                  transactionsMap.set(key, transaction);
                }
              });

              const sortedTransactions = Array.from(transactionsMap.values())
                .sort((a, b) => b.date.seconds - a.date.seconds)
                .filter(t => t.type === 'expense');
              
              setTransactions(sortedTransactions);
              setLoading(false);
            } catch (error) {
              console.error('Error processing transactions:', error);
              setLoading(false);
            }
          },
          (error) => {
            console.error('Error fetching transactions:', error);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error in fetchData:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin, authLoading, navigate]);

  // Показываем загрузку, пока проверяется авторизация
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'СЕГОДНЯ';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'ВЧЕРА';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
      }).toUpperCase();
    }
  };

  const groupTransactionsByDate = () => {
    const grouped: { [key: string]: { transactions: Transaction[], total: number } } = {};
    transactions.forEach(transaction => {
      const dateKey = formatDate(transaction.date);
      if (!grouped[dateKey]) {
        grouped[dateKey] = { transactions: [], total: 0 };
      }
      grouped[dateKey].transactions.push(transaction);
      grouped[dateKey].total += Math.abs(transaction.amount);
    });
    return grouped;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.fromUser.toLowerCase().includes(searchLower) ||
      transaction.toUser.toLowerCase().includes(searchLower) ||
      transaction.description.toLowerCase().includes(searchLower) ||
      (transaction.waybillNumber && transaction.waybillNumber.toLowerCase().includes(searchLower)) ||
      Math.abs(transaction.amount).toString().includes(searchQuery)
    );
  });

  const handleWaybillClick = async (transaction: Transaction) => {
    if (!transaction.waybillId) return;

    try {
      const collectionName = transaction.waybillType === 'income' ? 'incomeWaybills' : 'expenseWaybills';
      const waybillDoc = await getDoc(doc(db, collectionName, transaction.waybillId));
      
      if (waybillDoc.exists()) {
        const waybillData = waybillDoc.data();
        setSelectedWaybill({
          documentNumber: waybillData.documentNumber || transaction.waybillNumber || '',
          date: waybillData.date,
          supplier: waybillData.supplier || '',
          note: waybillData.note || '',
          items: waybillData.items || []
        });
        setWaybillType(transaction.waybillType || 'expense');
        setShowWaybill(true);
      }
    } catch (error) {
      console.error('Error fetching waybill:', error);
    }
  };

  const groupedTransactions = groupTransactionsByDate();

  return (
    <div className="max-w-3xl mx-auto bg-gray-100 min-h-screen">
      <div className="sticky top-0 z-20">
        <div className={`bg-white border-b transition-all duration-200 ${showSearch ? 'max-h-14' : 'max-h-0 overflow-hidden'}`}>
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по операциям..."
                className="w-full pl-9 pr-4 py-2 text-sm border-0 focus:ring-0 bg-gray-50 rounded-lg"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearch(false);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => window.history.back()} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Лента</h1>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Search className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {Object.entries(groupTransactionsByDate()).map(([date, { transactions: dayTransactions, total }]) => {
          const filteredDayTransactions = dayTransactions.filter(transaction => {
            const searchLower = searchQuery.toLowerCase();
            return (
              transaction.fromUser.toLowerCase().includes(searchLower) ||
              transaction.toUser.toLowerCase().includes(searchLower) ||
              transaction.description.toLowerCase().includes(searchLower) ||
              (transaction.waybillNumber && transaction.waybillNumber.toLowerCase().includes(searchLower)) ||
              Math.abs(transaction.amount).toString().includes(searchQuery)
            );
          });

          if (filteredDayTransactions.length === 0) return null;

          const filteredTotal = filteredDayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

          return (
            <div key={date}>
              <div className="bg-gray-50 px-4 py-2">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-medium text-gray-500">{date}</h2>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(filteredTotal).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸
                  </span>
                </div>
              </div>
              <div className="bg-white">
                {filteredDayTransactions.map((transaction) => (
                  <div key={transaction.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          <ArrowDownRight className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{transaction.fromUser}</span>
                          <span className="text-sm text-gray-500 mt-1">{transaction.toUser}</span>
                          {transaction.waybillNumber && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleWaybillClick(transaction);
                              }}
                              className="flex items-center text-xs text-blue-600 hover:text-blue-700 mt-1 group"
                            >
                              <FileText className="w-3 h-3 mr-1 group-hover:scale-110 transition-transform" />
                              Накладная №{transaction.waybillNumber}
                            </button>
                          )}
                          <span className="text-xs text-gray-400 mt-1">
                            {formatTime(transaction.date)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-base text-red-600">
                          -{Math.round(Math.abs(transaction.amount)).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸
                        </span>
                        <span className="text-sm text-gray-500 mt-1 text-right">
                          {transaction.description}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t">
                <div className="flex justify-end">
                  <span className="text-sm font-medium text-gray-500">
                    Итого за день: {Math.round(filteredTotal).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredTransactions.length === 0 && (
        <div className="text-center py-12 px-4">
          {searchQuery ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Ничего не найдено</h3>
              <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ArrowDownRight className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">История операций пуста</h3>
              <p className="text-gray-500">Здесь будут отображаться все операции</p>
            </>
          )}
        </div>
      )}

      {showWaybill && selectedWaybill && createPortal(
        <WaybillModal
          isOpen={showWaybill}
          onClose={() => {
            setShowWaybill(false);
            setSelectedWaybill(null);
          }}
          data={selectedWaybill}
          type={waybillType}
        />,
        document.body
      )}
    </div>
  );
};