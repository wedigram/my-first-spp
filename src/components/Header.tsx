import React from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  UserCheck, 
  Code,
  Cloud,
  LogIn,
  LogOut,
  Mic
} from 'lucide-react';
import { UserAccount, NotificationSettings } from '../types';
import { normalizeKenyanPhone } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface HeaderProps {
  account: UserAccount;
  unreadCount: number;
  settings: NotificationSettings;
  isCloudAuthenticated: boolean;
  isAuthLoading: boolean;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onToggleSound: () => void;
  onOpenNotifications: () => void;
  onOpenAccountModal: () => void;
  onOpenDarajaDrawer: () => void;
  onOpenVoiceCommand: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  account,
  unreadCount,
  settings,
  isCloudAuthenticated,
  isAuthLoading,
  onSignInGoogle,
  onSignOutGoogle,
  onToggleSound,
  onOpenNotifications,
  onOpenAccountModal,
  onOpenDarajaDrawer,
  onOpenVoiceCommand,
}) => {
  const phoneFormatted = normalizeKenyanPhone(account.mpesaPhoneNumber).display;

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-[#27272A] px-4 lg:px-8 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#10B981] rounded-xl flex items-center justify-center shadow-lg shadow-[#10B981]/20">
            <div className="w-4 h-4 border-2 border-[#0A0A0B] rounded-full"></div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                PesaFast
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  M-PESA LIVE
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#71717A] hidden sm:block">
              Connected Instant Cloud Wallet
            </p>
          </div>
        </div>

        {/* Connected M-Pesa Phone Number badge */}
        <button
          id="btn-header-phone-badge"
          onClick={() => {
            sound.playClick();
            onOpenAccountModal();
          }}
          className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#111113] border border-[#27272A] hover:border-[#3F3F46] hover:bg-[#18181B] transition-all cursor-pointer group"
          title="Click to edit connected M-Pesa account & phone"
        >
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#71717A]">Connected:</span>
              <span className="text-xs font-mono font-medium text-white">
                {phoneFormatted}
              </span>
            </div>
            <span className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-[#10B981]" />
              {account.fullName}
            </span>
          </div>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Voice Command Microphone Button */}
          <button
            id="btn-header-voice-mic"
            onClick={() => {
              sound.playClick();
              onOpenVoiceCommand();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-[#10B981] transition-all text-xs font-semibold cursor-pointer"
            title="Voice Commands: Say 'Send money' or 'Check balance'"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Live Cloud Auth Button */}
          {!isAuthLoading && (
            isCloudAuthenticated ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[11px] font-bold"
                  title="Synced in real-time with Firebase Cloud Firestore"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>LIVE CLOUD</span>
                </span>
                <button
                  id="btn-signout-google"
                  onClick={() => {
                    sound.playClick();
                    onSignOutGoogle();
                  }}
                  className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
                  title="Sign out of Cloud Sync"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-signin-google"
                onClick={() => {
                  sound.playClick();
                  onSignInGoogle();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-xs shadow-md shadow-[#10B981]/20 transition-all cursor-pointer"
                title="Sign in with Google to sync your live M-PESA wallet to Cloud Firestore"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connect Google Live</span>
              </button>
            )
          )}

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] hover:border-[#3F3F46] transition-all cursor-pointer"
            title={settings.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#10B981]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#71717A]" />
            )}
          </button>

          {/* Daraja API Gateway drawer trigger */}
          <button
            id="btn-open-daraja-drawer"
            onClick={() => {
              sound.playClick();
              onOpenDarajaDrawer();
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] hover:bg-[#27272A] transition-all text-xs font-medium cursor-pointer"
            title="Daraja M-Pesa Gateway Settings"
          >
            <Code className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Daraja API</span>
          </button>

          {/* Notifications Bell */}
          <button
            id="btn-header-notifications"
            onClick={() => {
              sound.playClick();
              onOpenNotifications();
            }}
            className="relative p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] hover:border-[#3F3F46] transition-all cursor-pointer"
            title="Notifications & M-Pesa SMS"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#18181B]" />
            )}
          </button>

          {/* Account Profile button */}
          <button
            id="btn-header-profile"
            onClick={() => {
              sound.playClick();
              onOpenAccountModal();
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-[#E4E4E7] hover:text-white transition-all cursor-pointer"
            title="Account Profile & Settings"
          >
            <div className="w-7 h-7 rounded-lg bg-[#27272A] text-white border border-[#3F3F46] font-bold text-xs flex items-center justify-center">
              {account.fullName.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <span className="text-xs font-semibold hidden sm:inline max-w-[100px] truncate">
              {account.fullName}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
