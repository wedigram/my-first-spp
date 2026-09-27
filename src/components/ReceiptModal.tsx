import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  Share2, 
  Download,
  Smartphone,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Transaction } from '../types';
import { formatKsh, formatMpesaDate, generateOfficialMpesaSms } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copiedSms, setCopiedSms] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!transaction) return null;

  const smsText = generateOfficialMpesaSms({
    code: transaction.code,
    type: transaction.type,
    amount: transaction.amount,
    fee: transaction.fee,
    recipientName: transaction.recipientName,
    recipientPhoneOrAccount: transaction.recipientPhoneOrAccount,
    newBalance: transaction.newBalance,
    timestamp: transaction.timestamp,
    method: transaction.method,
    notes: transaction.notes,
  });

  const handleCopySms = () => {
    sound.playClick();
    navigator.clipboard.writeText(smsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  const handleCopyCode = () => {
    sound.playClick();
    navigator.clipboard.writeText(transaction.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const handleShare = async () => {
    sound.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `M-PESA Receipt - ${transaction.code}`,
          text: smsText,
        });
      } catch {
        handleCopySms();
      }
    } else {
      handleCopySms();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-3xl overflow-hidden shadow-2xl relative my-8 text-[#E4E4E7] print:border-none print:shadow-none print:bg-white print:text-black"
      >
        {/* Header with emerald gradient and Safaricom emblem */}
        <div className="bg-[#10B981] p-6 text-[#0A0A0B] text-center relative print:bg-[#10B981]">
          <button
            id="btn-close-receipt-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-[#0A0A0B] hover:text-white rounded-full bg-[#0A0A0B]/20 hover:bg-[#0A0A0B]/40 transition-colors print:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-full bg-[#0A0A0B] text-[#10B981] mx-auto flex items-center justify-center font-black text-xl mb-2 shadow-lg">
            ✓
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-[#0A0A0B]">M-PESA RECEIPT</h3>
          <p className="text-xs text-[#0A0A0B]/80 font-semibold mt-0.5">
            Safaricom Certified Transaction
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A0A0B] text-[#10B981] text-xs font-mono font-bold tracking-wider">
            <span>{transaction.code}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 hover:text-white transition-colors print:hidden cursor-pointer"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Amount Hero */}
        <div className="p-6 text-center border-b border-[#27272A] print:border-gray-200">
          <p className="text-xs text-[#71717A] font-semibold uppercase tracking-wider mb-1">
            Total Amount Transacted
          </p>
          <h2 className="text-3xl font-extrabold font-mono text-white print:text-black">
            {formatKsh(transaction.amount)}
          </h2>
          <div className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed Successfully</span>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="p-6 space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-[#27272A]">
            <span className="text-[#71717A]">Transaction Type:</span>
            <span className="font-semibold text-white uppercase">{transaction.type.replace('_', ' ')}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#27272A]">
            <span className="text-[#71717A]">Recipient / Merchant:</span>
            <span className="font-semibold text-white text-right max-w-[200px] truncate">{transaction.recipientName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#27272A]">
            <span className="text-[#71717A]">Phone / Account No:</span>
            <span className="font-mono font-medium text-[#E4E4E7]">{transaction.recipientPhoneOrAccount}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#27272A]">
            <span className="text-[#71717A]">Date & Time:</span>
            <span className="font-mono text-[#E4E4E7]">{formatMpesaDate(transaction.timestamp)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#27272A]">
            <span className="text-[#71717A]">Transaction Cost (Tariff):</span>
            <span className="font-mono text-[#10B981] font-semibold">{formatKsh(transaction.fee)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#27272A] font-semibold">
            <span className="text-[#71717A]">New M-PESA Balance:</span>
            <span className="font-mono text-white">{formatKsh(transaction.newBalance)}</span>
          </div>

          {transaction.notes && (
            <div className="flex justify-between py-1 border-b border-[#27272A]">
              <span className="text-[#71717A]">Reference / Note:</span>
              <span className="text-[#E4E4E7] text-right">{transaction.notes}</span>
            </div>
          )}

          {/* Official SMS preview box */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#10B981] uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Official Safaricom SMS Text
              </span>
              <button
                onClick={handleCopySms}
                className="text-[11px] text-[#71717A] hover:text-[#10B981] flex items-center gap-1 transition-colors print:hidden cursor-pointer"
              >
                {copiedSms ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSms ? 'Copied' : 'Copy SMS'}</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0A0B] font-mono text-[11px] text-[#E4E4E7] border border-[#27272A] leading-relaxed select-all">
              {smsText}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-0 grid grid-cols-2 gap-3 print:hidden">
          <button
            id="btn-print-receipt"
            onClick={handlePrint}
            className="py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            id="btn-share-receipt"
            onClick={handleShare}
            className="py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Receipt</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
