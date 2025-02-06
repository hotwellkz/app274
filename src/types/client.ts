export interface ClientFile {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  path: string;
}

export interface Client {
  id: string;
  clientNumber: string;
  firstName: string;
  objectName: string;
  year: number;
  status: 'building' | 'deposit' | 'built';
  createdAt?: any;
  updatedAt?: any;
  files?: Array<ClientFile>;
  // Optional fields
  lastName?: string;
  phone?: string;
  middleName?: string;
  email?: string;
  iin?: string;
  constructionAddress?: string;
  livingAddress?: string;
  constructionDays?: number;
  totalAmount?: number;
  deposit?: number;
  firstPayment?: number;
  secondPayment?: number;
  thirdPayment?: number;
  fourthPayment?: number;
}

export type NewClient = Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export const initialClientState: NewClient = {
  clientNumber: '',
  firstName: '',
  objectName: '',
  year: new Date().getFullYear(),
  status: 'deposit',
  // Optional fields initialized as empty
  lastName: '',
  phone: '',
  middleName: '',
  email: '',
  iin: '',
  constructionAddress: '',
  livingAddress: '',
  constructionDays: 0,
  totalAmount: 0,
  deposit: 0,
  firstPayment: 0,
  secondPayment: 0,
  thirdPayment: 0,
  fourthPayment: 0,
};