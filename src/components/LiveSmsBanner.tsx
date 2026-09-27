import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { NotificationItem } from '../types';

interface LiveSmsBannerProps {
  notification: NotificationItem | null;
  onDismiss: () => void;
  onViewReceipt: (txId?: string) => void;
}

export const LiveSmsBanner: React.FC<LiveSmsBannerProps> = ({
  notification,
  onDismiss,
  onViewReceipt,
}) => {
  if (!notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="live-sms-banner"
        initial={{ opacity: 0, y: -60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md bg-[#18181B]/95 backdrop-blur-xl border border-[#10B981]/40 rounded-2xl shadow-2xl shadow-[#10B981]/10 p-4 text-[#E4E4E7] overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#10B981]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          {/* Safaricom Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-[#0A0A0B] shrink-0 shadow-md shadow-[#10B981]/30">
            <MessageSquare className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#10B981] font-mono">
                  SAFARICOM M-PESA
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <button
                id="btn-dismiss-sms-banner"
                onClick={onDismiss}
                className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-[#E4E4E7] mb-1">
              {notification.title}
            </p>

            <p className="text-[12px] text-[#E4E4E7] font-mono leading-relaxed bg-[#0A0A0B] p-2 rounded-lg border border-[#27272A] break-words select-all">
              {notification.smsText || notification.message}
            </p>

            <div className="flex items-center justify-between mt-2.5 pt-1">
              <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                Delivered via SMS Gateway
              </span>

              {notification.transactionId && (
                <button
                  id="btn-view-sms-receipt"
                  onClick={() => {
                    onViewReceipt(notification.transactionId);
                    onDismiss();
                  }}
                  className="text-xs font-semibold text-[#10B981] hover:text-[#34D399] flex items-center gap-1 bg-[#10B981]/15 px-2.5 py-1 rounded-lg border border-[#10B981]/30 hover:bg-[#10B981]/25 transition-all cursor-pointer"
                >
                  View Receipt
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
