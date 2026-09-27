import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Send, 
  User, 
  Store, 
  Building2, 
  Landmark, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, ContactItem, Transaction } from '../types';
import { calculateMpesaFee, formatKsh, normalizeKenyanPhone, generateMpesaCode, generateOfficialMpesaSms } from '../utils/mpesa';
import { sound } from '../utils/audio';
import { PinModal } from './PinModal';
import { triggerLiveB2CPayout } from '../utils/darajaClient';

interface SendMoneyModalProps {
  isOpen: boolean;
  account: UserAccount;
  contacts: ContactItem[];
  initialAmount?: number;
  initialRecipientPhone?: string;
  initialRecipientName?: string;
  onClose: () => void;
  onSendSuccess: (transaction: Transaction, smsText: string) => void;
}

type SendTab = 'phone' | 'till' | 'paybill' | 'bank';

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
  isOpen,
  account,
  contacts,
  initialAmount,
  initialRecipientPhone,
  initialRecipientName,
  onClose,
  onSendSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<SendTab>('phone');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [tillNumber, setTillNumber] = useState<string>('');
  const [paybillNumber, setPaybillNumber] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Equity Bank');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isPinOpen, setIsPinOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialAmount !== undefined && initialAmount > 0) {
        setAmount(initialAmount.toString());
      }
      if (initialRecipientPhone) {
        setRecipientPhone(initialRecipientPhone);
        setActiveTab('phone');
      }
      if (initialRecipientName) {
        setRecipientName(initialRecipientName);
      }
      setErrorMessage(null);
    }
  }, [isOpen, initialAmount, initialRecipientPhone, initialRecipientName]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amount) || 0;
  
  // Calculate fee
  const feeType = activeTab === 'phone' ? 'send' : activeTab === 'paybill' ? 'paybill' : 'buy_goods';
  const calculatedFee = calculateMpesaFee(numericAmount, feeType);
  const totalDeduction = numericAmount + calculatedFee;

  // Auto-fill contact
  const handleSelectContact = (contact: ContactItem) => {
    sound.playClick();
    if (contact.accountType === 'till') {
      setActiveTab('till');
      setTillNumber(contact.phone);
      setRecipientName(contact.name);
    } else if (contact.accountType === 'paybill') {
      setActiveTab('paybill');
      setPaybillNumber(contact.phone);
      setRecipientName(contact.name);
    } else {
      setActiveTab('phone');
      setRecipientPhone(contact.phone);
      setRecipientName(contact.name);
    }
  };

  const handleQuickAmount = (val: number) => {
    sound.playClick();
    setAmount(val.toString());
  };

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numericAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      sound.playError();
      return;
    }

    if (totalDeduction > account.balance) {
      setErrorMessage(`Insufficient balance. You need ${formatKsh(totalDeduction)} (including fee of ${formatKsh(calculatedFee)}), but your balance is ${formatKsh(account.balance)}.`);
      sound.playError();
      return;
    }

    if (activeTab === 'phone') {
      const phoneCheck = normalizeKenyanPhone(recipientPhone);
      if (!phoneCheck.isValid) {
        setErrorMessage('Please enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678).');
        sound.playError();
        return;
      }
    } else if (activeTab === 'till' && !tillNumber.trim()) {
      setErrorMessage('Please enter a valid Till Number.');
      sound.playError();
      return;
    } else if (activeTab === 'paybill' && (!paybillNumber.trim() || !accountNumber.trim())) {
      setErrorMessage('Please enter both Business Paybill and Account Number.');
      sound.playError();
      return;
    }

    // Open PIN verification
    sound.playClick();
    setIsPinOpen(true);
  };

  const handlePinSuccess = () => {
    setIsPinOpen(false);

    // Generate details
    const txCode = generateMpesaCode();
    const timestamp = new Date().toISOString();
    const prevBal = account.balance;
    const newBal = prevBal - totalDeduction;

    let finalRecipientName = recipientName.trim();
    let finalRecipientAccount = '';
    let method: Transaction['method'] = 'mpesa_phone';
    let type: Transaction['type'] = 'send';

    if (activeTab === 'phone') {
      const p = normalizeKenyanPhone(recipientPhone);
      finalRecipientAccount = p.display;
      if (!finalRecipientName) {
        finalRecipientName = 'M-PESA Recipient';
      }
      method = 'mpesa_phone';
      type = 'send';
    } else if (activeTab === 'till') {
      finalRecipientAccount = `Till ${tillNumber}`;
      if (!finalRecipientName) finalRecipientName = `Merchant Store (${tillNumber})`;
      method = 'till';
      type = 'buy_goods';
    } else if (activeTab === 'paybill') {
      finalRecipientAccount = `Paybill ${paybillNumber} (Acc: ${accountNumber})`;
      if (!finalRecipientName) finalRecipientName = `Business ${paybillNumber}`;
      method = 'paybill';
      type = 'paybill';
    } else {
      finalRecipientAccount = `${bankName} - ${bankAccount}`;
      if (!finalRecipientName) finalRecipientName = `Bank Transfer (${bankName})`;
      method = 'mpesa_phone';
      type = 'send';
    }

    const officialSms = generateOfficialMpesaSms({
      code: txCode,
      type,
      amount: numericAmount,
      fee: calculatedFee,
      recipientName: finalRecipientName,
      recipientPhoneOrAccount: finalRecipientAccount,
      newBalance: newBal,
      timestamp,
      notes,
    });

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      code: txCode,
      type,
      amount: numericAmount,
      fee: calculatedFee,
      recipientName: finalRecipientName,
      recipientPhoneOrAccount: finalRecipientAccount,
      timestamp,
      status: 'completed',
      notes: notes.trim() || undefined,
      previousBalance: prevBal,
      newBalance: newBal,
      category: activeTab === 'till' || activeTab === 'paybill' ? 'merchant' : 'transfer',
      method,
    };

    // Confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#059669', '#f59e0b'],
      });
    } catch {
      // ignore
    }

    sound.playCashSwoosh();
    setTimeout(() => {
      sound.playSuccess();
    }, 250);

    // Dispatch live B2C / transfer settlement via Express Daraja gateway
    triggerLiveB2CPayout({
      phoneNumber: finalRecipientAccount,
      amount: numericAmount,
      remarks: notes.trim() || `Send Money to ${finalRecipientName}`,
      config: account.darajaConfig,
    }).catch(() => {});

    onSendSuccess(newTx, officialSms);
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
            id="btn-close-send-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shadow-md border border-[#10B981]/25">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Send Money</h3>
              <p className="text-xs text-[#71717A]">
                Instant M-PESA transfer with live confirmation
              </p>
            </div>
          </div>

          {/* Transfer Method Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#111113] rounded-2xl border border-[#27272A] mb-5">
            <button
              id="tab-send-phone"
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('phone'); }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'phone'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <User className="w-4 h-4 mb-1" />
              <span>Mobile No</span>
            </button>

            <button
              id="tab-send-till"
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('till'); }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'till'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Store className="w-4 h-4 mb-1" />
              <span>Buy Goods</span>
            </button>

            <button
              id="tab-send-paybill"
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('paybill'); }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'paybill'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 mb-1" />
              <span>Paybill</span>
            </button>

            <button
              id="tab-send-bank"
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('bank'); }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'bank'
                  ? 'bg-[#10B981] text-[#0A0A0B] shadow-md font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Landmark className="w-4 h-4 mb-1" />
              <span>Bank</span>
            </button>
          </div>

          {/* Quick Frequent Contacts */}
          <div className="mb-4">
            <span className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-2">
              Frequent / Favorites
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {contacts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-[#E4E4E7] text-xs transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#10B981]/20 text-[#10B981] font-bold text-[10px] flex items-center justify-center">
                    {c.avatar || c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleInitiate} className="space-y-4">
            {/* TAB: Phone Number */}
            {activeTab === 'phone' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    M-PESA Mobile Number
                  </label>
                  <input
                    id="input-send-phone"
                    type="text"
                    placeholder="e.g. 0712345678 or 254712345678"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Recipient Name (Optional / Auto-resolved)
                  </label>
                  <input
                    id="input-send-name"
                    type="text"
                    placeholder="e.g. Purity Wanjiku"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* TAB: Buy Goods Till */}
            {activeTab === 'till' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Till Number (Buy Goods)
                  </label>
                  <input
                    id="input-send-till"
                    type="text"
                    placeholder="e.g. 3049281"
                    value={tillNumber}
                    onChange={e => setTillNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Store / Merchant Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Supermarket / Cafe"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* TAB: Paybill */}
            {activeTab === 'paybill' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                      Business No (Paybill)
                    </label>
                    <input
                      id="input-send-paybill-no"
                      type="text"
                      placeholder="e.g. 888880"
                      value={paybillNumber}
                      onChange={e => setPaybillNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                      Account No
                    </label>
                    <input
                      id="input-send-account-no"
                      type="text"
                      placeholder="e.g. Acc: 3849201"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Organization Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kenya Power / Nairobi Water"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* TAB: Bank */}
            {activeTab === 'bank' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Select Destination Bank
                  </label>
                  <select
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  >
                    <option value="Equity Bank">Equity Bank</option>
                    <option value="KCB Bank">KCB Bank</option>
                    <option value="Co-operative Bank">Co-operative Bank</option>
                    <option value="Absa Bank Kenya">Absa Bank Kenya</option>
                    <option value="Standard Chartered">Standard Chartered</option>
                    <option value="NCBA Bank">NCBA Bank</option>
                    <option value="DTB Bank">DTB Bank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 018029482910"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-[#10B981] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA]">
                  Amount (KES)
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
                  id="input-send-amount"
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
                {[100, 500, 1000, 2500, 5000].map(amt => (
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

            {/* Reason / Reference Note */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                Reason / Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch stipend, Rent, Groceries"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#111113] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>

            {/* Tariff and total breakdown */}
            {numericAmount > 0 && (
              <div className="p-3.5 rounded-xl bg-[#111113] border border-[#27272A] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Transfer Amount:</span>
                  <span className="font-mono text-[#E4E4E7]">{formatKsh(numericAmount)}</span>
                </div>
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Safaricom Tariff Fee:</span>
                  <span className="font-mono text-[#10B981]">
                    {calculatedFee === 0 ? 'Free (Ksh 0.00)' : formatKsh(calculatedFee)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-[#27272A]">
                  <span>Total Deduction:</span>
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
              id="btn-confirm-send-proceed"
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-sm shadow-lg shadow-[#10B981]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Authorize & Send</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>

      {/* PIN Verification Modal */}
      <PinModal
        isOpen={isPinOpen}
        correctPin={account.pin}
        title="Confirm M-PESA Send"
        subtitle={`Send ${formatKsh(numericAmount)} to ${recipientName || recipientPhone || tillNumber || paybillNumber}`}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinOpen(false)}
      />
    </>
  );
};
