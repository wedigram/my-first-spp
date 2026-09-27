import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, X, Delete } from 'lucide-react';
import { sound } from '../utils/audio';

interface PinModalProps {
  isOpen: boolean;
  correctPin: string;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  correctPin,
  title = 'Enter M-PESA PIN',
  subtitle = 'Authorize this transaction securely',
  onSuccess,
  onClose,
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    sound.playClick();
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setError(null);

    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handleDelete = () => {
    sound.playClick();
    setEnteredPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const verifyPin = (pinToVerify: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      if (pinToVerify === correctPin) {
        sound.playSuccess();
        onSuccess();
      } else {
        sound.playError();
        setError('Incorrect M-PESA Security PIN. Please try again.');
        setEnteredPin('');
        setIsSubmitting(false);
      }
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm bg-[#18181B] border border-[#27272A] rounded-3xl p-6 shadow-2xl relative overflow-hidden text-[#E4E4E7]"
      >
        <button
          id="btn-close-pin-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 text-[#10B981] mx-auto flex items-center justify-center mb-3 border border-[#10B981]/25">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-[#71717A] mt-1">{subtitle}</p>
        </div>

        {/* 4-digit circles */}
        <div className="flex justify-center items-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => {
            const isFilled = enteredPin.length > i;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#10B981] border-[#10B981] scale-110 shadow-sm shadow-[#10B981]/50'
                    : 'border-[#3F3F46] bg-[#27272A]'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-400 text-center font-medium mb-4 animate-shake">
            {error}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              id={`btn-pin-digit-${num}`}
              disabled={isSubmitting}
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-[#27272A] hover:bg-[#3F3F46] active:bg-[#10B981] active:text-[#0A0A0B] text-white font-mono text-xl font-bold transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {num}
            </button>
          ))}

          <button
            onClick={() => setEnteredPin('')}
            disabled={isSubmitting || enteredPin.length === 0}
            className="h-14 rounded-2xl bg-[#27272A]/50 hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            Clear
          </button>

          <button
            id="btn-pin-digit-0"
            disabled={isSubmitting}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-[#27272A] hover:bg-[#3F3F46] active:bg-[#10B981] active:text-[#0A0A0B] text-white font-mono text-xl font-bold transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            disabled={isSubmitting || enteredPin.length === 0}
            className="h-14 rounded-2xl bg-[#27272A] hover:bg-[#3F3F46] active:bg-rose-950 text-[#E4E4E7] hover:text-white transition-colors flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mt-3">
          <span className="text-[11px] text-[#71717A]">
            Active Security PIN • Configurable in Account Profile
          </span>
        </div>
      </motion.div>
    </div>
  );
};
