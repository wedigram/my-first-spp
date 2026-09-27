export type TransactionType = 'send' | 'withdraw' | 'deposit' | 'received' | 'paybill' | 'buy_goods' | 'balance_adjustment';

export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  code: string; // e.g. QA92KL881J
  type: TransactionType;
  amount: number;
  fee: number;
  recipientName: string;
  recipientPhoneOrAccount: string;
  timestamp: string; // ISO string
  status: TransactionStatus;
  notes?: string;
  previousBalance: number;
  newBalance: number;
  category: 'transfer' | 'withdrawal' | 'deposit' | 'merchant' | 'utility' | 'system';
  method: 'mpesa_phone' | 'till' | 'paybill' | 'agent' | 'atm' | 'stk_push' | 'manual_edit';
}

export interface UserAccount {
  id: string;
  fullName: string;
  mpesaPhoneNumber: string; // e.g. "254712345678"
  nationalId: string;
  email: string;
  balance: number;
  currency: string;
  isVerified: boolean;
  pin: string; // 4-digit PIN e.g. "1234"
  accountTier: 'Tier 1 (Ksh 300,000)' | 'Tier 2 (Ksh 500,000)';
  dailyLimit: number;
  dailySpent: number;
  createdAt: string;
  darajaConfig: DarajaConfig;
}

export interface DarajaConfig {
  useLiveDaraja: boolean;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortCode: string;
  tillNumber: string;
  environment: 'sandbox' | 'production';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  smsText?: string;
  timestamp: string;
  isRead: boolean;
  type: 'sms' | 'transaction' | 'security' | 'system';
  transactionId?: string;
  priority?: 'high' | 'normal';
}

export interface NotificationSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  smsBannerPopup: boolean;
  lowBalanceAlert: boolean;
  transactionPush: boolean;
  marketingAlerts: boolean;
}

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  category?: 'favorite' | 'recent' | 'business';
  accountType?: 'mpesa' | 'till' | 'paybill';
}
