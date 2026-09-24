export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 
  | 'bank_transfer' 
  | 'upi' 
  | 'cash' 
  | 'credit_card' 
  | 'debit_card' 
  | 'paypal' 
  | 'crypto' 
  | 'other';

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  createdAt?: string;
}

export type CommittedStatus = 'pending' | 'received' | 'cancelled';

export interface CommittedIncomeRecord {
  id: string;
  clientName: string;
  projectTitle: string;
  amount: number;
  dueDate: string;
  status: CommittedStatus;
  notes?: string;
  receivedDate?: string;
  createdAt?: string;
}

export type LentStatus = 'pending' | 'partially_paid' | 'repaid';

export interface MoneyLentRecord {
  id: string;
  borrowerName: string;
  amount: number;
  dateLent: string;
  expectedReturnDate?: string;
  repaidAmount: number;
  status: LentStatus;
  notes?: string;
  createdAt?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalCommittedIncome: number;
  totalMoneyLentOutstanding: number;
  projectedWealth: number;
  pendingCommittedCount: number;
  outstandingLentCount: number;
}
