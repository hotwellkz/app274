import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { AdminRoute } from './components/auth/AdminRoute';
import { ApprovalGuard } from './components/auth/ApprovalGuard';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Feed } from './pages/Feed';
import DailyReport from './pages/DailyReport';
import { Clients } from './pages/Clients';
import { Admin } from './pages/Admin';
import { ContractTemplates } from './pages/ContractTemplates';
import { Products } from './pages/Products';
import { Transactions } from './pages/Transactions';
import { WarehouseProducts } from './pages/warehouse/products/WarehouseProducts';
import { Employees } from './pages/Employees';
import { FolderProducts } from './pages/warehouse/products/FolderProducts';
import { ProductDetails } from './pages/warehouse/products/ProductDetails';
import { Calculator } from './pages/Calculator';
import { Documents } from './pages/warehouse/Documents';
import { ClientFiles } from './pages/ClientFiles';
import { Warehouse } from './pages/Warehouse';
import { NewIncome } from './pages/warehouse/NewIncome';
import { NewExpense } from './pages/warehouse/NewExpense';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { Profile } from './pages/Profile';
import { useStats } from './hooks/useStats';
import { LoadingSpinner } from './components/LoadingSpinner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';
import WhatsApp from './pages/WhatsApp';

type Page = 'dashboard' | 'transactions' | 'feed' | 'daily-report' | 'clients' | 'templates' | 'products' | 'employees' | 'projects' | 'calculator' | 'warehouse';

const AppContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('transactions');
  const { stats, loading: statsLoading, error: statsError } = useStats();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        console.log('Firebase connected, documents count:', snapshot.size);
        setIsLoading(false);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading || statsLoading) {
    return <LoadingSpinner />;
  }

  if (statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-xl text-red-500 p-4 bg-white rounded-lg shadow">
          Ошибка загрузки данных: {statsError}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar onPageChange={setCurrentPage} currentPage={currentPage} />
      <div className="lg:pl-64">
        <Header 
          stats={stats} 
          onPageChange={(page) => {
            navigate(`/${page}`);
            setCurrentPage(page as Page);
          }} 
        />
        <Routes>
          <Route path="/admin" element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } />
          <Route path="/" element={
            <ApprovalGuard>
              <Transactions />
            </ApprovalGuard>
          } />
          <Route path="/transactions" element={
            <ApprovalGuard>
              <Transactions />
            </ApprovalGuard>
          } />
          <Route path="/feed" element={
            <ApprovalGuard>
              <Feed />
            </ApprovalGuard>
          } />
          <Route path="/daily-report" element={
            <ApprovalGuard>
              <DailyReport />
            </ApprovalGuard>
          } />
          <Route path="/clients" element={
            <ApprovalGuard>
              <Clients />
            </ApprovalGuard>
          } />
          <Route path="/templates" element={
            <ApprovalGuard>
              <ContractTemplates />
            </ApprovalGuard>
          } />
          <Route path="/products" element={
            <ApprovalGuard>
              <Products />
            </ApprovalGuard>
          } />
          <Route path="/warehouse/products" element={
            <ApprovalGuard>
              <WarehouseProducts />
            </ApprovalGuard>
          } />
          <Route path="/warehouse/products/:id" element={
            <ApprovalGuard>
              <ProductDetails />
            </ApprovalGuard>
          } />
          <Route path="/warehouse/folders/:folderId" element={
            <ApprovalGuard>
              <FolderProducts />
            </ApprovalGuard>
          } />
          <Route path="/employees" element={
            <AdminRoute>
              <Employees />
            </AdminRoute>
          } />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/warehouse" element={<Warehouse onPageChange={setCurrentPage} />} />
          <Route path="/warehouse/documents" element={<Documents />} />
          <Route path="/clients/:clientId/files" element={<ClientFiles />} />
          <Route path="/warehouse/expense/new" element={<NewExpense />} />
          <Route path="/warehouse/income/new" element={<NewIncome />} />
          <Route path="/transactions/history/:categoryId" element={<TransactionHistoryPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthGuard>
        <AppContent />
      </AuthGuard>
    </Router>
  );
};

export default App;