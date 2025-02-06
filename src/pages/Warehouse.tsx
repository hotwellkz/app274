import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Package, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types/warehouse';
import { WarehouseSection } from '../components/warehouse/WarehouseSection';
import { ProductList } from '../components/warehouse/ProductList';
import { ProductContextMenu } from '../components/warehouse/ProductContextMenu';
import { ProductDetails } from '../components/warehouse/ProductDetails';
import { TransactionHistory } from '../components/warehouse/TransactionHistory';
import { QRCodeModal } from '../components/warehouse/QRCodeModal';
import { showErrorNotification } from '../utils/notifications';
import { Scrollbars } from 'react-custom-scrollbars-2';

export const Warehouse: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<'all' | '1' | '2' | '3'>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    product: Product;
  } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);

  useEffect(() => {
    let q;
    
    try {
      if (showLowStock) {
        // Теперь мы не можем использовать where для фильтрации по minQuantity,
        // так как это требует сложного условия. Вместо этого загружаем все товары
        // и фильтруем на клиенте
        q = query(collection(db, 'products'), orderBy('name'));
      } else {
        // Normal query without quantity filter
        q = query(
          collection(db, 'products'),
          ...(selectedWarehouse !== 'all' ? [where('warehouse', '==', selectedWarehouse)] : []),
          orderBy('name')
        );
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        
        // Фильтруем товары с учетом minQuantity
        const filteredData = showLowStock 
          ? productsData.filter(p => p.quantity <= (p.minQuantity || 5))
          : productsData;
        
        // Фильтруем по выбранному складу
        const warehouseFilteredData = selectedWarehouse === 'all'
          ? filteredData
          : filteredData.filter(p => p.warehouse === selectedWarehouse);
        
        setProducts(warehouseFilteredData);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error in products subscription:', error);
      setLoading(false);
      return () => {};
    }
  }, [selectedWarehouse, showLowStock]);

  useEffect(() => {
    const total = products.reduce((sum, product) => {
      return sum + ((product.quantity || 0) * (product.averagePurchasePrice || 0));
    }, 0);
    setTotalValue(total);
  }, [products]);

  const handleContextMenu = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    
    // Проверяем, чтобы меню не выходило за пределы экрана
    const menuWidth = 200;
    const menuHeight = 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const adjustedX = x + menuWidth > viewportWidth ? viewportWidth - menuWidth - 10 : x;
    const adjustedY = y + menuHeight > viewportHeight ? viewportHeight - menuHeight - 10 : y;
    
    setContextMenu({
      x: adjustedX,
      y: adjustedY,
      product
    });
    setSelectedProduct(product);
  };

  // Закрываем контекстное меню при клике вне его
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const handleViewHistory = async (product: Product) => {
    try {
      if (!product) {
        showErrorNotification('Товар не найден');
        return;
      }
      setSelectedHistoryProduct(product);
      setShowHistory(true);
    } catch (error) {
      showErrorNotification('Не удалось загрузить историю транзакций');
    }
  };

  const handleViewQRCode = (product: Product) => {
    if (!product) {
      showErrorNotification('Товар не найден');
      return;
    }
    setSelectedProduct(product);
    setShowQRCode(true);
  };

  const filteredProducts = products.filter(product => {
    const searchString = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchString) ||
      product.category?.toLowerCase().includes(searchString)
    );
  });

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
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-4">
              <div className="flex items-center">
                <button onClick={() => window.history.back()} className="mr-4">
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-semibold text-gray-900">Склад</h1>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-emerald-600">{Math.round(totalValue).toLocaleString()} ₸</span>
                  </div>
                </div>
              </div>
              
              {/* Мобильная версия кнопок */}
              <div className="flex flex-col w-full sm:hidden gap-2">
                <div className="flex justify-between gap-2">
                  <button
                    onClick={() => navigate('/warehouse/income/new')}
                    className="flex-1 px-3 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Приход
                  </button>
                  <button
                    onClick={() => navigate('/warehouse/expense/new')}
                    className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Расход
                  </button>
                  <button 
                    onClick={() => navigate('/warehouse/documents')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center justify-center"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Десктопная версия кнопок */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => navigate('/warehouse/income/new')}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Приход
                </button>
                <button
                  onClick={() => navigate('/warehouse/expense/new')}
                  className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Расход
                </button>
                <button 
                  onClick={() => navigate('/warehouse/documents')}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  title="Документы"
                >
                  <FileText className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              {/* Удалено меню выбора склада */}
            </div>
            
            <div className="py-2 sm:py-4 overflow-x-hidden">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Поиск по названию или категории..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <div className="mt-2 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Показать товары которых мало на складе
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Нет товаров</h3>
              <p className="text-gray-500">
                {searchQuery ? 'По вашему запросу ничего не найдено' : 'Добавьте первый товар'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <WarehouseSection
                title="Склад"
                subtitle="Основной склад"
                products={filteredProducts}
                onContextMenu={handleContextMenu}
                onProductClick={handleProductClick}
                onViewHistory={handleViewHistory}
                onViewQRCode={handleViewQRCode}
                warehouse="1"
              />

            </div>
          )}
        </div>

        {contextMenu && (
          <ProductContextMenu
            position={{ x: contextMenu.x, y: contextMenu.y }}
            product={contextMenu.product}
            onClose={() => setContextMenu(null)}
          />
        )}

        {showProductDetails && selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onBack={() => setShowProductDetails(false)}
          />
        )}

        {showHistory && selectedHistoryProduct && (
          <TransactionHistory
            product={selectedHistoryProduct}
            isOpen={showHistory}
            onClose={() => {
              setShowHistory(false);
              setSelectedHistoryProduct(null);
            }}
          />
        )}

        {showQRCode && selectedProduct && (
          <QRCodeModal
            isOpen={showQRCode}
            onClose={() => {
              setShowQRCode(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
          />
        )}
      </div>
    </Scrollbars>
  );
};
