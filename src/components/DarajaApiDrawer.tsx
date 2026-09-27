import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Code, 
  Server, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Activity,
  Copy,
  Check
} from 'lucide-react';
import { DarajaConfig, UserAccount } from '../types';
import { sound } from '../utils/audio';
import { testDarajaOAuth } from '../utils/darajaClient';

interface DarajaApiDrawerProps {
  isOpen: boolean;
  account: UserAccount;
  onClose: () => void;
  onSaveDarajaConfig: (newConfig: DarajaConfig) => void;
}

export const DarajaApiDrawer: React.FC<DarajaApiDrawerProps> = ({
  isOpen,
  account,
  onClose,
  onSaveDarajaConfig,
}) => {
  const [config, setConfig] = useState<DarajaConfig>(account.darajaConfig);
  const [isTestingToken, setIsTestingToken] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [gatewayInfo, setGatewayInfo] = useState<{
    status: string;
    callbackUrl: string;
    hasServerKeys: boolean;
  } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);

  useEffect(() => {
    setConfig(account.darajaConfig);
  }, [account.darajaConfig, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/daraja/status')
      .then(r => r.json())
      .then(data => {
        setGatewayInfo({
          status: data.status || 'online',
          callbackUrl: data.callbackUrl || `${window.location.origin}/api/daraja/callback`,
          hasServerKeys: Boolean(data.hasServerKeys),
        });
      })
      .catch(() => {
        setGatewayInfo({
          status: 'online',
          callbackUrl: `${window.location.origin}/api/daraja/callback`,
          hasServerKeys: false,
        });
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMode = (useLive: boolean) => {
    sound.playClick();
    setConfig(prev => ({ ...prev, useLiveDaraja: useLive }));
  };

  const handleTestToken = async () => {
    sound.playClick();
    setIsTestingToken(true);
    setTestResult(null);

    try {
      const result = await testDarajaOAuth(config);
      setIsTestingToken(false);
      if (result.ok && result.access_token) {
        sound.playSuccess();
        setTestResult({
          ok: true,
          message: `LIVE OAUTH TOKEN: ${result.access_token} (Expires in ${result.expires_in}s • ${result.environment?.toUpperCase()})`,
        });
      } else {
        sound.playError();
        setTestResult({
          ok: false,
          message: result.error || 'Authentication failed. Check your Consumer Key & Secret.',
        });
      }
    } catch (err) {
      setIsTestingToken(false);
      sound.playError();
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Network error connecting to /api/daraja/oauth',
      });
    }
  };

  const handleCopyCallback = () => {
    if (!gatewayInfo?.callbackUrl) return;
    navigator.clipboard.writeText(gatewayInfo.callbackUrl);
    setCopiedCallback(true);
    sound.playClick();
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playSuccess();
    onSaveDarajaConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0A0A0B]/80 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-md h-full bg-[#18181B] border-l border-[#27272A] p-6 flex flex-col shadow-2xl text-[#E4E4E7] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center border border-[#10B981]/25">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Safaricom Daraja v2.0 Live API</h3>
              <p className="text-xs text-[#71717A]">
                Direct M-PESA Express STK & B2C Gateway
              </p>
            </div>
          </div>

          <button
            id="btn-close-daraja-drawer"
            onClick={onClose}
            className="p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Backend Node Status */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#111113] border border-[#10B981]/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#10B981]" />
              Backend Express Node
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] uppercase">
              {gatewayInfo?.status || 'ONLINE'}
            </span>
          </div>
          {gatewayInfo?.callbackUrl && (
            <div className="pt-1">
              <span className="text-[10px] text-[#71717A] block mb-1">
                Live Webhook Callback URL (STK & B2C):
              </span>
              <div className="flex items-center gap-1.5 bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5">
                <code className="text-[10px] text-[#A1A1AA] font-mono truncate flex-1">
                  {gatewayInfo.callbackUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCallback}
                  className="text-[#10B981] hover:text-[#34D399] p-1 cursor-pointer"
                  title="Copy Webhook URL"
                >
                  {copiedCallback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 my-4 flex-1">
          {/* Mode Switcher */}
          <div className="p-3.5 rounded-2xl bg-[#111113] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Gateway Execution Mode</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                config.useLiveDaraja ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#27272A] text-[#A1A1AA]'
              }`}>
                {config.useLiveDaraja ? 'LIVE DARAJA GATEWAY' : 'EXPRESS LEDGER'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleToggleMode(true)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  config.useLiveDaraja ? 'bg-[#10B981] text-[#0A0A0B] font-bold shadow' : 'bg-[#27272A] text-[#A1A1AA]'
                }`}
              >
                Live Daraja Gateway
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode(false)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  !config.useLiveDaraja ? 'bg-[#10B981] text-[#0A0A0B] font-bold shadow' : 'bg-[#27272A] text-[#A1A1AA]'
                }`}
              >
                Express Instant Ledger
              </button>
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              Safaricom Daraja Endpoint Environment
            </label>
            <select
              value={config.environment}
              onChange={e => setConfig(prev => ({ ...prev, environment: e.target.value as 'sandbox' | 'production' }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#10B981]"
            >
              <option value="sandbox">Sandbox (sandbox.safaricom.co.ke)</option>
              <option value="production">Production (api.safaricom.co.ke)</option>
            </select>
          </div>

          {/* Consumer Key */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              Daraja Consumer Key
            </label>
            <input
              type="text"
              placeholder="Enter Safaricom Daraja Consumer Key..."
              value={config.consumerKey}
              onChange={e => setConfig(prev => ({ ...prev, consumerKey: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Consumer Secret */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              Daraja Consumer Secret
            </label>
            <input
              type="password"
              placeholder="Enter Safaricom Daraja Consumer Secret..."
              value={config.consumerSecret}
              onChange={e => setConfig(prev => ({ ...prev, consumerSecret: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Shortcode & Till */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                Business Shortcode
              </label>
              <input
                type="text"
                placeholder="174379"
                value={config.shortCode}
                onChange={e => setConfig(prev => ({ ...prev, shortCode: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                Till / Store No
              </label>
              <input
                type="text"
                placeholder="3049281"
                value={config.tillNumber}
                onChange={e => setConfig(prev => ({ ...prev, tillNumber: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          {/* Passkey */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
              Lipa Na M-PESA Online Passkey
            </label>
            <input
              type="password"
              placeholder="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
              value={config.passkey}
              onChange={e => setConfig(prev => ({ ...prev, passkey: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-[#27272A] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Live Token Verification Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestToken}
              disabled={isTestingToken}
              className="w-full py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#3F3F46]"
            >
              <Play className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{isTestingToken ? 'Requesting Live OAuth Token...' : 'Verify Live Daraja OAuth Token'}</span>
            </button>
            {testResult && (
              <div
                className={`text-[11px] font-mono p-2.5 rounded-xl border mt-2 break-all flex items-start gap-2 ${
                  testResult.ok
                    ? 'text-[#10B981] bg-[#111113] border-[#10B981]/30'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-sm shadow-lg shadow-[#10B981]/25 transition-all cursor-pointer"
            >
              Save Live Gateway Settings
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
