import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase/auth';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { UserList } from '../components/admin/UserList';
import { AddUserModal } from '../components/admin/AddUserModal';
import { AdminRoute } from '../components/auth/AdminRoute';

export const Admin: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminUser[];
      
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (userData: {
    email: string;
    displayName: string;
    password: string;
    role: 'admin' | 'employee' | 'user';
  }) => {
    try {
      // Создаем пользователя в Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Обновляем профиль пользователя
      await updateProfile(userCredential.user, {
        displayName: userData.displayName
      });

      // Сохраняем дополнительные данные в Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        isApproved: false,
        createdAt: serverTimestamp()
      });
      
      setShowAddModal(false);
      showSuccessNotification('Пользователь успешно добавлен');
    } catch (error) {
      showErrorNotification('Ошибка при добавлении пользователя');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      // Удаляем данные пользователя из Firestore
      await deleteDoc(doc(db, 'users', userId));
      showSuccessNotification('Пользователь успешно удален');
    } catch (error) {
      console.error('Error deleting user:', error);
      showErrorNotification('Ошибка при удалении пользователя');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      showSuccessNotification('Роль пользователя успешно обновлена');
    } catch (error) {
      showErrorNotification('Ошибка при обновлении роли');
    }
  };

  const handleApprovalChange = async (userId: string, isApproved: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isApproved
      });
      showSuccessNotification(isApproved ? 'Пользователь подтвержден' : 'Подтверждение пользователя отменено');
    } catch (error) {
      showErrorNotification('Ошибка при обновлении статуса пользователя');
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="mr-3 sm:mr-4 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Управление пользователями</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-emerald-500 text-white text-sm sm:text-base rounded-md hover:bg-emerald-600 transition-colors"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
              <span className="whitespace-nowrap">Добавить пользователя</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        <UserList
          users={users}
          onRoleChange={handleRoleChange}
          onDelete={handleDeleteUser}
          onApprovalChange={handleApprovalChange}
          loading={loading}
        />
      </div>

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddUser}
      />
      </div>
    </AdminRoute>
  );
};