import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Send, 
  ArrowDownLeft, 
  PlusCircle, 
  Edit3, 
  Smartphone, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown,
  Sparkles,
  WalletCards,
  RefreshCw,
  Mic
} from 'lucide-react';
import { UserAccount, Transaction } from '../types';
import { formatKsh, normalizeKenyanPhone } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface BalanceCardProps {
  account: UserAccount;
  transactions: Transaction[];
  highlightBalance?: boolean;
  onOpenSendModal: () => void;
  onOpenWithdrawModal: () => void;
  onOpenDepositModal: () => void;
  onOpenEditBalanceModal: () => void;
  onOpenEditAccountModal: () => void;
  onOpenVoiceCommand?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  account,
  transactions,
  highlightBalance = false,
  onOpenSendModal,
  onOpenWithdrawModal,
  onOpenDepositModal,
  onOpenEditBalanceModal,
  onOpenEditAccountModal,
  onOpenVoiceCommand,
}) => {
  const [showBalance, setShowBalance] = useState<boolean>(true);

  useEffect(() => {
    if (highlightBalance) {
      setShowBalance(true);
    }
  }, [highlightBalance]);

  // Compute 24h flow
  const now = Date.now();
  const past24hTxs = transactions.filter(
    tx => now - new Date(tx.timestamp).getTime() <= 24 * 60 * 60 * 1000 && tx.status === 'completed'
  );

  const totalInflow = past24hTxs
    .filter(tx => tx.type === 'deposit' || tx.type === 'received')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOutflow = past24hTxs
    .filter(tx => tx.type === 'send' || tx.type === 'withdraw' || tx.type === 'paybill' || tx.type === 'buy_goods')
    .reduce((sum, tx) => sum + tx.amount + tx.fee, 0);

  const phoneFormatted = normalizeKenyanPhone(account.mpesaPhoneNumber).display;

  // Split whole amount and decimals for elegant display
  const balanceParts = account.balance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.');
  const wholePart = balanceParts[0];
  const decimalPart = balanceParts[1] || '00';

  const dailyPercentage = Math.min(100, Math.round((account.dailySpent / account.dailyLimit) * 100));

  return (
    <div className="w-full space-y-6">
      {/* Top Grid matching Elegant Dark layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Balance Container (Col-span-2) */}
        <div 
          id="main-balance-card"
          className={`lg:col-span-2 bg-[#18181B] border rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-300 ${
            highlightBalance ? 'border-[#10B981] ring-2 ring-[#10B981]/30' : 'border-[#27272A]'
          }`}
        >
          {/* Subtle glow aura */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981] opacity-[0.04] blur-[100px] -mr-32 -mt-32 pointer-events-none" />

          {/* Top Label & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 z-10 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[#A1A1AA] font-medium tracking-wider uppercase text-xs">
                TOTAL ACCOUNT BALANCE
              </span>
              <button
                id="btn-toggle-show-balance"
                onClick={() => {
                  sound.playClick();
                  setShowBalance(!showBalance);
                }}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#E4E4E7] transition-colors cursor-pointer"
                title={showBalance ? 'Hide Balance' : 'Show Balance'}
              >
                {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onOpenVoiceCommand && (
                <button
                  id="btn-balance-card-voice"
                  onClick={() => {
                    sound.playClick();
                    onOpenVoiceCommand();
                  }}
                  className="bg-[#111113] hover:bg-[#27272A] border border-[#27272A] px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#10B981] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Voice Command ('Send money', 'Check balance')"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
              )}

              <button
                id="btn-edit-phone-pill"
                onClick={() => {
                  sound.playClick();
                  onOpenEditAccountModal();
                }}
                className="bg-[#111113] hover:bg-[#27272A] border border-[#27272A] px-3 py-1.5 rounded-lg text-xs font-mono text-[#A1A1AA] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                title="Edit SIM profile"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
                <span>{phoneFormatted}</span>
              </button>

              <button
                id="btn-edit-balance-primary"
                onClick={() => {
                  sound.playClick();
                  onOpenEditBalanceModal();
                }}
                className="bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#10B981] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>EDIT BALANCE</span>
              </button>
            </div>
          </div>

          {/* Main Huge Typography */}
          <div className="my-3 z-10">
            {showBalance ? (
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tighter text-white font-mono">
                KSh {wholePart}
                <span className="text-xl sm:text-2xl text-[#71717A] ml-1.5 font-normal">
                  .{decimalPart}
                </span>
              </h2>
            ) : (
              <h2 className="text-4xl sm:text-5xl font-light tracking-widest text-[#71717A] font-mono">
                KSh ••••••••
              </h2>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 z-10">
            <button
              id="btn-action-send-money"
              onClick={() => {
                sound.playClick();
                onOpenSendModal();
              }}
              className="bg-[#10B981] text-[#0A0A0B] font-bold py-3.5 px-4 rounded-2xl hover:bg-[#34D399] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/15 active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>SEND MONEY</span>
            </button>

            <button
              id="btn-action-withdraw-money"
              onClick={() => {
                sound.playClick();
                onOpenWithdrawModal();
              }}
              className="bg-transparent border border-[#3F3F46] hover:bg-[#27272A] text-white font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4 text-[#10B981]" />
              <span>WITHDRAW</span>
            </button>

            <button
              id="btn-action-deposit-money"
              onClick={() => {
                sound.playClick();
                onOpenDepositModal();
              }}
              className="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#34D399]" />
              <span>DEPOSIT (STK)</span>
            </button>
          </div>
        </div>

        {/* Right Info Container: Instant Payout & Quick Metrics */}
        <div className="bg-gradient-to-br from-[#18181B] to-[#0F0F11] border border-[#27272A] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-[#10B981]/10 text-[#10B981] rounded-2xl flex items-center justify-center text-2xl mb-3 border border-[#10B981]/20">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Instant Payout</h3>
            <p className="text-xs text-[#71717A] leading-relaxed max-w-xs">
              Withdraw or send directly to any M-PESA phone number in under 3 seconds with zero friction.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#27272A] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#71717A] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                24h Inflow:
              </span>
              <span className="font-mono font-bold text-[#10B981]">
                +{formatKsh(totalInflow)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#71717A] flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                24h Outflow:
              </span>
              <span className="font-mono font-bold text-[#E4E4E7]">
                -{formatKsh(totalOutflow)}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#71717A] mb-1">
                <span>Daily Limit Used</span>
                <span className="font-mono text-[#A1A1AA]">{dailyPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#27272A] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#10B981] rounded-full transition-all duration-500" 
                  style={{ width: `${dailyPercentage}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
