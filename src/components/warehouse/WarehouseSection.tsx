import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Package, History, QrCode, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Product } from '../../types/warehouse';
import { useNavigate } from 'react-router-dom';

interface WarehouseSectionProps {
  title: string;
  subtitle: string;
  products: Product[];
  onContextMenu: (e: React.MouseEvent, product: Product) => void;
  onProductClick: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onViewQRCode: (product: Product) => void;
  warehouse: 'all' | '1' | '2' | '3';
}

export const WarehouseSection: React.FC<WarehouseSectionProps> = ({ 
  title,
  subtitle,
  products,
  onContextMenu,
  onProductClick,
  onViewHistory,
  onViewQRCode,
  warehouse
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false); // Changed to false to be expanded by default
  const navigate = useNavigate();

  const handleContextMenu = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); // Prevent default context menu
    e.stopPropagation(); // Stop event propagation
    onContextMenu(e, product);
  };

  const getStatusColor = () => {
    switch (warehouse) {
      case 'all':
        return 'text-purple-500';
      case '1':
        return 'text-emerald-500';
      case '2':
        return 'text-amber-500';
      case '3':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getBadgeColor = () => {
    switch (warehouse) {
      case 'all':
        return 'bg-purple-100 text-purple-600';
      case '1':
        return 'bg-emerald-100 text-emerald-600';
      case '2':
        return 'bg-amber-100 text-amber-600';
      case '3':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div>
      <div
        className="flex items-center justify-between mb-2 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className={`w-5 h-5 ${getStatusColor()}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${getStatusColor()}`} />
          )}
          <Package className={`w-5 h-5 ${getStatusColor()}`} />
          <h3 className="font-medium text-gray-900">
            {title} ({products.length})
          </h3>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${getBadgeColor()}`}>
          {subtitle}
        </div>
      </div>
      
      {!isCollapsed && products.length > 0 && (
        <div className="space-y-1">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white hover:bg-gray-50 border-b last:border-b-0 transition-colors ${
                product.quantity <= (product.minQuantity || 5) ? 'border-l-4 border-l-red-500' : ''
              }`}
              onClick={() => navigate(`/warehouse/products/${product.id}`)}
              onContextMenu={(e) => handleContextMenu(e, product)}
            >
              <div className="p-2">
                {/* Мобильная версия */}
                <div className="sm:hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 truncate max-w-[160px]">{product.name}</h3>
                      <p className="text-[10px] text-gray-500 truncate max-w-[160px]">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium ${product.quantity <= (product.minQuantity || 5) ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.quantity} {product.unit}
                      </div>
                      <div className="text-[10px] text-gray-500">{product.averagePurchasePrice?.toLocaleString()} ₸</div>
                      <div className="text-[10px] text-emerald-600">{((product.quantity || 0) * (product.averagePurchasePrice || 0)).toLocaleString()} ₸</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/warehouse/income/new', { state: { addedProduct: { product, quantity: 1 } } });
                      }}
                      className="p-1 text-emerald-600"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/warehouse/expense/new', { state: { addedProduct: { product, quantity: 1 } } });
                      }}
                      className="p-1 text-red-600"
                    >
                      <ArrowDownRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(product);
                      }}
                      className="p-1 text-blue-600"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewQRCode(product);
                      }}
                      className="p-1 text-purple-600"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Десктопная версия */}
                <div className="hidden sm:flex items-center">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate hover:text-emerald-600">{product.name}</h3>
                    <p className="text-xs text-gray-500">
                      {product.category}
                      {product.quantity <= (product.minQuantity || 5) && (
                        <span className="ml-2 text-red-500">Мало на складе!</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right min-w-[120px]">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(product.averagePurchasePrice || 0).toLocaleString()} ₸
                      </div>
                      <div className="text-xs text-emerald-600">
                        {Math.round((product.quantity || 0) * (product.averagePurchasePrice || 0)).toLocaleString()} ₸
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className={`text-sm font-medium ${product.quantity <= (product.minQuantity || 5) ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.quantity} {product.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/warehouse/income/new', { state: { addedProduct: { product, quantity: 1 } } });
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Добавить в приход"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/warehouse/expense/new', { state: { addedProduct: { product, quantity: 1 } } });
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Добавить в расход"
                      >
                        <ArrowDownRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewHistory(product);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="История транзакций"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewQRCode(product);
                        }}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                        title="QR-код"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};