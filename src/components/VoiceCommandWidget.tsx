import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Sparkles, Volume2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserAccount, ContactItem } from '../types';
import { formatKsh } from '../utils/mpesa';
import { sound } from '../utils/audio';

export interface VoiceCommandAction {
  intent:
    | 'send_money'
    | 'check_balance'
    | 'withdraw_money'
    | 'deposit_money'
    | 'edit_balance'
    | 'edit_account'
    | 'open_notifications'
    | 'open_daraja';
  amount?: number;
  recipientPhone?: string;
  recipientName?: string;
  transcript: string;
}

interface VoiceCommandWidgetProps {
  isOpen: boolean;
  account: UserAccount;
  contacts: ContactItem[];
  soundEnabled: boolean;
  onClose: () => void;
  onExecuteCommand: (action: VoiceCommandAction) => void;
}

// Type declarations for browser SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export const VoiceCommandWidget: React.FC<VoiceCommandWidgetProps> = ({
  isOpen,
  account,
  contacts,
  soundEnabled,
  onClose,
  onExecuteCommand,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const recognitionRef = useRef<any>(null);

  const speakResponse = (text: string) => {
    if (!soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore synthesis errors
    }
  };

  const parseAndExecute = (rawText: string) => {
    const clean = rawText.trim();
    const lower = clean.toLowerCase();

    if (!clean) return;

    // Extract any numeric amount (e.g. "send 1,500" or "withdraw 500")
    const numMatch = lower.replace(/,/g, '').match(/\b(\d+(?:\.\d{1,2})?)\b/);
    const extractedAmount = numMatch ? parseFloat(numMatch[1]) : undefined;

    // Match contact name if mentioned
    const matchedContact = contacts.find(c =>
      lower.includes(c.name.toLowerCase()) ||
      lower.includes(c.name.split(' ')[0].toLowerCase())
    );

    // 1. Check Balance intent
    if (
      lower.includes('check balance') ||
      lower.includes('my balance') ||
      lower.includes('show balance') ||
      lower.includes('how much') ||
      lower === 'balance'
    ) {
      sound.playSuccess();
      const msg = `Your live M-PESA balance is ${formatKsh(account.balance)}.`;
      setFeedback({ type: 'success', text: msg });
      speakResponse(msg);
      onExecuteCommand({
        intent: 'check_balance',
        transcript: clean,
      });
      return;
    }

    // 2. Edit Balance intent
    if (
      lower.includes('edit balance') ||
      lower.includes('set balance') ||
      lower.includes('change balance') ||
      lower.includes('update balance')
    ) {
      sound.playSuccess();
      const msg = 'Opening Balance Editor...';
      setFeedback({ type: 'success', text: msg });
      speakResponse(msg);
      setTimeout(() => {
        onExecuteCommand({
          intent: 'edit_balance',
          amount: extractedAmount,
          transcript: clean,
        });
        onClose();
      }, 600);
      return;
    }

    // 3. Send Money / Transfer intent
    if (
      lower.includes('send') ||
      lower.includes('transfer') ||
      lower.includes('pay')
    ) {
      sound.playSuccess();
      const msg = matchedContact
        ? `Opening Send Money to ${matchedContact.name}${extractedAmount ? ` for ${formatKsh(extractedAmount)}` : ''}...`
        : `Opening Send Money${extractedAmount ? ` for ${formatKsh(extractedAmount)}` : ''}...`;
      setFeedback({ type: 'success', text: msg });
      speakResponse(msg);
      setTimeout(() => {
        onExecuteCommand({
          intent: 'send_money',
          amount: extractedAmount,
          recipientName: matchedContact?.name,
          recipientPhone: matchedContact?.phone,
          transcript: clean,
        });
        onClose();
      }, 600);
      return;
    }

    // 4. Withdraw Money intent
    if (lower.includes('withdraw') || lower.includes('cash out') || lower.includes('cashout')) {
      sound.playSuccess();
      const msg = `Opening Withdraw Money${extractedAmount ? ` for ${formatKsh(extractedAmount)}` : ''}...`;
      setFeedback({ type: 'success', text: msg });
      speakResponse(msg);
      setTimeout(() => {
        onExecuteCommand({
          intent: 'withdraw_money',
          amount: extractedAmount,
          transcript: clean,
        });
        onClose();
      }, 600);
      return;
    }

    // 5. Deposit / Top-up intent
    if (lower.includes('deposit') || lower.includes('top up') || lower.includes('topup') || lower.includes('stk')) {
      sound.playSuccess();
      const msg = `Opening M-PESA STK Push Deposit${extractedAmount ? ` for ${formatKsh(extractedAmount)}` : ''}...`;
      setFeedback({ type: 'success', text: msg });
      speakResponse(msg);
      setTimeout(() => {
        onExecuteCommand({
          intent: 'deposit_money',
          amount: extractedAmount,
          transcript: clean,
        });
        onClose();
      }, 600);
      return;
    }

    // 6. Notifications / SMS
    if (lower.includes('notification') || lower.includes('sms') || lower.includes('messages')) {
      sound.playSuccess();
      setFeedback({ type: 'success', text: 'Opening Live M-PESA Notifications...' });
      setTimeout(() => {
        onExecuteCommand({
          intent: 'open_notifications',
          transcript: clean,
        });
        onClose();
      }, 500);
      return;
    }

    // 7. Account Profile
    if (lower.includes('profile') || lower.includes('account') || lower.includes('phone number')) {
      sound.playSuccess();
      setFeedback({ type: 'success', text: 'Opening M-PESA Account Profile...' });
      setTimeout(() => {
        onExecuteCommand({
          intent: 'edit_account',
          transcript: clean,
        });
        onClose();
      }, 500);
      return;
    }

    // 8. Daraja API
    if (lower.includes('daraja') || lower.includes('api') || lower.includes('gateway')) {
      sound.playSuccess();
      setFeedback({ type: 'success', text: 'Opening Safaricom Daraja API Settings...' });
      setTimeout(() => {
        onExecuteCommand({
          intent: 'open_daraja',
          transcript: clean,
        });
        onClose();
      }, 500);
      return;
    }

    sound.playError();
    setFeedback({
      type: 'error',
      text: `Unrecognized command "${clean}". Try saying "Send money", "Check balance", "Withdraw", or "Deposit".`,
    });
  };

  const startListening = () => {
    setFeedback(null);
    setTranscript('');

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setFeedback({
        type: 'error',
        text: 'Browser SpeechRecognition API is not supported in this browser. Use the quick voice command chips below.',
      });
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        sound.playClick();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        setTranscript(currentTranscript);
        if (isFinal) {
          setIsListening(false);
          parseAndExecute(currentTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setFeedback({
            type: 'error',
            text: 'Microphone access was denied. Please allow microphone permissions or tap a command below.',
          });
        } else if (event.error !== 'aborted') {
          setFeedback({
            type: 'info',
            text: 'No speech detected. Tap the microphone to speak again or select a command below.',
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setFeedback({
        type: 'error',
        text: 'Could not start microphone recognition. Tap any command below to execute.',
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const quickCommands = [
    'Send money',
    'Check balance',
    'Send 1500 to Purity',
    'Withdraw 2000',
    'Deposit 5000',
    'Edit balance',
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-3xl p-6 shadow-2xl relative text-[#E4E4E7]"
        >
          <button
            id="btn-close-voice-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-[11px] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>M-PESA VOICE COMMAND</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {isListening ? 'Listening for Command...' : 'Tap Mic to Speak'}
            </h3>
            <p className="text-xs text-[#71717A] mt-1">
              Say <span className="text-[#E4E4E7] font-medium">"Send money"</span>, <span className="text-[#E4E4E7] font-medium">"Check balance"</span>, or <span className="text-[#E4E4E7] font-medium">"Withdraw 2000"</span>
            </p>
          </div>

          {/* Animated Microphone Orb */}
          <div className="flex flex-col items-center justify-center my-6">
            <div className="relative flex items-center justify-center">
              {isListening && (
                <>
                  <span className="absolute w-24 h-24 rounded-full bg-[#10B981]/25 animate-ping" />
                  <span className="absolute w-20 h-20 rounded-full bg-[#10B981]/15 animate-pulse" />
                </>
              )}
              <button
                id="btn-voice-mic-orb"
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-18 h-18 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                  isListening
                    ? 'bg-[#10B981] text-[#0A0A0B] shadow-[#10B981]/40 scale-105'
                    : 'bg-[#27272A] hover:bg-[#3F3F46] text-[#10B981] border border-[#3F3F46]'
                }`}
                title={isListening ? 'Stop Listening' : 'Start Listening'}
              >
                {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-7 h-7" />}
              </button>
            </div>

            {/* Live Transcript Display */}
            <div className="w-full mt-5 min-h-[48px] px-4 py-3 rounded-2xl bg-[#111113] border border-[#27272A] flex items-center justify-center text-center">
              {transcript ? (
                <p className="text-sm font-mono text-white font-semibold">
                  "{transcript}"
                </p>
              ) : (
                <p className="text-xs text-[#71717A] italic">
                  {isListening ? 'Speak clearly into your microphone...' : 'Microphone paused — tap orb to listen'}
                </p>
              )}
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 mb-5 ${
                feedback.type === 'success'
                  ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                  : feedback.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-[#111113] border-[#27272A] text-[#A1A1AA]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{feedback.text}</p>
              </div>
            </div>
          )}

          {/* Quick Command Triggers */}
          <div>
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block mb-2">
              Try Saying or Tap a Command
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickCommands.map(cmd => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => {
                    setTranscript(cmd);
                    parseAndExecute(cmd);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#111113] hover:bg-[#27272A] border border-[#27272A] hover:border-[#10B981]/40 text-xs text-[#E4E4E7] hover:text-[#10B981] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-[#10B981]" />
                  <span>"{cmd}"</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
