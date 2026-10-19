/**
 * SM Concrete Tech - Cash Memo & Billing Payment Utilities
 * Normalizes bill record to ensure complete backward compatibility
 * Tracks payments array, paidAmount, cash vs online breakdown, balanceAmount, and paymentStatus.
 */

export const normalizeBill = (b) => {
  if (!b) return b;
  const finalAmount = Number(b.finalAmount) || (Number(b.totalAmount || 0) + Number(b.transportation || 0));
  const payments = Array.isArray(b.payments) ? b.payments : [];

  // When payments array has records, paidAmount is the direct authoritative sum of all transactions
  const paidAmount = payments.length > 0
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(b.paidAmount || 0);

  const cashPaidAmount = payments.length > 0
    ? payments.filter((p) => (p.mode || '').toLowerCase().includes('cash')).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : (b.cashPaidAmount !== undefined ? Number(b.cashPaidAmount) : (b.payments ? 0 : paidAmount));

  const onlinePaidAmount = payments.length > 0
    ? payments.filter((p) => !(p.mode || '').toLowerCase().includes('cash')).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : Number(b.onlinePaidAmount || 0);

  // Outstanding balance is always strictly derived from finalAmount - paidAmount
  const balanceAmount = Math.max(0, finalAmount - paidAmount);

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
