import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserAccount, Transaction, NotificationItem, DarajaConfig } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogleLive() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutLive() {
  return signOut(auth);
}

// Defensive payload sanitizers matching firebase-blueprint.json & firestore.rules
function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function sanitizePhone(raw: string): string {
  const cleaned = raw.replace(/[^0-9+\-\s]/g, '').trim().slice(0, 20);
  return cleaned.length >= 9 ? cleaned : '254712345678';
}

function sanitizePin(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length === 4 ? digits : '1234';
}

export async function ensureCloudUserAccount(
  uid: string,
  localFallback: UserAccount,
  displayName?: string | null,
  email?: string | null
): Promise<UserAccount> {
  const safeUid = sanitizeId(uid);
  const userPath = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: safeUid,
        fullName: String(data.fullName || localFallback.fullName),
        mpesaPhoneNumber: String(data.mpesaPhoneNumber || localFallback.mpesaPhoneNumber),
        nationalId: String(data.nationalId || localFallback.nationalId),
        email: String(data.email || localFallback.email),
        balance: Number(data.balance ?? localFallback.balance),
        currency: 'KES',
        isVerified: Boolean(data.isVerified ?? true),
        pin: sanitizePin(String(data.pin || localFallback.pin)),
        accountTier:
          data.accountTier === 'Tier 1 (Ksh 300,000)'
            ? 'Tier 1 (Ksh 300,000)'
            : 'Tier 2 (Ksh 500,000)',
        dailyLimit: Number(data.dailyLimit ?? localFallback.dailyLimit),
        dailySpent: Number(data.dailySpent ?? localFallback.dailySpent),
        createdAt: localFallback.createdAt,
        darajaConfig: {
          ...localFallback.darajaConfig,
          useLiveDaraja: Boolean(data.useLiveDaraja ?? true),
          environment: data.darajaEnvironment === 'production' ? 'production' : 'sandbox',
          shortCode: String(data.darajaShortCode || localFallback.darajaConfig.shortCode || '174379'),
          tillNumber: String(data.darajaTillNumber || localFallback.darajaConfig.tillNumber || '3049281'),
        },
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  // Create initial cloud profile
  const normalizedTier =
    localFallback.accountTier === 'Tier 1 (Ksh 300,000)'
      ? 'Tier 1 (Ksh 300,000)'
      : 'Tier 2 (Ksh 500,000)';
  const normalizedEnv =
    localFallback.darajaConfig?.environment === 'production' ? 'production' : 'sandbox';

  const initialAccount: UserAccount = {
    ...localFallback,
    id: safeUid,
    fullName: (displayName || localFallback.fullName || 'M-PESA User').trim().slice(0, 100) || 'M-PESA User',
    email: (email || localFallback.email || 'user@example.com').trim().slice(0, 150) || 'user@example.com',
    mpesaPhoneNumber: sanitizePhone(localFallback.mpesaPhoneNumber || '254712345678'),
    nationalId: (localFallback.nationalId || '38492019').trim().slice(0, 30) || '38492019',
    pin: sanitizePin(localFallback.pin || '1234'),
    accountTier: normalizedTier,
    darajaConfig: {
      ...localFallback.darajaConfig,
      environment: normalizedEnv,
      useLiveDaraja: true,
    },
  };

  try {
    await setDoc(userRef, {
      ownerId: safeUid,
      fullName: initialAccount.fullName,
      mpesaPhoneNumber: initialAccount.mpesaPhoneNumber,
      nationalId: initialAccount.nationalId,
      email: initialAccount.email,
      balance: Math.max(0, Math.min(100000000, Number(initialAccount.balance) || 0)),
      currency: 'KES',
      isVerified: true,
      pin: initialAccount.pin,
      accountTier: initialAccount.accountTier,
      dailyLimit: Math.max(0, Math.min(10000000, Number(initialAccount.dailyLimit) || 500000)),
      dailySpent: Math.max(0, Math.min(100000000, Number(initialAccount.dailySpent) || 0)),
      useLiveDaraja: Boolean(initialAccount.darajaConfig.useLiveDaraja),
      darajaEnvironment: normalizedEnv,
      darajaShortCode: (initialAccount.darajaConfig.shortCode || '174379').slice(0, 20),
      darajaTillNumber: (initialAccount.darajaConfig.tillNumber || '3049281').slice(0, 20),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  return initialAccount;
}

// Action 1: Update Balance & Daily Spent in Cloud Firestore
export async function updateCloudBalance(
  uid: string,
  newBalance: number,
  newDailySpent: number
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      balance: Math.max(0, Math.min(100000000, Number(newBalance) || 0)),
      dailySpent: Math.max(0, Math.min(100000000, Number(newDailySpent) || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Action 2: Update Profile & M-PESA Account Details in Cloud Firestore
export async function updateCloudProfile(
  uid: string,
  account: UserAccount
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  const normalizedTier =
    account.accountTier === 'Tier 1 (Ksh 300,000)'
      ? 'Tier 1 (Ksh 300,000)'
      : 'Tier 2 (Ksh 500,000)';
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      fullName: (account.fullName || 'M-PESA User').trim().slice(0, 100) || 'M-PESA User',
      mpesaPhoneNumber: sanitizePhone(account.mpesaPhoneNumber || '254712345678'),
      nationalId: (account.nationalId || '38492019').trim().slice(0, 30) || '38492019',
      email: (account.email || 'user@example.com').trim().slice(0, 150) || 'user@example.com',
      pin: sanitizePin(account.pin || '1234'),
      accountTier: normalizedTier,
      dailyLimit: Math.max(0, Math.min(10000000, Number(account.dailyLimit) || 500000)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Action 3: Update Daraja Gateway Config in Cloud Firestore
export async function updateCloudDarajaConfig(
  uid: string,
  config: DarajaConfig
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      useLiveDaraja: Boolean(config.useLiveDaraja),
      darajaEnvironment: config.environment === 'production' ? 'production' : 'sandbox',
      darajaShortCode: (config.shortCode || '174379').slice(0, 20),
      darajaTillNumber: (config.tillNumber || '3049281').slice(0, 20),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Create Immutable Ledger Transaction in Cloud Firestore
export async function createCloudTransaction(
  uid: string,
  tx: Transaction
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeTxId = sanitizeId(tx.id);
  const path = `users/${safeUid}/transactions/${safeTxId}`;
  const cleanedCode = (tx.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  const safeCode = cleanedCode.length >= 6 ? cleanedCode : 'QA99LIVE01';
  try {
    await setDoc(doc(collection(db, 'users', safeUid, 'transactions'), safeTxId), {
      ownerId: safeUid,
      code: safeCode,
      type: tx.type,
      amount: Math.max(0, Math.min(100000000, Number(tx.amount) || 0)),
      fee: Math.max(0, Math.min(1000000, Number(tx.fee) || 0)),
      recipientName: (tx.recipientName || 'Recipient').trim().slice(0, 120) || 'Recipient',
      recipientPhoneOrAccount: (tx.recipientPhoneOrAccount || 'Account').trim().slice(0, 120) || 'Account',
      timestamp: (tx.timestamp || new Date().toISOString()).slice(0, 40),
      status: tx.status,
      notes: (tx.notes || '').slice(0, 300),
      previousBalance: Math.max(0, Math.min(100000000, Number(tx.previousBalance) || 0)),
      newBalance: Math.max(0, Math.min(100000000, Number(tx.newBalance) || 0)),
      category: tx.category,
      method: tx.method,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Create Notification in Cloud Firestore
export async function createCloudNotification(
  uid: string,
  notif: NotificationItem
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeNotifId = sanitizeId(notif.id);
  const path = `users/${safeUid}/notifications/${safeNotifId}`;
  try {
    await setDoc(doc(collection(db, 'users', safeUid, 'notifications'), safeNotifId), {
      ownerId: safeUid,
      title: (notif.title || 'Notification').slice(0, 120),
      message: (notif.message || 'Alert').slice(0, 500),
      smsText: (notif.smsText || '').slice(0, 600),
      timestamp: (notif.timestamp || new Date().toISOString()).slice(0, 40),
      isRead: Boolean(notif.isRead),
      type: notif.type,
      transactionId: (notif.transactionId || '').slice(0, 128),
      priority: notif.priority || 'high',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markCloudNotificationRead(
  uid: string,
  notifId: string
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeNotifId = sanitizeId(notifId);
  const path = `users/${safeUid}/notifications/${safeNotifId}`;
  try {
    await updateDoc(doc(db, 'users', safeUid, 'notifications', safeNotifId), {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudNotification(
  uid: string,
  notifId: string
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeNotifId = sanitizeId(notifId);
  const path = `users/${safeUid}/notifications/${safeNotifId}`;
  try {
    await deleteDoc(doc(db, 'users', safeUid, 'notifications', safeNotifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
