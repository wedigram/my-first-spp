/**
 * M-Pesa formatting, validation, tariff calculations, and official SMS generators.
 */

// Generate authentic 10-character alphanumeric Safaricom transaction reference
export function generateMpesaCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '0123456789';
  const firstTwo = letters.charAt(Math.floor(Math.random() * letters.length)) + 
                   letters.charAt(Math.floor(Math.random() * letters.length));
  
  let rest = '';
  const pool = letters + numbers;
  for (let i = 0; i < 8; i++) {
    rest += pool.charAt(Math.floor(Math.random() * pool.length));
  }
  return firstTwo + rest;
}

// Format phone number to standard Kenyan format (2547XXXXXXXX or 2541XXXXXXXX)
export function normalizeKenyanPhone(phone: string): { formatted: string; isValid: boolean; display: string } {
  let cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  } else if (cleaned.startsWith('1') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }

  const isValid = /^254[17][0-9]{8}$/.test(cleaned);
  
  // Pretty display format: +254 712 345 678
  let display = phone;
  if (isValid && cleaned.length === 12) {
    display = `+254 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  return {
    formatted: cleaned,
    isValid,
    display: isValid ? display : phone,
  };
}

// Calculate Safaricom M-Pesa tariff
export function calculateMpesaFee(amount: number, type: 'send' | 'withdraw' | 'paybill' | 'buy_goods' | 'deposit'): number {
  if (amount <= 0) return 0;
  if (type === 'deposit' || type === 'buy_goods') return 0;

  if (type === 'send') {
    if (amount <= 100) return 0;
    if (amount <= 500) return 7;
    if (amount <= 1000) return 13;
    if (amount <= 2500) return 23;
    if (amount <= 5000) return 35;
    if (amount <= 10000) return 57;
    if (amount <= 20000) return 78;
    if (amount <= 35000) return 90;
    if (amount <= 50000) return 108;
    if (amount <= 150000) return 108;
    if (amount <= 250000) return 108;
    return 108;
  }

  if (type === 'withdraw') {
    if (amount <= 100) return 0;
    if (amount <= 500) return 11;
    if (amount <= 2500) return 29;
    if (amount <= 5000) return 69;
    if (amount <= 10000) return 115;
    if (amount <= 20000) return 185;
    if (amount <= 35000) return 202;
    if (amount <= 50000) return 280;
    if (amount <= 150000) return 309;
    if (amount <= 250000) return 309;
    return 309;
  }

  if (type === 'paybill') {
    if (amount <= 100) return 0;
    if (amount <= 500) return 5;
    if (amount <= 1000) return 9;
    if (amount <= 5000) return 23;
    if (amount <= 10000) return 35;
    return 45;
  }

  return 0;
}

// Currency formatter
export function formatKsh(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('KES', 'Ksh');
}

// Format timestamp to Safaricom style: "24/8/26 at 10:28 PM"
export function formatMpesaDate(isoString: string): string {
  const d = new Date(isoString);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear().toString().slice(-2);
  
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
}

// Generate authentic official Safaricom SMS text
export function generateOfficialMpesaSms(options: {
  code: string;
  type: string;
  amount: number;
  fee: number;
  recipientName: string;
  recipientPhoneOrAccount: string;
  newBalance: number;
  timestamp: string;
  method?: string;
  notes?: string;
}): string {
  const { code, type, amount, fee, recipientName, recipientPhoneOrAccount, newBalance, timestamp } = options;
  const dateStr = formatMpesaDate(timestamp);
  const formattedAmt = new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  const formattedBal = new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(newBalance);
  const formattedFee = new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fee);

  if (type === 'send') {
    return `${code} Confirmed. Ksh ${formattedAmt} sent to ${recipientName.toUpperCase()} ${recipientPhoneOrAccount} on ${dateStr}. New M-PESA balance is Ksh ${formattedBal}. Transaction cost, Ksh ${formattedFee}.`;
  }

  if (type === 'withdraw') {
    return `${code} Confirmed. on ${dateStr} Withdraw Ksh ${formattedAmt} from ${recipientName.toUpperCase()} ${recipientPhoneOrAccount}. New M-PESA balance is Ksh ${formattedBal}. Transaction cost, Ksh ${formattedFee}.`;
  }

  if (type === 'deposit') {
    return `${code} Confirmed. on ${dateStr} Received Ksh ${formattedAmt} via M-PESA Express STK Push from ${recipientPhoneOrAccount}. New M-PESA balance is Ksh ${formattedBal}. Transaction cost, Ksh 0.00.`;
  }

  if (type === 'received') {
    return `${code} Confirmed. You have received Ksh ${formattedAmt} from ${recipientName.toUpperCase()} ${recipientPhoneOrAccount} on ${dateStr}. New M-PESA balance is Ksh ${formattedBal}.`;
  }

  if (type === 'paybill' || type === 'buy_goods') {
    return `${code} Confirmed. Ksh ${formattedAmt} paid to ${recipientName.toUpperCase()} on ${dateStr}. New M-PESA balance is Ksh ${formattedBal}. Transaction cost, Ksh ${formattedFee}.`;
  }

  if (type === 'balance_adjustment') {
    return `${code} Confirmed. on ${dateStr} Account balance updated to Ksh ${formattedBal}. Ref: ${options.notes || 'Balance update'}.`;
  }

  return `${code} Confirmed. Transaction of Ksh ${formattedAmt} on ${dateStr} completed successfully. New M-PESA balance is Ksh ${formattedBal}.`;
}

// Preset Quick Contacts for instant Send Money
export const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Purity Wanjiku', phone: '0722123456', category: 'favorite' as const, avatar: 'PW' },
  { id: 'c2', name: 'Brian Otieno', phone: '0714987654', category: 'favorite' as const, avatar: 'BO' },
  { id: 'c3', name: 'Mama Mboga Groceries', phone: '3049281', category: 'business' as const, avatar: 'MM', accountType: 'till' as const },
  { id: 'c4', name: 'Kenya Power (KPLC Prepaid)', phone: '888880', category: 'business' as const, avatar: 'KP', accountType: 'paybill' as const },
  { id: 'c5', name: 'Kipchoge Keino', phone: '0799443322', category: 'recent' as const, avatar: 'KK' },
  { id: 'c6', name: 'Nairobi Water', phone: '444400', category: 'business' as const, avatar: 'NW', accountType: 'paybill' as const },
];
