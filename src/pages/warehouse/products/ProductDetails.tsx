import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, History, QrCode, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Product } from '../../../types/warehouse';
import { BarcodeGenerator } from '../../../components/warehouse/BarcodeGenerator';
import { ProductHistory } from '../../../components/warehouse/ProductHistory';
import { PasswordPrompt } from '../../../components/PasswordPrompt';
import { showSuccessNotification, showErrorNotification } from '../../../utils/notifications';

export const ProductDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeCode, setActiveCode] = useState<'barcode' | 'qrcode'>('qrcode');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  
  // Состояния для редактирования
  const [editedData, setEditedData] = useState({
    quantity: 0,
    minQuantity: 5,
    averagePurchasePrice: 0
  });

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      try {
        const productDoc = await getDoc(doc(db, 'products', id));
        if (productDoc.exists()) {
          const productData = { id: productDoc.id, ...productDoc.data() } as Product;
          setProduct(productData);
          setEditedData({
            quantity: productData.quantity || 0,
            minQuantity: productData.minQuantity || 5,
            averagePurchasePrice: productData.averagePurchasePrice || 0
          });
        }
      } catch (error) {
        console.error('Error loading product:', error);
        showErrorNotification('Ошибка при загрузке товара');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleSave = async () => {
    if (!product) return;

    try {
      if (editedData.quantity < 0) {
        showErrorNotification('Количество не может быть отрицательным');
        return;
      }

      if (editedData.minQuantity < 0) {
        showErrorNotification('Минимальное количество не может быть отрицательным');
        return;
      }

      if (editedData.averagePurchasePrice < 0) {
        showErrorNotification('Цена не может быть отрицательной');
        return;
      }

      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        ...editedData,
        totalPurchasePrice: editedData.quantity * editedData.averagePurchasePrice,
        updatedAt: serverTimestamp()
      });

      setProduct(prev => prev ? {
        ...prev,
        ...editedData,
        totalPurchasePrice: editedData.quantity * editedData.averagePurchasePrice
      } : null);

      setIsEditing(false);
      showSuccessNotification('Товар успешно обновлен');
    } catch (error) {
      console.error('Error updating product:', error);
      showErrorNotification('Ошибка при обновлении товара');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Товар не найден</h2>
          <button
            onClick={() => navigate('/warehouse/products')}
            className="text-emerald-600 hover:text-emerald-700"
          >
            Вернуться к списку товаров
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500">{product.category}</p>
              </div>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSave}
                  className="p-2 text-emerald-600 hover:text-emerald-700"
                >
                  <Save className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPasswordPrompt(true)}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Информация о товаре */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-emerald-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.category}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.quantity}
                    onFocus={(e) => e.target.value = ''}
                    onChange={(e) => setEditedData(prev => ({
                      ...prev,
                      quantity: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                ) : (
                  <p className={`text-lg font-medium ${
                    product.quantity <= (product.minQuantity || 5) ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {product.quantity} {product.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Минимальное количество
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.minQuantity}
                    onFocus={(e) => e.target.value = ''}
                    onChange={(e) => setEditedData(prev => ({
                      ...prev,
                      minQuantity: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">
                    {product.minQuantity || 5} {product.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Средняя цена
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.averagePurchasePrice}
                    onFocus={(e) => e.target.value = ''}
                    onChange={(e) => setEditedData(prev => ({
                      ...prev,
                      averagePurchasePrice: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">
                    {Math.round(product.averagePurchasePrice || 0).toLocaleString()} ₸
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Общая стоимость
                </label>
                <p className="text-lg font-medium text-emerald-600">
                  {Math.round((product.quantity || 0) * (product.averagePurchasePrice || 0)).toLocaleString()} ₸
                </p>
              </div>
            </div>
          </div>

          {/* Штрих-коды и QR-коды */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Коды товара</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveCode('barcode')}
                    className={`px-3 py-1.5 rounded ${
                      activeCode === 'barcode' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Штрих-код
                  </button>
                  <button
                    onClick={() => setActiveCode('qrcode')}
                    className={`px-3 py-1.5 rounded ${
                      activeCode === 'qrcode' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    QR-код
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                <BarcodeGenerator
                  value={product.id}
                  type={activeCode}
                />
              </div>
            </div>

            <button
              onClick={() => setShowHistory(true)}
              className="w-full bg-white rounded-lg shadow-sm p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-gray-900">История операций</span>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <ProductHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          product={product}
        />
      )}

      {showPasswordPrompt && (
        <PasswordPrompt
          isOpen={showPasswordPrompt}
          onClose={() => setShowPasswordPrompt(false)}
          onSuccess={() => {
            setShowPasswordPrompt(false);
            setIsEditing(true);
          }}
        />
      )}
    </div>
  );
};