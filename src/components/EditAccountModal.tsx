import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  User, 
  Smartphone, 
  ShieldCheck, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { UserAccount } from '../types';
import { normalizeKenyanPhone } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface EditAccountModalProps {
  isOpen: boolean;
  account: UserAccount;
  onClose: () => void;
  onSaveAccount: (updatedAccount: UserAccount, notificationText: string) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  account,
  onClose,
  onSaveAccount,
}) => {
  const [fullName, setFullName] = useState<string>(account.fullName);
  const [phone, setPhone] = useState<string>(account.mpesaPhoneNumber);
  const [nationalId, setNationalId] = useState<string>(account.nationalId);
  const [email, setEmail] = useState<string>(account.email);
  const [pin, setPin] = useState<string>(account.pin);
  const [tier, setTier] = useState<UserAccount['accountTier']>(account.accountTier);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(account.fullName);
      setPhone(account.mpesaPhoneNumber);
      setNationalId(account.nationalId);
      setEmail(account.email);
      setPin(account.pin);
      setTier(account.accountTier);
      setErrorMessage(null);
    }
  }, [account, isOpen]);

  if (!isOpen) return null;

  const phoneInfo = normalizeKenyanPhone(phone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      sound.playError();
      return;
    }

    if (!phoneInfo.isValid) {
      setErrorMessage('Please enter a valid Kenyan M-Pesa phone number (e.g. 0712345678).');
      sound.playError();
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMessage('PIN must be exactly 4 digits.');
      sound.playError();
      return;
    }

    const updatedAccount: UserAccount = {
      ...account,
      fullName: fullName.trim(),
      mpesaPhoneNumber: phoneInfo.formatted,
      nationalId: nationalId.trim(),
      email: email.trim(),
      pin: pin.trim(),
      accountTier: tier,
      dailyLimit: tier.includes('500,000') ? 500000 : 300000,
    };

    const notifMsg = `Account details updated. Connected M-PESA SIM: ${phoneInfo.display}. Registered Owner: ${fullName.trim()}.`;

    sound.playSuccess();
    onSaveAccount(updatedAccount, notifMsg);
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
          id="btn-close-edit-account-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shadow-md border border-[#10B981]/25">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Account & M-PESA Profile</h3>
            <p className="text-xs text-[#71717A]">
              Manage connected SIM, personal identity, and security PIN
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              Full Legal Name (as registered with Safaricom)
            </label>
            <div className="relative">
              <input
                id="input-account-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
          </div>

          {/* M-Pesa Phone Number */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#A1A1AA]">
                Connected M-PESA Mobile Number
              </label>
              <span className="text-[11px] text-[#10B981] font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Safaricom SIM
              </span>
            </div>
            <div className="relative">
              <input
                id="input-account-phone"
                type="text"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">
              Formatted: <span className="font-mono text-[#E4E4E7]">{phoneInfo.display}</span>
            </p>
          </div>

          {/* National ID & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                National ID / Passport
              </label>
              <input
                id="input-account-national-id"
                type="text"
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                Email Address
              </label>
              <input
                id="input-account-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
          </div>

          {/* 4-digit PIN & Account Tier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                4-Digit Security PIN
              </label>
              <input
                id="input-account-pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-[#10B981] font-mono font-bold text-center tracking-widest text-base focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                Account Tier Limit
              </label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value as UserAccount['accountTier'])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#10B981] transition-colors"
              >
                <option value="Tier 2 (Ksh 500,000)">Tier 2 (Ksh 500,000)</option>
                <option value="Tier 1 (Ksh 300,000)">Tier 1 (Ksh 300,000)</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            id="btn-save-account-details"
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-sm shadow-lg shadow-[#10B981]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Save Profile & Phone</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
