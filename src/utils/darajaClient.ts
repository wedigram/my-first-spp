import { DarajaConfig } from '../types';

export interface DarajaOAuthResponse {
  ok: boolean;
  liveDaraja: boolean;
  environment?: string;
  access_token?: string;
  expires_in?: string;
  error?: string;
  timestamp?: string;
}

export interface DarajaStkPushResponse {
  ok: boolean;
  mode?: 'daraja_remote' | 'express_gateway';
  CheckoutRequestID?: string;
  MerchantRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  error?: string;
  timestamp?: string;
}

export interface DarajaB2CResponse {
  ok: boolean;
  mode?: 'daraja_remote' | 'express_gateway';
  ConversationID?: string;
  OriginatorConversationID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  error?: string;
  timestamp?: string;
}

export async function testDarajaOAuth(config: DarajaConfig): Promise<DarajaOAuthResponse> {
  const res = await fetch('/api/daraja/oauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      environment: config.environment,
    }),
  });
  return res.json();
}

export async function triggerLiveStkPush(params: {
  phoneNumber: string;
  amount: number;
  config: DarajaConfig;
  accountReference?: string;
  transactionDesc?: string;
}): Promise<DarajaStkPushResponse> {
  const res = await fetch('/api/daraja/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: params.phoneNumber,
      amount: params.amount,
      shortCode: params.config.shortCode,
      passkey: params.config.passkey,
      consumerKey: params.config.consumerKey,
      consumerSecret: params.config.consumerSecret,
      environment: params.config.environment,
      accountReference: params.accountReference || 'PesaFastWallet',
      transactionDesc: params.transactionDesc || 'Live M-PESA STK Push Deposit',
    }),
  });
  return res.json();
}

export async function triggerLiveB2CPayout(params: {
  phoneNumber: string;
  amount: number;
  remarks: string;
  config: DarajaConfig;
}): Promise<DarajaB2CResponse> {
  const res = await fetch('/api/daraja/b2c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: params.phoneNumber,
      amount: params.amount,
      remarks: params.remarks,
      shortCode: params.config.shortCode,
      consumerKey: params.config.consumerKey,
      consumerSecret: params.config.consumerSecret,
      environment: params.config.environment,
    }),
  });
  return res.json();
}

export async function triggerBrowserPushNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(title, { body });
      }
    }
  } catch {
    // Ignore browser notification restrictions inside sandboxed iframes
  }
}
