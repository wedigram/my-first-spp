import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Bell, 
  MessageSquare, 
  ShieldCheck, 
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ArrowUpRight,
  Sliders,
  Send
} from 'lucide-react';
import { NotificationItem, NotificationSettings } from '../types';
import { formatMpesaDate, generateMpesaCode, generateOfficialMpesaSms } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface NotificationCenterProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  settings: NotificationSettings;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onToggleSetting: (key: keyof NotificationSettings) => void;
  onTriggerTestNotification: () => void;
  onViewReceipt: (transactionId?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  notifications,
  settings,
  onClose,
  onMarkAllAsRead,
  onClearAll,
  onToggleSetting,
  onTriggerTestNotification,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'sms' | 'security' | 'settings'>('all');

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (activeTab === 'sms') return n.type === 'sms';
    if (activeTab === 'security') return n.type === 'security';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0A0A0B]/80 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-md h-full bg-[#18181B] border-l border-[#27272A] p-6 flex flex-col shadow-2xl text-[#E4E4E7] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center border border-[#10B981]/25">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Notifications & SMS</h3>
              <p className="text-xs text-[#71717A]">
                Live Safaricom alerts & activity feeds
              </p>
            </div>
          </div>

          <button
            id="btn-close-notifications-panel"
            onClick={onClose}
            className="p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#111113] rounded-2xl border border-[#27272A] my-3 shrink-0 text-xs">
          <button
            onClick={() => { sound.playClick(); setActiveTab('all'); }}
            className={`py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-[#10B981] text-[#0A0A0B] font-bold' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('sms'); }}
            className={`py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'sms' ? 'bg-[#10B981] text-[#0A0A0B] font-bold' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            M-PESA SMS
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('security'); }}
            className={`py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'security' ? 'bg-[#10B981] text-[#0A0A0B] font-bold' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Security
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('settings'); }}
            className={`py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-[#10B981] text-[#0A0A0B] font-bold' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Actions Bar */}
        {activeTab !== 'settings' && (
          <div className="flex items-center justify-between pb-3 shrink-0">
            <button
              id="btn-test-notification-alert"
              onClick={() => {
                sound.playClick();
                onTriggerTestNotification();
              }}
              className="text-xs font-semibold text-[#10B981] hover:text-[#34D399] flex items-center gap-1 bg-[#111113] px-2.5 py-1 rounded-xl border border-[#27272A] hover:bg-[#27272A] transition-all cursor-pointer"
              title="Send a sample live M-PESA SMS with audio chime"
            >
              <Sparkles className="w-3 h-3" />
              <span>Simulate Live SMS</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  onMarkAllAsRead();
                }}
                className="text-xs text-[#A1A1AA] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onClearAll();
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Settings */}
        {activeTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Alerts & Sound Settings
            </h4>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111113] border border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Audio Synthesizer</p>
                  <p className="text-[11px] text-[#71717A]">Play chime on SMS, send & receive</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={() => {
                  sound.playClick();
                  onToggleSetting('soundEnabled');
                }}
                className="w-4 h-4 accent-[#10B981] cursor-pointer"
              />
            </div>

            {/* SMS Banner Popup Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111113] border border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Safaricom SMS Pop-up</p>
                  <p className="text-[11px] text-[#71717A]">Show floating notification banner</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.smsBannerPopup}
                onChange={() => {
                  sound.playClick();
                  onToggleSetting('smsBannerPopup');
                }}
                className="w-4 h-4 accent-[#10B981] cursor-pointer"
              />
            </div>

            {/* Low Balance Alert */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111113] border border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Low Balance Alert</p>
                  <p className="text-[11px] text-[#71717A]">Notify when balance falls below Ksh 500</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.lowBalanceAlert}
                onChange={() => {
                  sound.playClick();
                  onToggleSetting('lowBalanceAlert');
                }}
                className="w-4 h-4 accent-[#10B981] cursor-pointer"
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111113] border border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Instant Push Updates</p>
                  <p className="text-[11px] text-[#71717A]">Real-time status updates</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.transactionPush}
                onChange={() => {
                  sound.playClick();
                  onToggleSetting('transactionPush');
                }}
                className="w-4 h-4 accent-[#10B981] cursor-pointer"
              />
            </div>
          </div>
        ) : (
          /* List of Notifications */
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-[#71717A]">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No notifications in this tab</p>
              </div>
            ) : (
              filtered.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.isRead
                      ? 'bg-[#111113] border-[#27272A] text-[#A1A1AA]'
                      : 'bg-[#18181B] border-[#10B981]/40 text-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981]">
                      {item.type === 'sms' ? 'SAFARICOM M-PESA SMS' : item.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-[#71717A]">
                      {formatMpesaDate(item.timestamp)}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold mb-1 text-white">
                    {item.title}
                  </h5>

                  <p className="text-[11px] font-mono text-[#E4E4E7] bg-[#0A0A0B] p-2 rounded-xl border border-[#27272A] leading-relaxed break-words select-all">
                    {item.smsText || item.message}
                  </p>

                  {item.transactionId && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => {
                          sound.playClick();
                          onViewReceipt(item.transactionId);
                        }}
                        className="text-[11px] font-semibold text-[#10B981] hover:text-[#34D399] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Official Receipt</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
