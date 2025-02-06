import { supabase } from './config';
import { showErrorNotification, showSuccessNotification } from '../../utils/notifications';

const BUCKET_NAME = 'transactions';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Функция для создания бакета, если он не существует
const ensureBucketExists = async () => {
  try {
    // Проверяем, существует ли бакет
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      // Создаем бакет, если он не существует
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_FILE_TYPES
      });

      if (error) {
        console.error('Error creating bucket:', error);
        throw error;
      }

      console.log('Bucket created successfully:', data);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
};

export const uploadFileToSupabase = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('Starting Supabase file upload:', { file, path });

    // Проверяем/создаем бакет перед загрузкой
    await ensureBucketExists();

    if (!file || !path) {
      const error = new Error('Файл и путь обязательны');
      console.error(error);
      showErrorNotification(error.message);
      throw error;
    }

    // Проверяем размер файла
    if (file.size > MAX_FILE_SIZE) {
      const error = new Error(`Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      console.error(error);
      showErrorNotification(error.message);
      throw error;
    }

    // Проверяем тип файла
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const error = new Error('Неподдерживаемый тип файла. Разрешены только изображения (JPG, PNG), PDF и документы Word');
      console.error(error);
      showErrorNotification(error.message);
      throw error;
    }

    // Загружаем файл в Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Supabase upload error:', error);
      showErrorNotification(`Ошибка при загрузке файла: ${error.message}`);
      throw error;
    }

    if (!data?.path) {
      throw new Error('Upload successful but no path returned');
    }

    // Получаем публичный URL файла
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('File uploaded successfully:', publicUrl);
    showSuccessNotification('Файл успешно загружен');

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    showErrorNotification(error instanceof Error ? error.message : 'Ошибка при загрузке файла');
    throw error;
  }
};

export const deleteFileFromSupabase = async (path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Supabase delete error:', error);
      showErrorNotification('Не удалось удалить файл');
      throw error;
    }

    showSuccessNotification('Файл успешно удален');
  } catch (error) {
    console.error('Error in deleteFileFromSupabase:', error);
    throw error;
  }
};
