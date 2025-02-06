import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CategoryCardType } from '../../types';
import { showSuccessNotification, showErrorNotification } from '../../utils/notifications';
import { TransactionHistoryHeader } from './history/TransactionHistoryHeader';
import { TransactionHistoryList } from './history/TransactionHistoryList';
import { useSwipeable } from 'react-swipeable';
import { useIsAdmin } from '../../hooks/useIsAdmin';

interface Transaction {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: any;
  type: 'income' | 'expense';
  categoryId: string;
  isSalary?: boolean;
  isCashless?: boolean;
  files?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    path: string;
  }>;
}

interface TransactionHistoryProps {
  category: CategoryCardType;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  category,
  isOpen,
  onClose
}) => {
  const { isAdmin } = useIsAdmin();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [swipedTransactionId, setSwipedTransactionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'salary' | 'cashless'>('all');
  const [totalAmount, setTotalAmount] = useState(0);
  const [salaryTotal, setSalaryTotal] = useState(0);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'transactions'),
      where('categoryId', '==', category.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      // Calculate totals
      const total = transactionsData.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const salarySum = transactionsData.reduce((sum, t) => 
        t.isSalary ? sum + Math.abs(t.amount) : sum, 0
      );

      setTransactions(transactionsData);
      setTotalAmount(total);
      setSalaryTotal(salarySum);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category.id, isOpen]);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    // Apply filter by type
    if (selectedFilter === 'salary') {
      filtered = filtered.filter(t => t.isSalary);
    } else if (selectedFilter === 'cashless') {
      filtered = filtered.filter(t => t.isCashless);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.fromUser.toLowerCase().includes(query) ||
        t.toUser.toLowerCase().includes(query) ||
        Math.abs(t.amount).toString().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, selectedFilter, searchQuery]);

  const handleDelete = async () => {
    if (!isAdmin) {
      showErrorNotification('У вас нет прав для удаления транзакций');
      return;
    }

    if (!selectedTransaction) {
      setSelectedTransaction(null);
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Delete the transaction
      const transactionRef = doc(db, 'transactions', selectedTransaction.id);
      batch.delete(transactionRef);

      // Найти транзакции, где текущая транзакция указана как relatedTransactionId
      const relatedTransactionsQuery1 = query(
        collection(db, 'transactions'),
        where('relatedTransactionId', '==', selectedTransaction.id)
      );
      
      // Найти транзакции, где текущая транзакция имеет relatedTransactionId
      const relatedTransactionsQuery2 = query(
        collection(db, 'transactions'),
        where('id', '==', selectedTransaction.relatedTransactionId)
      );
      
      // Получаем все связанные транзакции
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(relatedTransactionsQuery1),
        getDocs(relatedTransactionsQuery2)
      ]);

      // Удаляем все найденные связанные транзакции
      [...snapshot1.docs, ...snapshot2.docs].forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      showSuccessNotification('Операция успешно удалена');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showErrorNotification('Ошибка при удалении операции');
    } finally {
      setSelectedTransaction(null);
      setSwipedTransactionId(null);
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    if (!isAdmin) {
      showErrorNotification('У вас нет прав для удаления транзакций');
      return;
    }
    setSelectedTransaction(transaction);
    setShowPasswordPrompt(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl mx-auto h-full md:h-auto md:rounded-lg md:my-8 md:mx-4 md:max-h-[90vh] flex flex-col">
        <TransactionHistoryHeader
          title={category.title}
          totalAmount={totalAmount}
          salaryTotal={salaryTotal}
          onClose={onClose}
          onSearch={setSearchQuery}
          onFilterChange={setSelectedFilter}
          selectedFilter={selectedFilter}
        />

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <TransactionHistoryList
              transactions={filteredTransactions}
              swipedTransactionId={swipedTransactionId}
              setSwipedTransactionId={setSwipedTransactionId}
              onDeleteClick={handleDeleteClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};