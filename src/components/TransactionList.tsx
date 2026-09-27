import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  Store, 
  Building2, 
  FileDown, 
  Calendar,
  Receipt,
  CheckCircle2,
  Clock,
  Download
} from 'lucide-react';
import { Transaction } from '../types';
import { formatKsh, formatMpesaDate } from '../utils/mpesa';
import { sound } from '../utils/audio';

interface TransactionListProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
  onOpenSendModal: () => void;
  onOpenDepositModal: () => void;
}

type FilterType = 'all' | 'send' | 'received' | 'withdraw' | 'deposit' | 'merchant';

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onSelectTransaction,
  onOpenSendModal,
  onOpenDepositModal,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Category filter
      if (filterType === 'send' && tx.type !== 'send') return false;
      if (filterType === 'received' && tx.type !== 'received') return false;
      if (filterType === 'withdraw' && tx.type !== 'withdraw') return false;
      if (filterType === 'deposit' && tx.type !== 'deposit') return false;
      if (filterType === 'merchant' && (tx.type !== 'paybill' && tx.type !== 'buy_goods')) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tx.code.toLowerCase().includes(q) ||
        tx.recipientName.toLowerCase().includes(q) ||
        tx.recipientPhoneOrAccount.toLowerCase().includes(q) ||
        (tx.notes && tx.notes.toLowerCase().includes(q))
      );
    });
  }, [transactions, filterType, searchQuery]);

  const handleExportCsv = () => {
    sound.playClick();
    const headers = ['Code', 'Type', 'Amount (KES)', 'Fee (KES)', 'Recipient/Source', 'Account', 'Date', 'New Balance', 'Status', 'Notes'];
    const rows = filteredTransactions.map(tx => [
      tx.code,
      tx.type,
      tx.amount,
      tx.fee,
      `"${tx.recipientName.replace(/"/g, '""')}"`,
      `"${tx.recipientPhoneOrAccount}"`,
      `"${formatMpesaDate(tx.timestamp)}"`,
      tx.newBalance,
      tx.status,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mpesa_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'received':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
      case 'deposit':
        return <PlusCircle className="w-4 h-4 text-teal-400" />;
      case 'send':
        return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
      case 'withdraw':
        return <ArrowDownLeft className="w-4 h-4 text-amber-400" />;
      case 'paybill':
        return <Building2 className="w-4 h-4 text-indigo-400" />;
      case 'buy_goods':
        return <Store className="w-4 h-4 text-purple-400" />;
      case 'balance_adjustment':
        return <Receipt className="w-4 h-4 text-amber-300" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-6 sm:p-8 shadow-2xl">
      {/* Title and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Transaction Statement & Ledger</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]">
              {transactions.length} records
            </span>
          </h3>
          <p className="text-xs text-[#71717A] mt-0.5">
            Full official M-PESA statement with downloadable receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              id="input-search-transactions"
              type="text"
              placeholder="Search code, name, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#111113] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#10B981] transition-colors"
            />
          </div>

          {/* Export CSV Button */}
          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-[#E4E4E7] hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="Export M-PESA Statement as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none border-b border-[#27272A]">
        {[
          { id: 'all', label: 'All Transactions' },
          { id: 'send', label: 'Sent Money' },
          { id: 'received', label: 'Received' },
          { id: 'withdraw', label: 'Withdrawals' },
          { id: 'deposit', label: 'Deposits (STK)' },
          { id: 'merchant', label: 'Lipa na M-PESA' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`filter-tab-${tab.id}`}
            onClick={() => {
              sound.playClick();
              setFilterType(tab.id as FilterType);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === tab.id
                ? 'bg-[#10B981] text-[#0A0A0B] font-bold shadow-md shadow-[#10B981]/15'
                : 'bg-[#111113] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction List Entries */}
      {filteredTransactions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#27272A] text-[#71717A] mx-auto flex items-center justify-center mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Transactions Found</h4>
          <p className="text-xs text-[#71717A] mt-1 max-w-xs mx-auto">
            {searchQuery ? `No results matching "${searchQuery}"` : 'No transactions recorded in this category yet.'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => { sound.playClick(); onOpenSendModal(); }}
              className="px-3.5 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#0A0A0B] font-bold text-xs transition-colors cursor-pointer"
            >
              Send Money Now
            </button>
            <button
              onClick={() => { sound.playClick(); onOpenDepositModal(); }}
              className="px-3.5 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Deposit Funds
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map(tx => {
            const isInflow = tx.type === 'received' || tx.type === 'deposit';
            return (
              <div
                key={tx.id}
                id={`tx-row-${tx.id}`}
                onClick={() => {
                  sound.playClick();
                  onSelectTransaction(tx);
                }}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#111113] hover:bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] transition-all cursor-pointer group"
              >
                {/* Left info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center shrink-0 group-hover:border-[#3F3F46] group-hover:bg-[#27272A] transition-colors">
                    {getIcon(tx.type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#10B981] transition-colors">
                        {tx.recipientName}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#27272A] text-[#A1A1AA] shrink-0 border border-[#3F3F46]">
                        {tx.code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#71717A] mt-0.5">
                      <span>{tx.recipientPhoneOrAccount}</span>
                      <span>•</span>
                      <span>{formatMpesaDate(tx.timestamp)}</span>
                      {tx.fee > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#A1A1AA]">Fee: {formatKsh(tx.fee)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount */}
                <div className="text-right shrink-0 ml-3">
                  <p className={`text-xs sm:text-sm font-mono font-bold ${
                    isInflow ? 'text-[#10B981]' : 'text-[#E4E4E7]'
                  }`}>
                    {isInflow ? '+' : '-'}{formatKsh(tx.amount)}
                  </p>
                  <p className="text-[10px] font-mono text-[#71717A] mt-0.5">
                    Bal: {formatKsh(tx.newBalance)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
