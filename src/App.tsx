import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Header } from './components/Header';
import { BalanceCard } from './components/BalanceCard';
import { TransactionList } from './components/TransactionList';
import { SendMoneyModal } from './components/SendMoneyModal';
import { WithdrawModal } from './components/WithdrawModal';
import { DepositModal } from './components/DepositModal';
import { EditBalanceModal } from './components/EditBalanceModal';
import { EditAccountModal } from './components/EditAccountModal';
import { ReceiptModal } from './components/ReceiptModal';
import { NotificationCenter } from './components/NotificationCenter';
import { LiveSmsBanner } from './components/LiveSmsBanner';
import { DarajaApiDrawer } from './components/DarajaApiDrawer';
import { VoiceCommandWidget, VoiceCommandAction } from './components/VoiceCommandWidget';

import { 
  UserAccount, 
  Transaction, 
  NotificationItem, 
  NotificationSettings, 
  ContactItem,
  DarajaConfig
} from './types';
import { 
  getStoredAccount, 
  saveStoredAccount, 
  getStoredTransactions, 
  saveStoredTransactions, 
  getStoredNotifications, 
  saveStoredNotifications, 
  getStoredSettings, 
  saveStoredSettings, 
  getStoredContacts, 
  saveStoredContacts 
} from './utils/storage';
import { sound } from './utils/audio';
import { generateMpesaCode, generateOfficialMpesaSms } from './utils/mpesa';
import { triggerBrowserPushNotification } from './utils/darajaClient';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  signInWithGoogleLive,
  signOutLive,
  ensureCloudUserAccount,
  updateCloudBalance,
  updateCloudProfile,
  updateCloudDarajaConfig,
  createCloudTransaction,
  createCloudNotification,
  markCloudNotificationRead,
  deleteCloudNotification,
} from './firebase';
import { ShieldCheck, Sparkles, Cloud, CheckCircle2, Mic } from 'lucide-react';

export default function App() {
  // Primary State
  const [account, setAccount] = useState<UserAccount>(getStoredAccount);
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions);
  const [notifications, setNotifications] = useState<NotificationItem[]>(getStoredNotifications);
  const [settings, setSettings] = useState<NotificationSettings>(getStoredSettings);
  const [contacts, setContacts] = useState<ContactItem[]>(getStoredContacts);

  // Live Cloud Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isCloudProfileReady, setIsCloudProfileReady] = useState<boolean>(false);

  // Active Live SMS banner
  const [activeLiveSms, setActiveLiveSms] = useState<NotificationItem | null>(null);

  // Selected Transaction for Official Receipt Modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Modals Visibility
  const [isSendOpen, setIsSendOpen] = useState<boolean>(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState<boolean>(false);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState<boolean>(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isDarajaDrawerOpen, setIsDarajaDrawerOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [highlightBalance, setHighlightBalance] = useState<boolean>(false);
  const [voicePrefill, setVoicePrefill] = useState<{
    amount?: number;
    recipientPhone?: string;
    recipientName?: string;
  }>({});

  // 1. Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsCloudProfileReady(false);
        try {
          const cloudAcc = await ensureCloudUserAccount(
            user.uid,
            getStoredAccount(),
            user.displayName,
            user.email
          );
          setAccount(cloudAcc);
          setIsCloudProfileReady(true);
        } catch (err) {
          console.error('Error initializing cloud account:', err);
        }
      } else {
        setIsCloudProfileReady(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Attach real-time Firestore onSnapshot listeners when authenticated & profile is ready
  useEffect(() => {
    if (!isAuthReady || !firebaseUser || !isCloudProfileReady) return;

    const uid = firebaseUser.uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const userPath = `users/${uid}`;
    const txPath = `users/${uid}/transactions`;
    const notifPath = `users/${uid}/notifications`;

    // Real-time User Account Listener
    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setAccount((prev) => ({
          ...prev,
          id: uid,
          fullName: String(d.fullName || prev.fullName),
          mpesaPhoneNumber: String(d.mpesaPhoneNumber || prev.mpesaPhoneNumber),
          nationalId: String(d.nationalId || prev.nationalId),
          email: String(d.email || prev.email),
          balance: Number(d.balance ?? prev.balance),
          pin: String(d.pin || prev.pin),
          accountTier:
            d.accountTier === 'Tier 1 (Ksh 300,000)'
              ? 'Tier 1 (Ksh 300,000)'
              : 'Tier 2 (Ksh 500,000)',
          dailyLimit: Number(d.dailyLimit ?? prev.dailyLimit),
          dailySpent: Number(d.dailySpent ?? prev.dailySpent),
          darajaConfig: {
            ...prev.darajaConfig,
            useLiveDaraja: Boolean(d.useLiveDaraja ?? true),
            environment: d.darajaEnvironment === 'production' ? 'production' : 'sandbox',
            shortCode: String(d.darajaShortCode || prev.darajaConfig.shortCode || '174379'),
            tillNumber: String(d.darajaTillNumber || prev.darajaConfig.tillNumber || '3049281'),
          },
        }));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    // Real-time Transactions Listener (constrained by ownerId == uid to satisfy Query Enforcer)
    const txQuery = query(
      collection(db, 'users', uid, 'transactions'),
      where('ownerId', '==', uid)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        if (snap.empty) return;
        const cloudTxs: Transaction[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              code: String(d.code || ''),
              type: d.type,
              amount: Number(d.amount || 0),
              fee: Number(d.fee || 0),
              recipientName: String(d.recipientName || ''),
              recipientPhoneOrAccount: String(d.recipientPhoneOrAccount || ''),
              timestamp: String(d.timestamp || new Date().toISOString()),
              status: d.status || 'completed',
              notes: d.notes ? String(d.notes) : undefined,
              previousBalance: Number(d.previousBalance || 0),
              newBalance: Number(d.newBalance || 0),
              category: d.category || 'transfer',
              method: d.method || 'mpesa_phone',
            };
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setTransactions(cloudTxs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, txPath);
      }
    );

    // Real-time Notifications Listener (constrained by ownerId == uid)
    const notifQuery = query(
      collection(db, 'users', uid, 'notifications'),
      where('ownerId', '==', uid)
    );
    const unsubNotif = onSnapshot(
      notifQuery,
      (snap) => {
        if (snap.empty) return;
        const cloudNotifs: NotificationItem[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              title: String(d.title || ''),
              message: String(d.message || ''),
              smsText: d.smsText ? String(d.smsText) : undefined,
              timestamp: String(d.timestamp || new Date().toISOString()),
              isRead: Boolean(d.isRead),
              type: d.type || 'sms',
              transactionId: d.transactionId ? String(d.transactionId) : undefined,
              priority: d.priority || 'high',
            };
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setNotifications(cloudNotifs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, notifPath);
      }
    );

    return () => {
      unsubUser();
      unsubTx();
      unsubNotif();
    };
  }, [isAuthReady, firebaseUser, isCloudProfileReady]);

  // Sync sound settings to audio engine
  useEffect(() => {
    sound.setMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Persist local cache
  useEffect(() => {
    saveStoredAccount(account);
  }, [account]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredContacts(contacts);
  }, [contacts]);

  // Auto-dismiss SMS banner after 7 seconds
  useEffect(() => {
    if (!activeLiveSms) return;
    const timer = setTimeout(() => {
      setActiveLiveSms(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeLiveSms]);

  // Google Sign-In / Sign-Out handlers
  const handleSignInGoogle = async () => {
    try {
      const cred = await signInWithGoogleLive();
      if (cred.user) {
        sound.playSuccess();
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await signOutLive();
    } catch (error) {
      console.error('Sign-Out error:', error);
    }
  };

  // Handler: Emit notification + Live SMS + Web Push Notification + Cloud Firestore sync
  const pushNotification = (
    title: string,
    message: string,
    smsText?: string,
    transactionId?: string
  ) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title,
      message,
      smsText,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: smsText ? 'sms' : 'system',
      transactionId,
      priority: 'high',
    };

    setNotifications((prev) => [newNotif, ...prev]);

    if (firebaseUser) {
      createCloudNotification(firebaseUser.uid, newNotif).catch(console.error);
    }

    if (settings.smsBannerPopup) {
      setActiveLiveSms(newNotif);
    }

    if (settings.transactionPush) {
      triggerBrowserPushNotification(title, smsText || message);
    }

    if (settings.soundEnabled) {
      sound.playNotification();
    }
  };

  // Handler: Successful Send Money
  const handleSendSuccess = (tx: Transaction, smsText: string) => {
    const newDailySpent = account.dailySpent + tx.amount + tx.fee;
    setAccount((prev) => ({
      ...prev,
      balance: tx.newBalance,
      dailySpent: newDailySpent,
    }));
    setTransactions((prev) => [tx, ...prev]);

    if (firebaseUser) {
      updateCloudBalance(firebaseUser.uid, tx.newBalance, newDailySpent).catch(console.error);
      createCloudTransaction(firebaseUser.uid, tx).catch(console.error);
    }

    pushNotification(
      'M-PESA Money Sent',
      `Sent Ksh ${tx.amount.toLocaleString()} to ${tx.recipientName}. Transaction cost: Ksh ${tx.fee}.`,
      smsText,
      tx.id
    );
  };

  // Handler: Successful Withdraw Money
  const handleWithdrawSuccess = (tx: Transaction, smsText: string) => {
    const newDailySpent = account.dailySpent + tx.amount + tx.fee;
    setAccount((prev) => ({
      ...prev,
      balance: tx.newBalance,
      dailySpent: newDailySpent,
    }));
    setTransactions((prev) => [tx, ...prev]);

    if (firebaseUser) {
      updateCloudBalance(firebaseUser.uid, tx.newBalance, newDailySpent).catch(console.error);
      createCloudTransaction(firebaseUser.uid, tx).catch(console.error);
    }

    pushNotification(
      'M-PESA Cashout / Withdrawal',
      `Withdrew Ksh ${tx.amount.toLocaleString()} from ${tx.recipientName}. Cost: Ksh ${tx.fee}.`,
      smsText,
      tx.id
    );
  };

  // Handler: Successful Deposit
  const handleDepositSuccess = (tx: Transaction, smsText: string) => {
    setAccount((prev) => ({
      ...prev,
      balance: tx.newBalance,
    }));
    setTransactions((prev) => [tx, ...prev]);

    if (firebaseUser) {
      updateCloudBalance(firebaseUser.uid, tx.newBalance, account.dailySpent).catch(console.error);
      createCloudTransaction(firebaseUser.uid, tx).catch(console.error);
    }

    pushNotification(
      'M-PESA Top-up Received',
      `Your account has been credited with Ksh ${tx.amount.toLocaleString()} via Live STK Push.`,
      smsText,
      tx.id
    );
  };

  // Handler: Balance Edited directly
  const handleBalanceUpdated = (newAccount: UserAccount, tx: Transaction, smsText: string) => {
    setAccount(newAccount);
    setTransactions((prev) => [tx, ...prev]);

    if (firebaseUser) {
      updateCloudBalance(firebaseUser.uid, newAccount.balance, newAccount.dailySpent).catch(console.error);
      createCloudTransaction(firebaseUser.uid, tx).catch(console.error);
    }

    pushNotification(
      'Balance Recalibrated',
      `Account balance updated to Ksh ${newAccount.balance.toLocaleString()}.`,
      smsText,
      tx.id
    );
  };

  // Handler: Account Details Edited
  const handleSaveAccount = (updatedAccount: UserAccount, notifMsg: string) => {
    setAccount(updatedAccount);
    if (firebaseUser) {
      updateCloudProfile(firebaseUser.uid, updatedAccount).catch(console.error);
    }
    pushNotification('Profile Updated', notifMsg);
  };

  // Handler: Daraja Config Saved
  const handleSaveDarajaConfig = (newConfig: DarajaConfig) => {
    setAccount((prev) => ({ ...prev, darajaConfig: newConfig }));
    if (firebaseUser) {
      updateCloudDarajaConfig(firebaseUser.uid, newConfig).catch(console.error);
    }
    pushNotification(
      'Daraja Gateway Saved',
      `Daraja gateway configured to ${newConfig.useLiveDaraja ? 'Live Safaricom Daraja API' : 'Express Instant Ledger'}.`
    );
  };

  // Live Incoming Payment / SMS Verification Trigger
  const handleTriggerTestNotification = () => {
    const txCode = generateMpesaCode();
    const incomingAmount = Math.floor(Math.random() * 4500) + 500;
    const newBal = account.balance + incomingAmount;

    const sms = generateOfficialMpesaSms({
      code: txCode,
      type: 'received',
      amount: incomingAmount,
      fee: 0,
      recipientName: 'KIPCHOGE KEINO',
      recipientPhoneOrAccount: '+254 799 443 322',
      newBalance: newBal,
      timestamp: new Date().toISOString(),
    });

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      code: txCode,
      type: 'received',
      amount: incomingAmount,
      fee: 0,
      recipientName: 'Kipchoge Keino',
      recipientPhoneOrAccount: '+254 799 443 322',
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: 'Incoming M-PESA C2B Payment Settlement',
      previousBalance: account.balance,
      newBalance: newBal,
      category: 'transfer',
      method: 'mpesa_phone',
    };

    setAccount((prev) => ({ ...prev, balance: newBal }));
    setTransactions((prev) => [tx, ...prev]);

    if (firebaseUser) {
      updateCloudBalance(firebaseUser.uid, newBal, account.dailySpent).catch(console.error);
      createCloudTransaction(firebaseUser.uid, tx).catch(console.error);
    }

    pushNotification(
      'M-PESA Money Received',
      `You received Ksh ${incomingAmount.toLocaleString()} from Kipchoge Keino.`,
      sms,
      tx.id
    );
  };

  // Notification Settings toggle
  const handleToggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Mark all notifications read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (firebaseUser) {
      notifications.forEach((n) => {
        if (!n.isRead) {
          markCloudNotificationRead(firebaseUser.uid, n.id).catch(console.error);
        }
      });
    }
  };

  // Clear all notifications
  const handleClearAll = () => {
    const current = [...notifications];
    setNotifications([]);
    if (firebaseUser) {
      current.forEach((n) => {
        deleteCloudNotification(firebaseUser.uid, n.id).catch(console.error);
      });
    }
  };

  // Open receipt by transaction ID
  const handleViewReceiptById = (transactionId?: string) => {
    if (!transactionId) return;
    const target = transactions.find((t) => t.id === transactionId);
    if (target) {
      setSelectedTx(target);
    }
  };

  // Handle Browser SpeechRecognition Voice Commands
  const handleExecuteVoiceCommand = (action: VoiceCommandAction) => {
    setVoicePrefill({
      amount: action.amount,
      recipientPhone: action.recipientPhone,
      recipientName: action.recipientName,
    });

    switch (action.intent) {
      case 'send_money':
        setIsSendOpen(true);
        break;
      case 'check_balance':
        setHighlightBalance(true);
        setTimeout(() => setHighlightBalance(false), 4000);
        pushNotification(
          'M-PESA Balance Checked via Voice',
          `Your current live M-PESA balance is Ksh ${account.balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`
        );
        break;
      case 'withdraw_money':
        setIsWithdrawOpen(true);
        break;
      case 'deposit_money':
        setIsDepositOpen(true);
        break;
      case 'edit_balance':
        setIsEditBalanceOpen(true);
        break;
      case 'edit_account':
        setIsEditAccountOpen(true);
        break;
      case 'open_notifications':
        setIsNotificationsOpen(true);
        break;
      case 'open_daraja':
        setIsDarajaDrawerOpen(true);
        break;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col selection:bg-[#10B981] selection:text-[#0A0A0B]">
      {/* Live Floating Safaricom SMS Banner */}
      <LiveSmsBanner
        notification={activeLiveSms}
        onDismiss={() => setActiveLiveSms(null)}
        onViewReceipt={handleViewReceiptById}
      />

      {/* Top Navigation */}
      <Header
        account={account}
        unreadCount={unreadCount}
        settings={settings}
        isCloudAuthenticated={Boolean(firebaseUser)}
        isAuthLoading={!isAuthReady}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        onToggleSound={() => handleToggleSetting('soundEnabled')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAccountModal={() => setIsEditAccountOpen(true)}
        onOpenDarajaDrawer={() => setIsDarajaDrawerOpen(true)}
        onOpenVoiceCommand={() => setIsVoiceOpen(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Network & Live Cloud Verification Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#111113] border border-[#27272A] text-xs">
          <div className="flex items-center gap-2 text-[#10B981]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="font-semibold text-white">Live M-PESA Node:</span>
            <span className="text-[#A1A1AA] font-mono">
              Safaricom Daraja v2.0 ({account.darajaConfig.environment.toUpperCase()}) • {firebaseUser ? `Cloud Synced (${firebaseUser.email})` : 'Express Local + Cloud Ready'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerTestNotification}
              className="text-[#10B981] hover:text-[#34D399] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Trigger an instant incoming C2B M-PESA payment with live SMS & receipt"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Receive Instant Payment</span>
            </button>

            <span className="text-[#3F3F46] hidden sm:inline">|</span>

            <span className="text-[#71717A] flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              {firebaseUser ? 'Firestore Zero-Trust Protected' : '256-Bit Encrypted'}
            </span>
          </div>
        </div>

        {/* Master Balance Card */}
        <BalanceCard
          account={account}
          transactions={transactions}
          highlightBalance={highlightBalance}
          onOpenSendModal={() => {
            setVoicePrefill({});
            setIsSendOpen(true);
          }}
          onOpenWithdrawModal={() => {
            setVoicePrefill({});
            setIsWithdrawOpen(true);
          }}
          onOpenDepositModal={() => {
            setVoicePrefill({});
            setIsDepositOpen(true);
          }}
          onOpenEditBalanceModal={() => setIsEditBalanceOpen(true)}
          onOpenEditAccountModal={() => setIsEditAccountOpen(true)}
          onOpenVoiceCommand={() => setIsVoiceOpen(true)}
        />

        {/* Transaction History & Official Ledger */}
        <TransactionList
          transactions={transactions}
          onSelectTransaction={(tx) => setSelectedTx(tx)}
          onOpenSendModal={() => {
            setVoicePrefill({});
            setIsSendOpen(true);
          }}
          onOpenDepositModal={() => {
            setVoicePrefill({});
            setIsDepositOpen(true);
          }}
        />
      </main>

      {/* Floating Voice Assistant Quick Action Button */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center justify-center">
        {/* Subtle expanding ripple ring */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[#10B981]/30 animate-mic-ripple"
        />
        {/* Soft ambient breathing halo */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 rounded-full bg-[#10B981]/20 blur-md animate-pulse"
        />
        <button
          id="btn-floating-voice-mic"
          onClick={() => {
            sound.playClick();
            setIsVoiceOpen(true);
          }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#059669] via-[#10B981] to-[#34D399] hover:from-[#10B981] hover:to-[#6EE7B7] text-[#0A0A0B] animate-mic-glow flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-[#34D399]/40 group"
          title="Voice Commands: Say 'Send money' or 'Check balance'"
        >
          <Mic className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
        </button>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#27272A] bg-[#0A0A0B]/80 py-5 px-4 text-center text-xs text-[#71717A]">
        <p className="flex items-center justify-center gap-2">
          <span className="text-[#A1A1AA] font-medium">PesaFast M-PESA Live Connected Wallet</span>
          <span>•</span>
          <span>Real-Time Cloud Firestore Ledger & Safaricom Daraja v2.0 Gateway</span>
        </p>
      </footer>

      {/* Modals & Drawers */}
      <SendMoneyModal
        isOpen={isSendOpen}
        account={account}
        contacts={contacts}
        initialAmount={voicePrefill.amount}
        initialRecipientPhone={voicePrefill.recipientPhone}
        initialRecipientName={voicePrefill.recipientName}
        onClose={() => setIsSendOpen(false)}
        onSendSuccess={handleSendSuccess}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        account={account}
        initialAmount={voicePrefill.amount}
        onClose={() => setIsWithdrawOpen(false)}
        onWithdrawSuccess={handleWithdrawSuccess}
      />

      <DepositModal
        isOpen={isDepositOpen}
        account={account}
        initialAmount={voicePrefill.amount}
        onClose={() => setIsDepositOpen(false)}
        onDepositSuccess={handleDepositSuccess}
      />

      <EditBalanceModal
        isOpen={isEditBalanceOpen}
        account={account}
        onClose={() => setIsEditBalanceOpen(false)}
        onBalanceUpdated={handleBalanceUpdated}
      />

      <EditAccountModal
        isOpen={isEditAccountOpen}
        account={account}
        onClose={() => setIsEditAccountOpen(false)}
        onSaveAccount={handleSaveAccount}
      />

      <ReceiptModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />

      <NotificationCenter
        isOpen={isNotificationsOpen}
        notifications={notifications}
        settings={settings}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAll}
        onToggleSetting={handleToggleSetting}
        onTriggerTestNotification={handleTriggerTestNotification}
        onViewReceipt={handleViewReceiptById}
      />

      <DarajaApiDrawer
        isOpen={isDarajaDrawerOpen}
        account={account}
        onClose={() => setIsDarajaDrawerOpen(false)}
        onSaveDarajaConfig={handleSaveDarajaConfig}
      />

      <VoiceCommandWidget
        isOpen={isVoiceOpen}
        account={account}
        contacts={contacts}
        soundEnabled={settings.soundEnabled}
        onClose={() => setIsVoiceOpen(false)}
        onExecuteCommand={handleExecuteVoiceCommand}
      />
    </div>
  );
}
