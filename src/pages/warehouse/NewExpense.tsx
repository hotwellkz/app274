import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Barcode, Paperclip, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { getNextDocumentNumber } from '../../utils/documentUtils';
import { db } from '../../lib/firebase';
import { sendTelegramNotification, formatTransactionMessage } from '../../services/telegramService';
import { Product } from '../../types/product';
import { ProjectSelector } from '../../components/warehouse/ProjectSelector';
import { showErrorNotification, showSuccessNotification } from '../../utils/notifications';
import { ExpenseWaybill } from '../../components/warehouse/ExpenseWaybill';
import { Scrollbars } from 'react-custom-scrollbars-2';

const EXPENSE_PROJECT_KEY = 'expense_selected_project';
interface ExpenseItem {
  product: Product;
  quantity: number;
}

const EXPENSE_ITEMS_KEY = 'expense_items';

export const NewExpense: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedProject, setSelectedProject] = useState(() => {
    // Проверяем state на наличие projectTitle
    const state = location.state as { selectedProject?: string; projectTitle?: string };
    if (state?.selectedProject && state?.projectTitle === 'Общ Расх') {
      return state.selectedProject;
    }
    return localStorage.getItem(EXPENSE_PROJECT_KEY) || '';
  });

  // Получаем следующий номер документа при загрузке компонента
  useEffect(() => {
    const loadDocumentNumber = async () => {
      try {
        const nextNumber = await getNextDocumentNumber('expense');
        setDocumentNumber(nextNumber);
      } catch (error) {
        showErrorNotification('Ошибка при генерации номера документа');
      }
    };
    
    loadDocumentNumber();
  }, []);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    const savedItems = localStorage.getItem(EXPENSE_ITEMS_KEY);
    return savedItems ? JSON.parse(savedItems) : [];
  });
  const [showWaybill, setShowWaybill] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');

  // Сохраняем items в localStorage при изменении
  useEffect(() => {
    localStorage.setItem(EXPENSE_ITEMS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    // Проверяем наличие предварительно выбранного проекта
    const state = location.state as { selectedProject?: string };
    const projectState = location.state as { selectedProject?: string; projectTitle?: string };
    if (projectState?.selectedProject && projectState?.projectTitle) {
      setProjectTitle(projectState.projectTitle);
      setSelectedProject(projectState.selectedProject);
      localStorage.setItem(EXPENSE_PROJECT_KEY, projectState.selectedProject);
    } else if (state?.selectedProject) {
      setSelectedProject(state.selectedProject);
      localStorage.setItem(EXPENSE_PROJECT_KEY, state.selectedProject);
    }
  }, [location.state]);

  // Сохраняем выбранный проект при его изменении
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    localStorage.setItem(EXPENSE_PROJECT_KEY, projectId);
  };

  useEffect(() => {
    const state = location.state as { addedProduct?: { product: Product; quantity: number } };
    if (state?.addedProduct && state.addedProduct.product && state.addedProduct.quantity) {
      const newItem = {
        product: state.addedProduct.product,
        quantity: state.addedProduct.quantity,
        price: state.addedProduct.product.averageSellingPrice || 0,
      };
      
      setItems(prev => {
        const existingIndex = prev.findIndex(item => item.product.id === newItem.product.id);
        if (existingIndex >= 0) {
          const newItems = [...prev];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItem.quantity
          };
          return newItems;
        }
        return [newItem, ...prev]; // Добавляем новый товар в начало списка
      });
      
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);
  const handleAddProducts = () => {
    navigate('/warehouse/products', { state: 'expense' });
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      showErrorNotification('Выберите проект');
      return;
    }

    if (items.length === 0) {
      showErrorNotification('Добавьте товары');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);

      // Получаем информацию о проекте
      const [projectDoc, warehouseQuery] = await Promise.all([
        getDoc(doc(db, 'categories', selectedProject)),
        getDocs(query(collection(db, 'categories'), where('title', '==', 'Склад'), where('row', '==', 4)))
      ]);

      if (!projectDoc.exists()) {
        showErrorNotification('Проект не найден');
        setLoading(false);
        return;
      }
      
      // Получаем ID категории склада
      const warehouseCategory = warehouseQuery.docs[0];
      if (!warehouseCategory) {
        showErrorNotification('Категория склада не найдена');
        setLoading(false);
        return;
      }

      const projectData = projectDoc.data();
      const projectRef = doc(db, 'categories', selectedProject);
      const warehouseCategoryRef = doc(db, 'categories', warehouseCategory.id);
      const timestamp = serverTimestamp();
      
      // Устанавливаем заголовок проекта
      const currentProjectTitle = projectData.title || 'Неизвестный проект';
      setProjectTitle(currentProjectTitle);
      
      // Получаем текущие балансы
      const projectAmount = parseFloat(projectData.amount?.replace(/[^\d.-]/g, '') || '0');
      const warehouseAmount = parseFloat(warehouseCategory.data().amount?.replace(/[^\d.-]/g, '') || '0');
      
      // Рассчитываем общую сумму операции
      const totalAmount = items.reduce((sum, item) => 
        sum + (item.quantity * (item.product.averagePurchasePrice || 0)), 0);
      
      // Обновляем балансы
      batch.update(warehouseCategoryRef, {
        amount: `${warehouseAmount - totalAmount} ₸`,
        updatedAt: timestamp
      });
      
      batch.update(projectRef, {
        amount: `${projectAmount + totalAmount} ₸`,
        updatedAt: timestamp
      });

      // Создаем транзакцию расхода для склада
      const warehouseTransactionRef = doc(collection(db, 'transactions'));
      const projectTransactionRef = doc(collection(db, 'transactions'));

      batch.set(warehouseTransactionRef, {
        categoryId: warehouseCategory.id,
        fromUser: 'Склад',
        toUser: currentProjectTitle,
        amount: -totalAmount,
        description: `Расход со склада по накладной №${documentNumber}`,
        waybillNumber: documentNumber,
        waybillData: {
          documentNumber,
          date,
          project: currentProjectTitle,
          note,
          items: items.map(item => ({
            product: {
              name: item.product.name,
              unit: item.product.unit
            } as const,
            quantity: item.quantity,
            price: item.product.averagePurchasePrice || 0
          }))
        },
        type: 'expense',
        date: timestamp,
        isWarehouseOperation: true,
        relatedTransactionId: projectTransactionRef.id
      });

      // Создаем транзакцию прихода для проекта
      batch.set(projectTransactionRef, { 
        categoryId: selectedProject,
        fromUser: 'Склад',
        toUser: currentProjectTitle,
        amount: totalAmount,
        description: `Приход со склада по накладной №${documentNumber}`,
        waybillNumber: documentNumber,
        waybillData: {
          documentNumber,
          date,
          project: currentProjectTitle,
          note,
          items: items.map(item => ({
            product: {
              name: item.product.name,
              unit: item.product.unit
            } as const,
            quantity: item.quantity,
            price: item.product.averagePurchasePrice || 0
          }))
        },
        type: 'income',
        date: timestamp,
        isWarehouseOperation: true,
        relatedTransactionId: warehouseTransactionRef.id
      });

      // Обновляем количество товаров на складе
      for (const item of items) {
        const productRef = doc(db, 'products', item.product.id);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
          throw new Error(`Товар ${item.product.name} не найден`);
        }

        const currentData = productDoc.data();
        const currentQuantity = currentData.quantity || 0;
        
        if (currentQuantity < item.quantity) {
          throw new Error(`Недостаточное количество товара ${item.product.name} на складе`);
        }

        // Уменьшаем количество товара
        const newQuantity = currentQuantity - item.quantity;
        
        batch.update(productRef, {
          quantity: newQuantity,
          updatedAt: timestamp
        });

        // Добавляем запись в историю движения товара
        const movementRef = doc(collection(db, 'productMovements'));
        batch.set(movementRef, {
          productId: item.product.id,
          type: 'out',
          quantity: item.quantity,
          price: item.product.averagePurchasePrice || 0,
          totalPrice: item.quantity * (item.product.averagePurchasePrice || 0),
          warehouse: 'Основной склад',
          description: `Расход товара на проект ${currentProjectTitle}`,
          date: timestamp,
          previousQuantity: currentQuantity,
          newQuantity: newQuantity,
          project: currentProjectTitle
        });
      }
      
      await batch.commit();
      
      // Очищаем localStorage перед показом накладной
      localStorage.removeItem(EXPENSE_ITEMS_KEY);
      localStorage.removeItem(EXPENSE_PROJECT_KEY);
      
      showSuccessNotification('Товары успешно списаны на проект');
      
      // Показываем накладную и затем переходим на страницу склада
      setShowWaybill(true);
    } catch (error) {
      console.error('Error submitting expense:', error);
      showErrorNotification(error instanceof Error ? error.message : 'Ошибка при списании товаров');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const amount = items.reduce((sum, item) => sum + (item.quantity * (item.product.averagePurchasePrice || 0)), 0);
    const total = amount;
    return { quantity, amount, total };
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAll = () => {
    if (window.confirm('Вы уверены, что хотите удалить все товары?')) {
      setItems([]);
      localStorage.removeItem(EXPENSE_ITEMS_KEY);
    }
  };

  const totals = calculateTotals();

  const handleCloseWaybill = () => {
    setShowWaybill(false);
    // Очищаем localStorage
    localStorage.removeItem(EXPENSE_ITEMS_KEY);
    localStorage.removeItem(EXPENSE_PROJECT_KEY);
    // Используем setTimeout, чтобы дать время для очистки состояния
    setTimeout(() => {
      // Используем window.location вместо navigate
      window.location.href = '/warehouse';
    }, 100);
  };

  return (
    <Scrollbars
      style={{ width: '100%', height: '100vh' }}
      universal={true}
      renderThumbVertical={props => <div {...props} className="thumb-vertical" />}
      autoHide
      autoHideTimeout={1000}
      autoHideDuration={200}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Шапка */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/warehouse')} className="text-gray-600">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Расход новый</h1>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-gray-600">
                  <Search className="w-6 h-6" />
                </button>
                <button className="text-gray-600">
                  <Barcode className="w-6 h-6" />
                </button>
                <button className="text-gray-600">
                  <span className="text-xl">⋮</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Форма */}
        <div className="max-w-7xl mx-auto p-2 sm:p-4 mb-32">
          <div className="bg-white rounded-lg shadow-sm mb-4">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                    Дата документа
                  </label>
                  <input
                    type="date"
                    value={date}
                    disabled
                    className="w-full px-2 py-1 sm:px-3 sm:py-2 border rounded-lg bg-gray-50 text-gray-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                    Номер документа
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    disabled
                    className="w-full px-2 py-1 sm:px-3 sm:py-2 border rounded-lg bg-gray-50 text-gray-500 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Покупатель */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Проект
                </label>
                <ProjectSelector
                  value={selectedProject}
                  onChange={handleProjectChange}
                />
              </div>

              {/* Примечание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Примечание
                </label>
                <div className="relative">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                  />
                  <button className="absolute right-2 bottom-2 text-gray-400">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Список товаров */}
          <div className="bg-white rounded-lg shadow-sm">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-4xl text-gray-400">📦</div>
                </div>
                <p className="text-gray-500 text-lg">Добавьте товары</p>
              </div>
            ) : (
              <div className="divide-y">
                <div className="p-4 flex justify-end">
                  <button
                    onClick={handleDeleteAll}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить все
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-xs sm:text-base truncate max-w-[180px] sm:max-w-none">
                        {item.product.name}
                      </h3>
                      <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm text-gray-500">Кол-во:</span>
                          <input
                            type="number"
                            onFocus={(e) => e.target.value = ''}
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].quantity = Number(e.target.value);
                              setItems(newItems);
                            }}
                            className="w-14 sm:w-20 px-1 py-0.5 sm:px-2 sm:py-1 border rounded text-right text-xs sm:text-sm"
                            min="1"
                          />
                          <span className="text-xs sm:text-sm text-gray-500">{item.product.unit}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="p-1 sm:p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Нижняя панель */}
          <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center w-full sm:flex-1">
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-gray-900">{totals.quantity}</div>
                    <div className="text-xs text-gray-500">Кол-во</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-gray-900">{Math.round(totals.amount).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-gray-500">Сумма</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-emerald-600">{Math.round(totals.total).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-gray-500">Итого</div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !selectedProject || items.length === 0}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-gray-300 text-sm sm:text-base"
                  >
                    {loading ? 'Отправка...' : 'Отправить на проект'}
                  </button>
                  <button 
                    onClick={() => navigate('/warehouse')}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-600 transition-colors flex-shrink-0"
                  >
                    <span className="text-2xl">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {showWaybill && (
          <ExpenseWaybill
            isOpen={showWaybill}
            onClose={handleCloseWaybill}
            data={{
              documentNumber,
              date,
              project: projectTitle,
              note,
              items
            }}
          />
        )}
      </div>
    </Scrollbars>
  );
};