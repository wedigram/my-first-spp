import { UserAccount, Transaction, NotificationItem, NotificationSettings, ContactItem } from '../types';
import { generateMpesaCode, generateOfficialMpesaSms, DEFAULT_CONTACTS } from './mpesa';

const STORAGE_KEYS = {
  ACCOUNT: 'pesafast_account_v1',
  TRANSACTIONS: 'pesafast_transactions_v1',
  NOTIFICATIONS: 'pesafast_notifications_v1',
  SETTINGS: 'pesafast_settings_v1',
  CONTACTS: 'pesafast_contacts_v1',
};

export const DEFAULT_ACCOUNT: UserAccount = {
  id: 'usr_pesafast_7701',
  fullName: 'Dennis Mutua',
  mpesaPhoneNumber: '254712345678',
  nationalId: '38492019',
  email: 'dennis.mutua@gmail.com',
  balance: 48500.00,
  currency: 'KES',
  isVerified: true,
  pin: '1234',
  accountTier: 'Tier 2 (Ksh 500,000)',
  dailyLimit: 500000,
  dailySpent: 14500,
  createdAt: '2025-01-10T08:00:00.000Z',
  darajaConfig: {
    useLiveDaraja: true,
    consumerKey: '',
    consumerSecret: '',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    shortCode: '174379',
    tillNumber: '3049281',
    environment: 'sandbox',
  },
};

export const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  smsBannerPopup: true,
  lowBalanceAlert: true,
  transactionPush: true,
  marketingAlerts: false,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_init_1',
    code: 'QA84NX9910',
    type: 'received',
    amount: 15000.00,
    fee: 0,
    recipientName: 'Kipchoge Keino',
    recipientPhoneOrAccount: '+254 799 443 322',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    status: 'completed',
    previousBalance: 33500.00,
    newBalance: 48500.00,
    category: 'transfer',
    method: 'mpesa_phone',
    notes: 'Freelance design project payment',
  },
  {
    id: 'tx_init_2',
    code: 'QA72MK4120',
    type: 'send',
    amount: 3500.00,
    fee: 35.00,
    recipientName: 'Purity Wanjiku',
    recipientPhoneOrAccount: '+254 722 123 456',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    status: 'completed',
    previousBalance: 37035.00,
    newBalance: 33500.00,
    category: 'transfer',
    method: 'mpesa_phone',
    notes: 'Weekend shopping stipend',
  },
  {
    id: 'tx_init_3',
    code: 'QA60OP7821',
    type: 'paybill',
    amount: 2450.00,
    fee: 23.00,
    recipientName: 'Kenya Power (KPLC Prepaid)',
    recipientPhoneOrAccount: 'Acc: 3719402948',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    status: 'completed',
    previousBalance: 39508.00,
    newBalance: 37035.00,
    category: 'utility',
    method: 'paybill',
    notes: 'Electricity Token Purchase (Token: 8492-3049-1194)',
  },
  {
    id: 'tx_init_4',
    code: 'QA49JH2311',
    type: 'deposit',
    amount: 20000.00,
    fee: 0,
    recipientName: 'M-PESA STK Push Top-up',
    recipientPhoneOrAccount: '+254 712 345 678',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    status: 'completed',
    previousBalance: 19508.00,
    newBalance: 39508.00,
    category: 'deposit',
    method: 'stk_push',
    notes: 'Direct M-Pesa Express Top-up',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'M-PESA Money Received',
    message: 'You received Ksh 15,000.00 from Kipchoge Keino (+254 799 443 322).',
    smsText: generateOfficialMpesaSms({
      code: 'QA84NX9910',
      type: 'received',
      amount: 15000,
      fee: 0,
      recipientName: 'Kipchoge Keino',
      recipientPhoneOrAccount: '+254 799 443 322',
      newBalance: 48500,
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: false,
    type: 'sms',
    transactionId: 'tx_init_1',
    priority: 'high',
  },
  {
    id: 'notif_2',
    title: 'M-PESA Money Sent',
    message: 'Ksh 3,500.00 sent to Purity Wanjiku (+254 722 123 456). Fee: Ksh 35.00',
    smsText: generateOfficialMpesaSms({
      code: 'QA72MK4120',
      type: 'send',
      amount: 3500,
      fee: 35,
      recipientName: 'Purity Wanjiku',
      recipientPhoneOrAccount: '+254 722 123 456',
      newBalance: 33500,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isRead: true,
    type: 'sms',
    transactionId: 'tx_init_2',
  },
  {
    id: 'notif_3',
    title: 'M-PESA Account Connected',
    message: 'Your phone +254 712 345 678 is active and verified for instant STK Push and B2C withdrawals.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    isRead: true,
    type: 'security',
  },
];

// Helper get / set functions
export function getStoredAccount(): UserAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
    if (!raw) return DEFAULT_ACCOUNT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ACCOUNT, ...parsed };
  } catch {
    return DEFAULT_ACCOUNT;
  }
}

export function saveStoredAccount(account: UserAccount): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
  } catch (e) {
    console.error('Failed to save account:', e);
  }
}

export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return INITIAL_TRANSACTIONS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveStoredTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions:', e);
  }
}

export function getStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) return INITIAL_NOTIFICATIONS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifications: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export function getStoredSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getStoredContacts(): ContactItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (!raw) return DEFAULT_CONTACTS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONTACTS;
  }
}

export function saveStoredContacts(contacts: ContactItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save contacts:', e);
  }
}
