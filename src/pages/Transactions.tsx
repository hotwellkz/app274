import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { CategoryRow } from '../components/transactions/CategoryRow';
import { useCategories } from '../hooks/useCategories';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CategoryCardType } from '../types';
import { TransactionHistory } from '../components/transactions/TransactionHistory';
import { TransferModal } from '../components/transactions/transfer/TransferModal';
import { AddWarehouseItemModal } from '../components/transactions/AddWarehouseItemModal';
import { useNavigate } from 'react-router-dom';
import { RayBackground } from '../components/RayBackground';
import { Scrollbars } from 'react-custom-scrollbars-2';

export const Transactions: React.FC = () => {
  const { categories, loading, error } = useCategories();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryCardType | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [transferData, setTransferData] = useState<{
    sourceCategory: CategoryCardType;
    targetCategory: CategoryCardType;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  const navigate = useNavigate();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const sourceCategory = active.data.current as CategoryCardType;
      const targetCategory = categories.find(c => c.id === over.id);
      
      if (targetCategory) {
        // Проверяем, является ли цель складом или "Общ Расх"
        if (targetCategory.row === 4) {
          // Если цель - категория "Склад"
          if (targetCategory.title === 'Склад') {
            if (targetCategory.title === 'Склад') {
              // Перенаправляем на страницу нового прихода
              navigate('/warehouse/income/new', { 
                state: { 
                  selectedEmployee: sourceCategory.title
                }
              });
            }
            return;
          }
          
          // Если цель - "Общ Расх"
          if (targetCategory.title === 'Общ Расх') {
            // Проверяем источник
            if (sourceCategory.row === 2) {
              // Если источник - сотрудник, открываем модальное окно перевода
              setTransferData({
                sourceCategory,
                targetCategory
              });
              setShowTransferModal(true);
            } else if (sourceCategory.row === 4) {
              // Перенаправляем на страницу нового расхода
              navigate('/warehouse/expense/new', {
                state: {
                  selectedProject: targetCategory.id,
                  projectTitle: targetCategory.title
                }
              });
            }
            return;
          } else {
            // Для остальных категорий склада открываем модальное окно перевода
            setTransferData({
              sourceCategory,
              targetCategory
            });
            setShowTransferModal(true);
            return;
          }
        }

        // Проверяем, является ли источник складом, а цель - проектом
        if (sourceCategory.row === 4 && targetCategory.row === 3) {
          // Перенаправляем на страницу нового расхода с предварительно выбранным проектом
          navigate('/warehouse/expense/new', { 
            state: { 
              selectedProject: targetCategory.id,
              projectTitle: targetCategory.title
            }
          });
          return;
        }

        setTransferData({
          sourceCategory,
          targetCategory
        });
        setShowTransferModal(true);
      }
    }
  };

  const handleHistoryClick = (category: CategoryCardType) => {
    setSelectedCategory(category);
    setShowHistory(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-xl text-red-500 p-4 bg-white rounded-lg shadow">
          {error}
        </div>
      </div>
    );
  }

  // Фильтруем категории по видимости
  const visibleCategories = categories.filter(c => c.isVisible !== false);

  const clientCategories = visibleCategories.filter(c => c.row === 1);
  const employeeCategories = visibleCategories.filter(c => c.row === 2);
  const projectCategories = visibleCategories.filter(c => c.row === 3);
  const warehouseCategories = visibleCategories.filter(c => c.row === 4);

  return (
    <Scrollbars
      style={{ width: '100%', height: '100vh' }}
      universal={true}
      renderThumbVertical={props => <div {...props} className="thumb-vertical" />}
      autoHide
      autoHideTimeout={1000}
      autoHideDuration={200}
    >
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="relative min-h-screen">
          <RayBackground theme="light" />
          <div className="relative z-10 p-2 sm:p-3 space-y-2">
            <CategoryRow
              title="Клиенты"
              categories={clientCategories}
              onHistoryClick={handleHistoryClick}
              rowNumber={1}
            />
            
            <CategoryRow
              title="Сотрудники"
              categories={employeeCategories}
              onHistoryClick={handleHistoryClick}
              rowNumber={2}
            />
            
            <CategoryRow
              title="Проекты"
              categories={projectCategories}
              onHistoryClick={handleHistoryClick}
              rowNumber={3}
            />
            
            <CategoryRow
              title="Склад"
              categories={warehouseCategories}
              onHistoryClick={handleHistoryClick}
              onAddCategory={() => setShowAddWarehouseModal(true)}
              rowNumber={4}
            />
          </div>

          {showHistory && selectedCategory && (
            <TransactionHistory
              category={selectedCategory}
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
            />
          )}

          {showTransferModal && transferData && (
            <TransferModal
              sourceCategory={transferData.sourceCategory}
              targetCategory={transferData.targetCategory}
              isOpen={showTransferModal}
              onClose={() => {
                setShowTransferModal(false);
                setTransferData(null);
              }}
            />
          )}

          {showAddWarehouseModal && (
            <AddWarehouseItemModal
              isOpen={showAddWarehouseModal}
              onClose={() => setShowAddWarehouseModal(false)}
            />
          )}
        </div>
      </DndContext>
    </Scrollbars>
  );
};