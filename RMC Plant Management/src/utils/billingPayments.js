/**
 * SM Concrete Tech - Cash Memo & Billing Payment Utilities
 * Normalizes bill record to ensure complete backward compatibility
 * Tracks payments array, paidAmount, cash vs online breakdown, balanceAmount, and paymentStatus.
 */

/**
 * Safe currency helper that rounds to 2 decimal places avoiding IEEE-754 floating drift.
 * Handles half-up rounding accurately (e.g., 1.005 -> 1.01).
 * Supports large sums and returns exactly rounded 2-decimal numbers.
 */
export const roundCurrency = (val) => {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  if (!isFinite(num)) return 0;
  if (Math.abs(num) < 1e-9) return 0;
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  const rounded = Math.round((abs + Number.EPSILON) * 100) / 100;
  return sign * rounded;
};

export const normalizeBill = (b) => {
  if (!b) return b;
  const rawFinal = Number(b.finalAmount) || (Number(b.totalAmount || 0) + Number(b.transportation || 0));
  const finalAmount = roundCurrency(rawFinal);
  const payments = Array.isArray(b.payments) ? b.payments : [];

  // When payments array has records, paidAmount is the direct authoritative sum of all transactions
  const rawPaid = payments.length > 0
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(b.paidAmount || 0);
  const paidAmount = roundCurrency(rawPaid);

  const rawCash = payments.length > 0
    ? payments.filter((p) => (p.mode || '').toLowerCase().includes('cash')).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : (b.cashPaidAmount !== undefined ? Number(b.cashPaidAmount) : (b.payments ? 0 : paidAmount));
  const cashPaidAmount = roundCurrency(rawCash);

  const rawOnline = payments.length > 0
    ? payments.filter((p) => !(p.mode || '').toLowerCase().includes('cash')).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : Number(b.onlinePaidAmount || 0);
  const onlinePaidAmount = roundCurrency(rawOnline);

  // Outstanding balance is always strictly derived from finalAmount - paidAmount, clamped >= 0 and rounded
  const balanceAmount = roundCurrency(Math.max(0, finalAmount - paidAmount));

  const paymentStatus = balanceAmount <= 0
    ? 'Paid'
    : (paidAmount > 0 ? 'Partially Paid' : (b.paymentStatus || 'Unpaid'));

  return {
    ...b,
    finalAmount,
    paidAmount,
    cashPaidAmount,
    onlinePaidAmount,
    balanceAmount,
    paymentStatus,
    payments,
  };
};

/**
 * Parses any common ERP date string (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, ISO)
 * into a Date object at day-level granularity (hours/mins zeroed) for precise comparison.
 */
export const parseToDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
  }

  // DD-MMM-YYYY (e.g. 01-Oct-2026, 20-OCT-2026)
  const dMmmMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})/);
  if (dMmmMatch) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const m = months[dMmmMatch[2].toLowerCase()];
    if (m !== undefined) {
      return new Date(parseInt(dMmmMatch[3], 10), m, parseInt(dMmmMatch[1], 10));
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
};

/**
 * Formats a date string cleanly to DD/MM/YYYY for presentation.
 */
export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = parseToDateOnly(dateStr);
  if (!d) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formats a number to Indian currency representation.
 */
export const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Returns exact user-entered payment information / description.
 * Displays verbatim without auto-overwriting or categorizing.
 */
export const getBillDescription = (bill) => {
  if (!bill) return '-';
  if (bill.description && typeof bill.description === 'string' && bill.description.trim()) {
    return bill.description.trim();
  }
  if (bill.paymentRemarks && typeof bill.paymentRemarks === 'string' && bill.paymentRemarks.trim()) {
    return bill.paymentRemarks.trim();
  }
  if (bill.initialPaymentRemarks && typeof bill.initialPaymentRemarks === 'string' && bill.initialPaymentRemarks.trim()) {
    return bill.initialPaymentRemarks.trim();
  }
  if (Array.isArray(bill.payments) && bill.payments.length > 0) {
    const paymentDescriptions = bill.payments
      .map((p) => (p.description || p.remarks || '').trim())
      .filter((s) => s.length > 0);
    if (paymentDescriptions.length > 0) {
      return paymentDescriptions.join(', ');
    }
  }
  if (bill.remarks && typeof bill.remarks === 'string' && bill.remarks.trim()) {
    return bill.remarks.trim();
  }
  return '-';
};
