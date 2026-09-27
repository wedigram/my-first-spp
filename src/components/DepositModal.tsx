import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  PlusCircle, 
  Zap, 
  AlertCircle, 
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, Transaction } from '../types';
import { formatKsh, normalizeKenyanPhone, generateMpesaCode, generateOfficialMpesaSms } from '../utils/mpesa';
import { sound } from '../utils/audio';
import { triggerLiveStkPush } from '../utils/darajaClient';

interface DepositModalProps {
  isOpen: boolean;
  account: UserAccount;
  initialAmount?: number;
  onClose: () => void;
  onDepositSuccess: (transaction: Transaction, smsText: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  account,
  initialAmount,
  onClose,
  onDepositSuccess,
}) => {
  const [depositPhone, setDepositPhone] = useState<string>(account.mpesaPhoneNumber);
  const [amount, setAmount] = useState<string>('');
  const [isStkPromptOpen, setIsStkPromptOpen] = useState<boolean>(false);
  const [stkPin, setStkPin] = useState<string>('');
  const [stkError, setStkError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string>('');
  const [stkMode, setStkMode] = useState<string>('');
  const [isRequestingPush, setIsRequestingPush] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDepositPhone(account.mpesaPhoneNumber);
    if (isOpen && initialAmount !== undefined && initialAmount > 0) {
      setAmount(initialAmount.toString());
    }
  }, [account.mpesaPhoneNumber, isOpen, initialAmount]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amount) || 0;
  const phoneInfo = normalizeKenyanPhone(depositPhone);

  const handleQuickAmount = (val: number) => {
    sound.playClick();
    setAmount(val.toString());
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numericAmount < 1) {
      setErrorMessage('Minimum live deposit amount is Ksh 1.00.');
      sound.playError();
      return;
    }

    if (!phoneInfo.isValid) {
      setErrorMessage('Please enter a valid Kenyan M-Pesa phone number.');
      sound.playError();
      return;
    }

    setIsRequestingPush(true);
    try {
      const stkRes = await triggerLiveStkPush({
        phoneNumber: phoneInfo.clean,
        amount: numericAmount,
        config: account.darajaConfig,
        accountReference: account.fullName.replace(/\s+/g, '').slice(0, 12) || 'PesaFast',
        transactionDesc: 'Live Wallet Topup',
      });

      setIsRequestingPush(false);
      if (!stkRes.ok) {
        setErrorMessage(stkRes.error || 'Safaricom Daraja STK Push failed.');
        sound.playError();
        return;
      }

      setCheckoutId(stkRes.CheckoutRequestID || `ws_CO_${Date.now()}`);
      setStkMode(stkRes.mode || 'express_gateway');
      sound.playNotification();
      setStkPin('');
      setStkError(null);
      setIsStkPromptOpen(true);
    } catch (err) {
      setIsRequestingPush(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reach live STK Push gateway.');
      sound.playError();
    }
  };

  const handleCompleteStk = () => {
    setStkError(null);
    if (stkPin.trim() !== account.pin) {
      setStkError('Invalid M-PESA PIN. Please enter your 4-digit security PIN.');
      sound.playError();
      return;
    }

    setIsProcessing(true);
    sound.playClick();

    setTimeout(() => {
      setIsProcessing(false);
      setIsStkPromptOpen(false);

      const txCode = generateMpesaCode();
      const timestamp = new Date().toISOString();
      const prevBal = account.balance;
      const newBal = prevBal + numericAmount;

      const officialSms = generateOfficialMpesaSms({
        code: txCode,
        type: 'deposit',
        amount: numericAmount,
        fee: 0,
        recipientName: 'PesaFast Live Wallet Top-up',
        recipientPhoneOrAccount: phoneInfo.display,
        newBalance: newBal,
        timestamp,
      });

      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        code: txCode,
        type: 'deposit',
        amount: numericAmount,
        fee: 0,
        recipientName: 'M-PESA Express STK Top-up',
        recipientPhoneOrAccount: phoneInfo.display,
        timestamp,
        status: 'completed',
        notes: `Lipa Na M-PESA Online (${checkoutId})`,
        previousBalance: prevBal,
        newBalance: newBal,
        category: 'deposit',
        method: 'stk_push',
      };

      try {
        confetti({
          particleCount: 75,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#059669', '#38bdf8'],
        });
      } catch {
        // ignore
      }

      sound.playSuccess();
      onDepositSuccess(newTx, officialSms);
      onClose();
    }, 600);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0A0A0B]/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8 text-[#E4E4E7]"
        >
          <button
            id="btn-close-deposit-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shadow-md border border-[#10B981]/25">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Live M-PESA Deposit / STK Push</h3>
              <p className="text-xs text-[#71717A]">
                Direct Lipa Na M-PESA Express prompt to your Safaricom line
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiate} className="space-y-4">
            {/* Connected Phone / Prompt Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                M-PESA Phone Number for STK Push
              </label>
              <div className="relative">
                <input
                  id="input-deposit-phone"
                  type="text"
                  placeholder="e.g. 0712345678"
                  value={depositPhone}
                  onChange={e => setDepositPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                />
                {depositPhone === account.mpesaPhoneNumber && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981]">
                    Linked SIM
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA]">
                  Deposit Amount (KES)
                </label>
                <span className="text-[11px] text-[#71717A] font-mono">
                  Fee: <strong className="text-[#10B981]">Ksh 0.00 (FREE)</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#71717A] text-sm">
                  Ksh
                </span>
                <input
                  id="input-deposit-amount"
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-13 pr-4 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono font-bold text-base focus:outline-none focus:border-[#10B981] transition-colors"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 mt-2">
                {[500, 1000, 2000, 5000, 10000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] hover:text-white text-xs font-mono transition-colors cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Callout */}
            <div className="p-3.5 rounded-2xl bg-[#111113] border border-[#27272A] flex items-start gap-2.5 text-xs text-[#A1A1AA]">
              <Zap className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Live Daraja Express STK Push:</p>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  Initiates an authenticated STK Push request through the `/api/daraja/stkpush` gateway to <span className="text-white font-mono">{phoneInfo.display}</span> and credits your cloud-synced balance immediately upon PIN verification.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              id="btn-request-stk-push"
              type="submit"
              disabled={isRequestingPush}
              className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-sm shadow-lg shadow-[#10B981]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isRequestingPush ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Live STK Push...</span>
                </>
              ) : (
                <>
                  <span>Send Live STK Push Prompt</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Live STK Push Authorization Prompt */}
      <AnimatePresence>
        {isStkPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-sm bg-[#18181B] border-2 border-[#10B981]/70 rounded-3xl p-6 shadow-2xl relative text-white font-mono"
            >
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] text-xs font-bold mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SAFARICOM SIM TOOLKIT • LIVE</span>
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Lipa Na M-PESA Online
                </h4>
                <p className="text-[10px] text-[#71717A] mt-0.5 truncate">
                  Ref: {checkoutId}
                </p>
              </div>

              <div className="bg-[#111113] p-4 rounded-2xl border border-[#27272A] mb-4 text-xs space-y-2">
                <p className="text-[#A1A1AA]">
                  Authorize payment of <strong className="text-[#10B981] font-bold">{formatKsh(numericAmount)}</strong> to <strong className="text-white">PesaFast Live Wallet</strong> (Shortcode: {account.darajaConfig.shortCode || '174379'})?
                </p>
                <p className="text-[#71717A] text-[11px]">
                  Line: {phoneInfo.display} • Mode: {stkMode === 'daraja_remote' ? 'Daraja Remote SIM Push' : 'Live Express Gateway'}
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                  Enter Your 4-Digit M-PESA PIN:
                </label>
                <input
                  id="input-stk-pin-field"
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  autoFocus
                  value={stkPin}
                  onChange={e => {
                    setStkPin(e.target.value);
                    setStkError(null);
                  }}
                  className="w-full text-center tracking-[0.5em] text-xl font-bold py-2.5 rounded-xl bg-[#111113] border border-[#10B981]/50 text-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                {stkError && (
                  <p className="text-[11px] text-center text-rose-400 mt-1.5">
                    {stkError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsStkPromptOpen(false)}
                  disabled={isProcessing}
                  className="py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-stk-confirm-button"
                  type="button"
                  onClick={handleCompleteStk}
                  disabled={isProcessing}
                  className="py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#10B981]/30"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Settling...</span>
                    </>
                  ) : (
                    <span>Confirm & Pay</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
