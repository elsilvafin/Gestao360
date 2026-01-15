
export enum EntityType {
  FAMILY = 'FAMILY',
  MEI1 = 'MEI1',
  MEI2 = 'MEI2',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  INVESTMENT = 'INVESTMENT',
  TRANSFER = 'TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX',
  CASH = 'CASH',
  TRANSFER = 'TRANSFER', // For internal transfers
}

export interface Account {
  id: string;
  name: string;
  type: 'BANK' | 'CASH' | 'WALLET';
  balance: number;
  entityId: EntityType;
}

export interface Transaction {
  id: string;
  entityId: EntityType;
  type: TransactionType;
  value: number;
  category: string;
  subcategory: string;
  paymentMethod: string; 
  paymentMethodType: PaymentMethodType; 
  accountId?: string; // Linked account for Pix/Cash/Transfer Out
  targetAccountId?: string; // For Transfer In
  cardId?: string; // Linked card for Credit
  status: PaymentStatus;
  date: string; 
  referenceMonth: string; 
  description: string;
  installmentCurrent?: number;
  installmentTotal?: number;
}

export interface Client {
  id: string;
  entityId: EntityType; 
  name: string;
  recurringValue: number;
  fixedPayDay?: number; // Optional now, as non-recurring might not have it
  targetAccountId: string; // ID of the account receiving the money
  isRecurring: boolean;
  serviceDescription?: string; // Useful for non-recurring services
}

export interface RecurringExpense {
  id: string;
  name: string;
  value: number;
  dueDay: number;
  category: string;
  paymentMethodType: PaymentMethodType;
}

export interface Card {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  currentInvoice: number;
}

export interface Investment {
  id: string;
  type: string;
  value: number;
  date: string;
  entityId: EntityType;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  timestamp: Date;
  read: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  WALLET = 'WALLET',
  TRANSACTIONS = 'TRANSACTIONS',
  CLIENTS = 'CLIENTS',
  FAMILY_MGT = 'FAMILY_MGT',
}
