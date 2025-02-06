import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase/auth';
import { 
  ArrowLeftRight, 
  ScrollText,
  Shield,
  Receipt, 
  FileText,
  Users,
  Menu,
  X,
  Package,
  Building2,
  Calculator,
  Warehouse,
  LogOut,
  User,
  MessageSquare
} from 'lucide-react';
import { useUnapprovedCount } from '../hooks/useUnapprovedCount';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive?: boolean;
}

interface SidebarProps {
  onPageChange: (page: 'dashboard' | 'transactions' | 'feed' | 'daily-report' | 'clients' | 'templates' | 'products' | 'employees' | 'projects' | 'calculator' | 'chat' | 'warehouse') => void;
  currentPage: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onPageChange, currentPage }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const unapprovedCount = useUnapprovedCount();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().role === 'admin');
        }
      }
    };

    checkAdminStatus();
  }, []);

  const menuItems: MenuItem[] = [
    { 
      icon: <ArrowLeftRight className="w-5 h-5" />, 
      label: 'Транзакции', 
      path: '/',
      isActive: location.pathname === '/'
    },
    { 
      icon: <Users className="w-5 h-5" />, 
      label: 'Клиенты', 
      path: '/clients',
      isActive: location.pathname === '/clients'
    },
    { 
      icon: <FileText className="w-5 h-5" />, 
      label: 'Шаблоны договоров', 
      path: '/templates',
      isActive: location.pathname === '/templates'
    },
    { 
      icon: <Package className="w-5 h-5" />, 
      label: 'Товары и цены', 
      path: '/products',
      isActive: location.pathname === '/products'
    },
    { 
      icon: <Users className="w-5 h-5" />, 
      label: 'Сотрудники', 
      path: '/employees',
      isActive: location.pathname === '/employees'
    },
    { 
      icon: <Calculator className="w-5 h-5" />, 
      label: 'Калькулятор', 
      path: '/calculator',
      isActive: location.pathname === '/calculator'
    },
    { 
      icon: <Warehouse className="w-5 h-5" />, 
      label: 'Склад', 
      path: '/warehouse',
      isActive: location.pathname === '/warehouse'
    },
    { 
      icon: <MessageSquare className="w-5 h-5" />, 
      label: 'WhatsApp', 
      path: '/whatsapp',
      isActive: location.pathname === '/whatsapp'
    }
  ];

  const handleMenuItemClick = (item: MenuItem) => {
    navigate(item.path);
    onPageChange(item.path.replace('/', '') || 'dashboard');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden bg-white p-2 rounded-lg shadow-lg mt-2 hover:bg-gray-50 transition-colors duration-200"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[45] lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-[50] transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-gray-100`}
      >
        <div className="flex flex-col h-full">
          <div className="h-20 lg:h-0" />
          
          <div className="flex-1 overflow-y-auto py-4 px-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuItemClick(item)}
                className={`w-full flex items-center px-4 py-3 my-1 rounded-lg text-gray-700 transition-all duration-200 group relative ${
                  item.isActive 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {item.isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />
                )}
                <span className={`transition-transform duration-200 group-hover:scale-110 ${
                  item.isActive ? 'text-emerald-600' : 'text-emerald-500'
                }`}>
                  {item.icon}
                </span>
                <span className={`ml-3 text-sm font-medium transition-colors duration-200 ${
                  item.isActive ? 'text-emerald-600' : 'text-gray-700 group-hover:text-emerald-600'
                }`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100 p-4 bg-gray-50 bg-opacity-50 backdrop-blur-sm">
            <div className="flex flex-col space-y-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group relative ${
                    location.pathname === '/admin'
                      ? 'text-emerald-600 bg-emerald-50 shadow-sm'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-white'
                  }`}
                >
                  <Shield className="w-5 h-5 mr-3 transition-transform duration-200 group-hover:scale-110" />
                  <span>Администратор</span>
                  {unapprovedCount > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center animate-pulse">
                      {unapprovedCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  navigate('/profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 px-4 py-2 hover:bg-white rounded-lg transition-all duration-200 group"
              >
                <User className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>Сменить пароль</span>
              </button>
              <button
                onClick={() => auth.signOut()}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-4 py-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
              >
                <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};