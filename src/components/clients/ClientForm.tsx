import React from 'react';
import { NewClient } from '../../types/client';

interface ClientFormProps {
  client: NewClient;
  onChange: (updates: Partial<NewClient>) => void;
  yearOptions?: number[];
  isEditMode?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  client,
  onChange,
  yearOptions = [new Date().getFullYear()],
  isEditMode = false
}) => {
  const inputClassName = "mt-1 block w-full px-4 py-3 text-lg rounded-xl border-0 bg-gray-50 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-emerald-600 transition-all duration-200";
  const labelClassName = "hidden sm:block text-base font-medium leading-6 text-gray-900 mb-2";
  const selectClassName = "mt-1 block w-full px-4 py-3 text-lg rounded-xl border-0 bg-gray-50 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 transition-all duration-200";

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="firstName" className={labelClassName}>
          Имя *
        </label>
        <input
          type="text"
          id="firstName"
          value={client.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          className={inputClassName}
          placeholder="Имя *"
          required
        />
      </div>

      <div>
        <label htmlFor="objectName" className={labelClassName}>
          Название объекта *
        </label>
        <input
          type="text"
          id="objectName"
          value={client.objectName}
          onChange={(e) => onChange({ objectName: e.target.value })}
          className={inputClassName}
          placeholder="Название объекта *"
          required
        />
      </div>

      <div>
        <label htmlFor="phone" className={labelClassName}>
          Телефон
        </label>
        <input
          type="tel"
          id="phone"
          value={client.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className={inputClassName}
          placeholder="Телефон"
        />
      </div>

      <div>
        <label htmlFor="status" className={labelClassName}>
          Статус *
        </label>
        <select
          id="status"
          value={client.status}
          onChange={(e) => onChange({ status: e.target.value as 'building' | 'deposit' | 'built' })}
          className={selectClassName}
          required
        >
          <option value="" disabled>Выберите статус *</option>
          <option value="deposit">Задаток</option>
          <option value="building">Строится</option>
          <option value="built">Построен</option>
        </select>
      </div>
    </div>
  );
};