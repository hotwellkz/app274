import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Trash2, FileText, Image as ImageIcon, FileArchive, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase, CLIENTS_BUCKET } from '../lib/supabase/config';
import { showErrorNotification, showSuccessNotification } from '../utils/notifications';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client } from '../types/client';

interface FileUpload {
  file: File;
  progress: number;
  url?: string;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export const ClientFiles: React.FC = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadFiles, setUploadFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      if (!clientId) return;
      
      try {
        // Загружаем список файлов из Supabase Storage
        const { data, error } = await supabase.storage
          .from(CLIENTS_BUCKET)
          .list(`clients/${clientId}`);

        if (error) {
          throw error;
        }

        if (data) {
          // Получаем публичные URL для каждого файла
          const filesWithUrls = await Promise.all(
            data.map(async (file) => {
              const { data: { publicUrl } } = supabase.storage
                .from(CLIENTS_BUCKET)
                .getPublicUrl(`clients/${clientId}/${file.name}`);

              // Убираем timestamp из имени файла при отображении
              const originalName = file.name.replace(/^\d+-/, '');

              return {
                name: originalName,
                url: publicUrl,
                type: file.metadata?.mimetype || '',
                size: file.metadata?.size || 0,
                path: `clients/${clientId}/${file.name}`,
                uploadedAt: new Date(file.created_at)
              };
            })
          );

          setFiles(filesWithUrls);
        }
        
        // Загружаем только основную информацию о клиенте из Firestore
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (clientDoc.exists()) {
          const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;
          setClient(clientData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading files:', error);
        showErrorNotification('Ошибка при загрузке файлов');
        setLoading(false);
      }
    };

    loadFiles();
  }, [clientId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Accepted files:', acceptedFiles);
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0
    }));
    setUploadFiles(prev => [...prev, ...newFiles]);
    handleFileUpload(acceptedFiles);
  }, [client]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Разрешаем все типы файлов
    accept: {
      '*/*': []
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    maxFiles: 10 // Увеличиваем максимальное количество файлов
  });

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (uploadFiles: File[]) => {
    if (!client) return;

    try {
      const uploadedFiles = await Promise.all(
        uploadFiles.map(async (file, index) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const path = `clients/${client.id}/${safeName}`;
          
          try {
            console.log('Uploading file:', { name: file.name, path });
            const { data, error } = await supabase.storage
              .from(CLIENTS_BUCKET)
              .upload(path, file, {
                cacheControl: '3600',
                upsert: true
              });

            if (error) {
              console.error('Supabase upload error:', error);
              throw error;
            }

            if (!data?.path) {
              throw new Error('Upload successful but no path returned');
            }

            // Получаем публичный URL файла
            const { data: { publicUrl } } = supabase.storage
              .from(CLIENTS_BUCKET)
              .getPublicUrl(data.path);

            console.log('File uploaded successfully:', publicUrl);
            
            // Обновляем прогресс
            setUploadFiles(prev => 
              prev.map((f, i) => 
                i === index ? { ...f, progress: 100 } : f
              )
            );

            return {
              name: file.name, // Используем оригинальное имя файла
              url: publicUrl,
              type: file.type,
              size: file.size,
              path: data.path,
              uploadedAt: new Date()
            };
          } catch (error) {
            console.error('Error uploading file:', error);
            showErrorNotification(`Ошибка при загрузке файла ${file.name}`);
            throw error;
          }
        })
      );

      setFiles(prev => [...prev, ...uploadedFiles]);
      showSuccessNotification('Файлы успешно загружены');
      
      // Очищаем список загружаемых файлов
      setUploadFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      showErrorNotification('Ошибка при загрузке файлов');
    }
  };

  const handleDeleteFile = async (file: UploadedFile) => {
    if (!client || !window.confirm(`Удалить файл "${file.name}"?`)) return;

    try {
      // Удаляем файл только из Supabase Storage
      const { error } = await supabase.storage
        .from(CLIENTS_BUCKET)
        .remove([file.path]);

      if (error) {
        throw error;
      }

      setFiles(prev => prev.filter(f => f.path !== file.path));
      showSuccessNotification('Файл успешно удален');
    } catch (error) {
      console.error('Error deleting file:', error);
      showErrorNotification('Ошибка при удалении файла');
    }
  };

  const handleDownload = (file: UploadedFile) => {
    window.open(file.url, '_blank');
  };

  const handleWhatsAppShare = (file: UploadedFile) => {
    // Создаем текст сообщения
    const message = `Файл: ${file.name}\nСсылка: ${file.url}`;
    // Кодируем сообщение для URL
    const encodedMessage = encodeURIComponent(message);
    // Открываем WhatsApp Web с подготовленным сообщением
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const getFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Клиент не найден</h2>
          <button
            onClick={() => navigate('/clients')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Вернуться к списку клиентов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/clients')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
              Файлы клиента {client.name}
            </h1>
          </div>

          {/* Загрузка файлов */}
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 cursor-pointer
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg mb-2">
                  {isDragActive
                    ? 'Перетащите файлы сюда...'
                    : 'Перетащите файлы сюда или нажмите для выбора'}
                </p>
                <p className="text-sm text-gray-500">
                  Поддерживаются файлы любого типа (до 500MB)
                </p>
              </div>
            </div>

            {/* Список загружаемых файлов */}
            {uploadFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadFiles.map((file, index) => (
                  <div key={file.file.name + index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-4 text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Список файлов */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {files.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Нет файлов</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {files.map((file) => (
                    <div key={file.path} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {file.type.includes('image') ? (
                            <ImageIcon className="h-8 w-8 text-blue-500" />
                          ) : file.type.includes('pdf') ? (
                            <FileText className="h-8 w-8 text-red-500" />
                          ) : (
                            <FileArchive className="h-8 w-8 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-4">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleWhatsAppShare(file)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                          title="Поделиться в WhatsApp"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
