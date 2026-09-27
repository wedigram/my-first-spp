import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Edit3, 
  PlusCircle, 
  MinusCircle, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, Transaction } from '../types';
import { formatKsh, generateMpesaCode, generateOfficialMpesaSms } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface EditBalanceModalProps {
  isOpen: boolean;
  account: UserAccount;
  onClose: () => void;
  onBalanceUpdated: (newAccount: UserAccount, transaction: Transaction, smsText: string) => void;
}

type EditMode = 'set_exact' | 'add_credit' | 'deduct_debit' | 'quick_presets';

export const EditBalanceModal: React.FC<EditBalanceModalProps> = ({
  isOpen,
  account,
  onClose,
  onBalanceUpdated,
}) => {
  const [mode, setMode] = useState<EditMode>('set_exact');
  const [amountInput, setAmountInput] = useState<string>(account.balance.toString());
  const [reason, setReason] = useState<string>('Account balance adjustment');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('set_exact');
      setAmountInput(account.balance.toString());
      setErrorMessage(null);
    }
  }, [account.balance, isOpen]);

  if (!isOpen) return null;

  const currentBal = account.balance;
  const numInput = parseFloat(amountInput) || 0;

  let projectedBalance = currentBal;
  if (mode === 'set_exact') {
    projectedBalance = numInput;
  } else if (mode === 'add_credit') {
    projectedBalance = currentBal + numInput;
  } else if (mode === 'deduct_debit') {
    projectedBalance = Math.max(0, currentBal - numInput);
  }

  const handleApplyPreset = (presetBal: number) => {
    sound.playClick();
    setMode('set_exact');
    setAmountInput(presetBal.toString());
    setReason('Standard Preset Balance');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isNaN(numInput) || (mode === 'set_exact' && numInput < 0) || ((mode === 'add_credit' || mode === 'deduct_debit') && numInput <= 0)) {
      setErrorMessage('Please enter a valid amount.');
      sound.playError();
      return;
    }

    if (mode === 'deduct_debit' && numInput > currentBal) {
      setErrorMessage(`Cannot deduct ${formatKsh(numInput)}. Maximum available balance is ${formatKsh(currentBal)}.`);
      sound.playError();
      return;
    }

    const finalBalance = Math.round(projectedBalance * 100) / 100;
    const diff = finalBalance - currentBal;
    const txCode = generateMpesaCode();
    const timestamp = new Date().toISOString();

    const newAccount: UserAccount = {
      ...account,
      balance: finalBalance,
    };

    const isPositive = diff >= 0;
    const txType: Transaction['type'] = diff === 0 ? 'balance_adjustment' : (isPositive ? 'deposit' : 'withdraw');

    const officialSms = generateOfficialMpesaSms({
      code: txCode,
      type: 'balance_adjustment',
      amount: Math.abs(diff),
      fee: 0,
      recipientName: 'Account Balance Adjustment',
      recipientPhoneOrAccount: account.mpesaPhoneNumber,
      newBalance: finalBalance,
      timestamp,
      notes: reason.trim() || 'Manual balance adjustment',
    });

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      code: txCode,
      type: 'balance_adjustment',
      amount: Math.abs(diff),
      fee: 0,
      recipientName: 'Direct Balance Edit',
      recipientPhoneOrAccount: `Diff: ${isPositive ? '+' : '-'}${formatKsh(Math.abs(diff))}`,
      timestamp,
      status: 'completed',
      notes: reason.trim() || 'Manual account balance edit',
      previousBalance: currentBal,
      newBalance: finalBalance,
      category: 'system',
      method: 'manual_edit',
    };

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1'],
      });
    } catch {
      // ignore
    }

    sound.playSuccess();
    onBalanceUpdated(newAccount, newTx, officialSms);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0A0A0B]/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8 text-[#E4E4E7]"
      >
        <button
          id="btn-close-edit-balance-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shadow-md border border-[#10B981]/25">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Edit Account Balance</h3>
            <p className="text-xs text-[#71717A]">
              Directly customize or recalibrate your live wallet funds
            </p>
          </div>
        </div>

        {/* Edit Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#111113] rounded-2xl border border-[#27272A] mb-5">
          <button
            id="tab-mode-set-exact"
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('set_exact');
              setAmountInput(account.balance.toString());
            }}
            className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mode === 'set_exact'
                ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Set Exact Amount
          </button>

          <button
            id="tab-mode-add-credit"
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('add_credit');
              setAmountInput('10000');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mode === 'add_credit'
                ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            + Add Funds
          </button>

          <button
            id="tab-mode-deduct-debit"
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('deduct_debit');
              setAmountInput('5000');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mode === 'deduct_debit'
                ? 'bg-rose-600 text-white shadow-md font-bold'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            - Deduct Funds
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-2">
            Quick Balance Presets
          </span>
          <div className="grid grid-cols-4 gap-2">
            {[10000, 50000, 100000, 250000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handleApplyPreset(val)}
                className="py-1.5 px-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-xs font-mono font-semibold text-[#E4E4E7] hover:text-white transition-all cursor-pointer"
              >
                {formatKsh(val).replace('.00', '')}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              {mode === 'set_exact' ? 'New Total Balance (KES)' : mode === 'add_credit' ? 'Amount to Add (KES)' : 'Amount to Deduct (KES)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#71717A] text-sm">
                Ksh
              </span>
              <input
                id="input-edit-balance-amount"
                type="number"
                step="any"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                className="w-full pl-13 pr-4 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono font-bold text-base focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
          </div>

          {/* Reason / Reference */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              Adjustment Reason / Note
            </label>
            <input
              id="input-edit-balance-reason"
              type="text"
              placeholder="e.g. Salary deposit, Bank sync, Capital investment"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#111113] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#10B981] transition-colors"
            />
          </div>

          {/* Projection Preview Box */}
          <div className="p-4 rounded-2xl bg-[#111113] border border-[#27272A] space-y-2 text-xs">
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Current Balance:</span>
              <span className="font-mono text-white">{formatKsh(currentBal)}</span>
            </div>
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Adjustment:</span>
              <span className={`font-mono font-semibold ${projectedBalance >= currentBal ? 'text-[#10B981]' : 'text-rose-400'}`}>
                {projectedBalance >= currentBal ? '+' : '-'}{formatKsh(Math.abs(projectedBalance - currentBal))}
              </span>
            </div>
            <div className="flex justify-between font-bold text-white pt-2 border-t border-[#27272A] text-sm">
              <span>Projected Balance:</span>
              <span className="font-mono text-[#10B981]">{formatKsh(projectedBalance)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            id="btn-save-balance-update"
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-sm shadow-lg shadow-[#10B981]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Apply Balance Update</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
