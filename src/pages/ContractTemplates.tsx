import React, { useState } from 'react';
import { ArrowLeft, FileText, X } from 'lucide-react';
import { ContractTemplate } from '../components/ContractTemplate';
import { ContractTemplate2024001 } from '../components/ContractTemplate2024001';
import { AttachmentSpecTemplate } from '../components/AttachmentSpecTemplate';
import { numberToWords } from '../utils/numberToWords';

const mockClient = {
  clientNumber: "2024-001",
  lastName: "Иванов",
  firstName: "Иван",
  middleName: "Иванович",
  objectName: "Жилой дом",
  constructionAddress: "г. Алматы, мкр. Алатау, ул. Жетысу, уч. 123",
  totalAmount: 10500000,
  totalAmountWords: numberToWords(10500000),
  iin: "123456789012",
  livingAddress: "г. Алматы, ул. Абая, д. 1, кв. 1",
  phone: "+7 747 743 4343",
  email: "HotWell.KZ@gmail.com",
  constructionDays: 45,
  deposit: 75000,
  depositWords: numberToWords(75000),
  firstPayment: 4170000,
  firstPaymentWords: numberToWords(4170000),
  secondPayment: 4170000,
  secondPaymentWords: numberToWords(4170000),
  thirdPayment: 1981500,
  thirdPaymentWords: numberToWords(1981500),
  fourthPayment: 103500,
  fourthPaymentWords: numberToWords(103500)
};

interface ContractType {
  id: string;
  title: string;
  description: string;
  lastModified: string;
}

export const ContractTemplates: React.FC = () => {
  const [showTemplate, setShowTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const contractTemplates: ContractType[] = [
    {
      id: '1',
      title: 'Договор подряда на строительство дома',
      description: 'Стандартный договор для строительства частного дома',
      lastModified: '10.03.2024'
    },
    {
      id: '2',
      title: 'Договор подряда №2024-001',
      description: 'Обновленный шаблон договора подряда с улучшенным форматированием',
      lastModified: '02.02.2025'
    },
    {
      id: '3',
      title: 'Приложение №1 к Договору подряда №003',
      description: 'Заявка-Спецификация на Поставку Товара',
      lastModified: '03.02.2025'
    }
  ];

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplate(true);
  };

  const renderTemplate = () => {
    if (!showTemplate) return null;

    switch (selectedTemplateId) {
      case '1':
        return (
          <ContractTemplate
            client={mockClient}
            isOpen={showTemplate}
            onClose={() => setShowTemplate(false)}
          />
        );
      case '2':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-10 z-50">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl mx-4 overflow-auto" style={{ maxHeight: '90vh' }}>
              <div className="sticky top-0 bg-white rounded-t-lg border-b border-gray-200 z-10">
                <div className="flex justify-between items-center p-4">
                  <h2 className="text-xl font-semibold">Договор подряда №{mockClient.clientNumber}</h2>
                  <button
                    onClick={() => setShowTemplate(false)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <ContractTemplate2024001 client={mockClient} />
              </div>
            </div>
          </div>
        );
      case '3':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-10 z-50">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl mx-4 overflow-auto" style={{ maxHeight: '90vh' }}>
              <div className="sticky top-0 bg-white rounded-t-lg border-b border-gray-200 z-10">
                <div className="flex justify-between items-center p-4">
                  <h2 className="text-xl font-semibold">Приложение №1 к Договору подряда №003</h2>
                  <button
                    onClick={() => setShowTemplate(false)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <AttachmentSpecTemplate />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button onClick={() => window.history.back()} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Шаблоны договоров</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {contractTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-4 sm:p-6 flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {template.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {template.description}
                  </p>
                  <p className="text-sm text-gray-400">
                    Последнее изменение: {template.lastModified}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {renderTemplate()}
    </div>
  );
};