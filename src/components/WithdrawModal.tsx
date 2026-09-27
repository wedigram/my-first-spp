import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  ArrowDownLeft, 
  Smartphone, 
  Store, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, Transaction } from '../types';
import { calculateMpesaFee, formatKsh, normalizeKenyanPhone, generateMpesaCode, generateOfficialMpesaSms } from '../utils/mpesa';
import { sound } from '../utils/audio';
import { PinModal } from './PinModal';
import { triggerLiveB2CPayout } from '../utils/darajaClient';

interface WithdrawModalProps {
  isOpen: boolean;
  account: UserAccount;
  initialAmount?: number;
  onClose: () => void;
  onWithdrawSuccess: (transaction: Transaction, smsText: string) => void;
}

type WithdrawMethod = 'linked_mpesa' | 'agent' | 'atm';

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  account,
  initialAmount,
  onClose,
  onWithdrawSuccess,
}) => {
  const [method, setMethod] = useState<WithdrawMethod>('linked_mpesa');
  const [amount, setAmount] = useState<string>('');
  const [agentNumber, setAgentNumber] = useState<string>('');
  const [storeNumber, setStoreNumber] = useState<string>('');
  const [atmBank, setAtmBank] = useState<string>('Equity ATM');
  const [isPinOpen, setIsPinOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialAmount !== undefined && initialAmount > 0) {
      setAmount(initialAmount.toString());
    }
  }, [isOpen, initialAmount]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amount) || 0;
  const calculatedFee = calculateMpesaFee(numericAmount, 'withdraw');
  const totalDeduction = numericAmount + calculatedFee;

  const phoneInfo = normalizeKenyanPhone(account.mpesaPhoneNumber);

  const handleQuickAmount = (val: number) => {
    sound.playClick();
    setAmount(val.toString());
  };

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numericAmount < 50) {
      setErrorMessage('Minimum withdrawal amount is Ksh 50.00.');
      sound.playError();
      return;
    }

    if (totalDeduction > account.balance) {
      setErrorMessage(`Insufficient balance. Withdrawal of ${formatKsh(numericAmount)} + fee of ${formatKsh(calculatedFee)} requires ${formatKsh(totalDeduction)}, but you have ${formatKsh(account.balance)}.`);
      sound.playError();
      return;
    }

    if (method === 'agent' && (!agentNumber.trim() || !storeNumber.trim())) {
      setErrorMessage('Please enter both Agent Till Number and Store Number.');
      sound.playError();
      return;
    }

    sound.playClick();
    setIsPinOpen(true);
  };

  const handlePinSuccess = () => {
    setIsPinOpen(false);

    const txCode = generateMpesaCode();
    const timestamp = new Date().toISOString();
    const prevBal = account.balance;
    const newBal = prevBal - totalDeduction;

    let recipientName = 'M-PESA Phone Cashout';
    let recipientPhoneOrAccount = phoneInfo.display;
    let txMethod: Transaction['method'] = 'mpesa_phone';

    if (method === 'linked_mpesa') {
      recipientName = `My M-PESA SIM (${account.fullName})`;
      recipientPhoneOrAccount = phoneInfo.display;
      txMethod = 'mpesa_phone';
    } else if (method === 'agent') {
      recipientName = `Agent #${agentNumber} (Store ${storeNumber})`;
      recipientPhoneOrAccount = `Agent ${agentNumber}`;
      txMethod = 'agent';
    } else {
      const voucherCode = Math.floor(100000 + Math.random() * 900000).toString();
      recipientName = `${atmBank} Voucher #${voucherCode}`;
      recipientPhoneOrAccount = `ATM Voucher ${voucherCode}`;
      txMethod = 'atm';
    }

    const officialSms = generateOfficialMpesaSms({
      code: txCode,
      type: 'withdraw',
      amount: numericAmount,
      fee: calculatedFee,
      recipientName,
      recipientPhoneOrAccount,
      newBalance: newBal,
      timestamp,
      method: txMethod,
    });

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      code: txCode,
      type: 'withdraw',
      amount: numericAmount,
      fee: calculatedFee,
      recipientName,
      recipientPhoneOrAccount,
      timestamp,
      status: 'completed',
      notes: method === 'linked_mpesa' ? `Instant B2C Payout to ${phoneInfo.display}` : undefined,
      previousBalance: prevBal,
      newBalance: newBal,
      category: 'withdrawal',
      method: txMethod,
    };

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#6366f1'],
      });
    } catch {
      // ignore
    }

    sound.playCashSwoosh();
    setTimeout(() => {
      sound.playSuccess();
    }, 250);

    // Dispatch live B2C cashout settlement via Express Daraja gateway
    triggerLiveB2CPayout({
      phoneNumber: phoneInfo.clean,
      amount: numericAmount,
      remarks: `Live Cash Withdrawal (${recipientName})`,
      config: account.darajaConfig,
    }).catch(() => {});

    onWithdrawSuccess(newTx, officialSms);
    onClose();
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
          {/* Close button */}
          <button
            id="btn-close-withdraw-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shadow-md border border-[#10B981]/25">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Withdraw Money</h3>
              <p className="text-xs text-[#71717A]">
                Instant cashout to your phone, agent, or ATM
              </p>
            </div>
          </div>

          {/* Method Selection Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#111113] rounded-2xl border border-[#27272A] mb-5">
            <button
              id="tab-withdraw-my-phone"
              type="button"
              onClick={() => { sound.playClick(); setMethod('linked_mpesa'); }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                method === 'linked_mpesa'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 mb-1" />
              <span>To My Phone</span>
            </button>

            <button
              id="tab-withdraw-agent"
              type="button"
              onClick={() => { sound.playClick(); setMethod('agent'); }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                method === 'agent'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Store className="w-4 h-4 mb-1" />
              <span>From Agent</span>
            </button>

            <button
              id="tab-withdraw-atm"
              type="button"
              onClick={() => { sound.playClick(); setMethod('atm'); }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                method === 'atm'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 mb-1" />
              <span>ATM Voucher</span>
            </button>
          </div>

          <form onSubmit={handleInitiate} className="space-y-4">
            {/* Method: To My M-Pesa Phone */}
            {method === 'linked_mpesa' && (
              <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/25 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
                    <Zap className="w-4 h-4" />
                    <span>Instant B2C Mobile Payout</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981]">
                    FAST ⚡
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs text-[#71717A]">Recipient Phone:</p>
                    <p className="text-sm font-bold font-mono text-white">{phoneInfo.display}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#71717A]">Account Owner:</p>
                    <p className="text-sm font-semibold text-[#E4E4E7]">{account.fullName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Method: Agent */}
            {method === 'agent' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Agent Number
                  </label>
                  <input
                    id="input-agent-no"
                    type="text"
                    placeholder="e.g. 123456"
                    value={agentNumber}
                    onChange={e => setAgentNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Store Number
                  </label>
                  <input
                    id="input-store-no"
                    type="text"
                    placeholder="e.g. 100"
                    value={storeNumber}
                    onChange={e => setStoreNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>
            )}

            {/* Method: ATM Voucher */}
            {method === 'atm' && (
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                  Select Partner ATM
                </label>
                <select
                  value={atmBank}
                  onChange={e => setAtmBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981]"
                >
                  <option value="Equity Bank ATM">Equity Bank ATM</option>
                  <option value="Co-op Bank ATM">Co-operative Bank ATM</option>
                  <option value="KCB Bank ATM">KCB Bank ATM</option>
                  <option value="Family Bank ATM">Family Bank ATM</option>
                </select>
                <p className="text-[11px] text-[#71717A] mt-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#10B981]" />
                  A 6-digit ATM cash withdrawal code valid for 4 hours will be generated.
                </p>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA]">
                  Withdrawal Amount (KES)
                </label>
                <span className="text-[11px] text-[#71717A] font-mono">
                  Avail: {formatKsh(account.balance)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#71717A] text-sm">
                  Ksh
                </span>
                <input
                  id="input-withdraw-amount"
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
                {[500, 1000, 2500, 5000, 10000].map(amt => (
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

            {/* Tariff Breakdown */}
            {numericAmount > 0 && (
              <div className="p-3.5 rounded-xl bg-[#111113] border border-[#27272A] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Withdrawal Amount:</span>
                  <span className="font-mono text-[#E4E4E7]">{formatKsh(numericAmount)}</span>
                </div>
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Withdrawal Fee:</span>
                  <span className="font-mono text-[#10B981]">{formatKsh(calculatedFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-[#27272A]">
                  <span>Total Deducted from Balance:</span>
                  <span className="font-mono text-[#10B981]">{formatKsh(totalDeduction)}</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-confirm-withdraw-proceed"
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-sm shadow-lg shadow-[#10B981]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Authorize & Withdraw</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>

      {/* PIN Verification Modal */}
      <PinModal
        isOpen={isPinOpen}
        correctPin={account.pin}
        title="Confirm Cash Withdrawal"
        subtitle={`Withdraw ${formatKsh(numericAmount)} via ${method === 'linked_mpesa' ? 'Connected M-PESA SIM' : method}`}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinOpen(false)}
      />
    </>
  );
};
