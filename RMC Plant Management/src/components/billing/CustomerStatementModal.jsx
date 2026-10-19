import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ArrowLeft,
  FileText,
  Building2,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Banknote,
  QrCode,
  Truck,
  ShieldCheck,
  User,
  Layers,
  ChevronDown
} from 'lucide-react';
import { STAMP_IMAGE_BASE64, COMMON_SEAL_IMAGE_BASE64 } from './billingAssets';
import { normalizeBill } from '../../utils/billingPayments';

export default function CustomerStatementModal({
  customerName,
  allBills = [],
  uniqueCustomers = [],
  onSelectCustomer,
  onClose,
}) {
  const [selectedCust, setSelectedCust] = useState(customerName || 'Cash Customer');
  const printRef = useRef(null);

  useEffect(() => {
    setSelectedCust(customerName || 'Cash Customer');
  }, [customerName]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    document.body.classList.add('cash-memo-printing-active');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('cash-memo-printing-active');
    }, 50);
  };

  // Filter bills for the selected customer
  const customerBills = allBills
    .map(normalizeBill)
    .filter(
      (b) =>
        (b.customerName || 'Cash Customer').trim().toLowerCase() ===
        (selectedCust || '').trim().toLowerCase()
    );

  // Extract customer contact & sites
  const customerMobile =
    customerBills.find((b) => b.customerMobile)?.customerMobile ||
    customerBills.find((b) => b.mobile)?.mobile ||
    'Not Provided';

  const sites = Array.from(
    new Set(customerBills.map((b) => b.site || b.place).filter(Boolean))
  );

  const vehicles = Array.from(
    new Set(customerBills.map((b) => b.vehicle).filter(Boolean))
  );

  // Aggregate financials
  const totalBilled = customerBills.reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);
  const totalPaid = customerBills.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0);
  const totalCash = customerBills.reduce((s, b) => s + (Number(b.cashPaidAmount) || 0), 0);
  const totalOnline = customerBills.reduce((s, b) => s + (Number(b.onlinePaidAmount) || 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  // Calculate concrete volume
  const totalConcreteVolume = customerBills.reduce((sum, b) => {
    const items = b.items || [];
    const vol = items.reduce((iSum, it) => {
      const isM3 = (it.unit || '').toLowerCase().includes('m') || (it.material || '').toLowerCase().includes('concrete');
      return iSum + (isM3 ? Number(it.qty) || 0 : 0);
    }, 0);
    return sum + vol;
  }, 0);

  // Compile individual payments across all bills
  const allPayments = [];
  customerBills.forEach((b) => {
    if (Array.isArray(b.payments) && b.payments.length > 0) {
      b.payments.forEach((p) => {
        allPayments.push({
          ...p,
          billNo: b.billNo,
          billDate: b.date,
        });
      });
    }
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const modalContent = (
    <div
      className="cash-memo-modal-overlay fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:block animate-fade-in"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="cash-memo-modal-container bg-white text-slate-900 w-full max-w-[850px] max-h-[96vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:h-auto print:w-full print:border-none print:m-0 print:p-0 print:overflow-visible print:block my-auto print:my-0">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold tracking-wide">Customer Statement of Account</h3>
            </div>
          </div>

          {/* Customer Switcher inside Modal */}
          <div className="flex items-center gap-2">
            {uniqueCustomers.length > 1 && (
              <div className="relative">
                <select
                  value={selectedCust}
                  onChange={(e) => {
                    setSelectedCust(e.target.value);
                    if (onSelectCustomer) onSelectCustomer(e.target.value);
                  }}
                  className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 pr-7 border border-slate-700 font-bold focus:outline-none focus:border-amber-400 appearance-none cursor-pointer"
                >
                  {uniqueCustomers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Document */}
        <div className="cash-memo-scroll-area p-3 sm:p-5 overflow-y-auto bg-slate-100/70 flex-1 print:bg-white print:p-0 print:overflow-visible print:block print:w-full">
          <div
            ref={printRef}
            className="cash-memo-printable bg-white text-black border border-black w-full max-w-[780px] mx-auto text-xs leading-normal font-sans select-text shadow-sm print:shadow-none print:border print:border-black p-4 sm:p-6"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* Document Header */}
            <div className="text-center pb-3 border-b-2 border-black">
              <h1 className="text-2xl font-bold tracking-wider text-black font-sans uppercase">
                SM CONCRETECH
              </h1>
              <p className="text-xs text-black mt-0.5">
                Ready Mix Concrete Manufacturing & Pumping Services
              </p>
              <p className="text-xs text-black mt-0.5">
                A/P Tanang, Sangli - 416410 • Contact: +91 9421858683 / +91 9373488061
              </p>
              <div className="mt-2 inline-block px-4 py-1 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xs">
                Customer Statement of Account
              </div>
            </div>

            {/* Customer Details & Period Grid */}
            <div className="grid grid-cols-2 gap-4 py-3 border-b border-black text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-black uppercase tracking-wider text-[11px]">Customer / Party:</span>
                  <span className="font-bold text-sm text-black">{selectedCust}</span>
                </div>
                <div>
                  <span className="font-semibold text-black">Contact Mobile: </span>
                  <span className="font-mono text-black">{customerMobile}</span>
                </div>
                <div>
                  <span className="font-semibold text-black">Delivery Sites: </span>
                  <span className="text-black">{sites.join(', ') || 'Tanang Site Zone'}</span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div>
                  <span className="font-semibold text-black">Statement Date: </span>
                  <span className="font-bold font-mono text-black">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-black">Total Cash Memos: </span>
                  <span className="font-mono font-bold text-black">{customerBills.length}</span>
                </div>
                {totalConcreteVolume > 0 && (
                  <div>
                    <span className="font-semibold text-black">Total Concrete Supplied: </span>
                    <span className="font-mono font-bold text-black">{totalConcreteVolume} m³</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="my-3 border border-black bg-slate-50/70 p-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="border-r border-black/40 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Total Invoiced</span>
                <span className="font-mono font-black text-black text-sm block mt-0.5">
                  ₹ {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-r border-black/40 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Cash Received</span>
                <span className="font-mono font-bold text-black text-sm block mt-0.5">
                  ₹ {totalCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-r border-black/40 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Online / UPI</span>
                <span className="font-mono font-bold text-black text-sm block mt-0.5">
                  ₹ {totalOnline.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Balance Due</span>
                <span className={`font-mono font-black text-sm block mt-0.5 ${balanceDue > 0 ? 'text-black' : 'text-emerald-700'}`}>
                  ₹ {balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  {balanceDue === 0 && ' ✓'}
                </span>
              </div>
            </div>

            {/* Detailed Memos / Bills Table */}
            <div className="mt-3">
              <div className="font-bold text-xs uppercase tracking-wider text-black mb-1">
                1. Chronological Bills & Dispatch Register
              </div>
              <table className="w-full border-collapse border border-black text-[11px] text-left">
                <thead>
                  <tr className="border-b border-black bg-slate-100 font-bold text-black">
                    <th className="py-1 px-1.5 border-r border-black w-[5%] text-center">#</th>
                    <th className="py-1 px-2 border-r border-black w-[16%]">Bill No & Date</th>
                    <th className="py-1 px-2 border-r border-black w-[14%]">Const. Date</th>
                    <th className="py-1 px-2 border-r border-black w-[15%]">Vehicle / Site</th>
                    <th className="py-1 px-2 border-r border-black w-[20%]">Material Items</th>
                    <th className="py-1 px-2 border-r border-black w-[10%] text-right">Billed (₹)</th>
                    <th className="py-1 px-2 border-r border-black w-[10%] text-right">Paid (₹)</th>
                    <th className="py-1 px-2 text-right w-[10%]">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {customerBills.length > 0 ? (
                    customerBills.map((b, idx) => {
                      const constDate = b.constructionDate || b.date;
                      return (
                        <tr key={b.id || idx} className="border-b border-black/70">
                          <td className="py-1 px-1 border-r border-black text-center font-mono">{idx + 1}</td>
                          <td className="py-1 px-2 border-r border-black font-mono">
                            <span className="font-bold">#{b.billNo}</span>
                            <div className="text-[10px] text-slate-600">{b.date}</div>
                          </td>
                          <td className="py-1 px-2 border-r border-black font-mono text-[10px]">
                            {constDate}
                          </td>
                          <td className="py-1 px-2 border-r border-black">
                            <div className="font-mono font-bold text-[10px]">{b.vehicle || 'Direct'}</div>
                            <div className="text-[10px] text-slate-600 truncate">{b.site || b.place || 'Tanang'}</div>
                          </td>
                          <td className="py-1 px-2 border-r border-black text-[10px]">
                            {(b.items || []).map((it) => `${it.material} (${it.qty} ${it.unit})`).join(', ') || 'Concrete'}
                          </td>
                          <td className="py-1 px-2 border-r border-black text-right font-mono font-bold">
                            {Number(b.finalAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-1 px-2 border-r border-black text-right font-mono text-emerald-800 font-bold">
                            {Number(b.paidAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-black">
                            {Number(b.balanceAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-500 italic">
                        No bills recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-black text-[11px]">
                    <td colSpan={5} className="py-1 px-2 border-r border-black text-right uppercase">
                      Total Ledger Balance:
                    </td>
                    <td className="py-1 px-2 border-r border-black text-right font-mono font-black">
                      ₹ {totalBilled.toLocaleString('en-IN')}
                    </td>
                    <td className="py-1 px-2 border-r border-black text-right font-mono font-black text-emerald-800">
                      ₹ {totalPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-black">
                      ₹ {balanceDue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Transactions Log */}
            {allPayments.length > 0 && (
              <div className="mt-4">
                <div className="font-bold text-xs uppercase tracking-wider text-black mb-1">
                  2. Payment Transactions & Receipts Log ({allPayments.length})
                </div>
                <table className="w-full border-collapse border border-black text-[10px] text-left">
                  <thead>
                    <tr className="border-b border-black bg-slate-100 font-bold">
                      <th className="py-1 px-1.5 border-r border-black w-[5%] text-center">#</th>
                      <th className="py-1 px-2 border-r border-black w-[15%]">Date & Time</th>
                      <th className="py-1 px-2 border-r border-black w-[15%]">Against Bill #</th>
                      <th className="py-1 px-2 border-r border-black w-[12%]">Payment Mode</th>
                      <th className="py-1 px-2 border-r border-black w-[18%]">Reference / Note</th>
                      <th className="py-1 px-2 border-r border-black w-[20%]">Received By</th>
                      <th className="py-1 px-2 text-right w-[15%]">Amount Paid (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map((p, pIdx) => (
                      <tr key={p.id || pIdx} className="border-b border-black/50">
                        <td className="py-1 px-1 border-r border-black text-center font-mono">{pIdx + 1}</td>
                        <td className="py-1 px-2 border-r border-black font-mono">
                          {p.date} {p.time && `• ${p.time}`}
                        </td>
                        <td className="py-1 px-2 border-r border-black font-mono font-bold">
                          #{p.billNo}
                        </td>
                        <td className="py-1 px-2 border-r border-black font-bold">
                          {p.mode || 'Cash'}
                        </td>
                        <td className="py-1 px-2 border-r border-black truncate">
                          {p.referenceNo || p.remarks || 'Direct Payment'}
                        </td>
                        <td className="py-1 px-2 border-r border-black truncate">
                          {p.receivedBy || 'Cashier / Supervisor'}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-800">
                          ₹ {Number(p.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures & Seal Section */}
            <div className="mt-8 pt-3 border-t border-black flex items-end justify-between text-xs">
              {/* Common Seal */}
              <div className="w-[30%] flex flex-col items-center justify-center">
                <div className="min-h-[50px] flex items-center justify-center py-0.5">
                  <img
                    src={COMMON_SEAL_IMAGE_BASE64 || '/sm_concretech_seal.png'}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-[65px] h-auto object-contain"
                  />
                </div>
                <div className="text-center font-normal border-t border-black w-full pt-1 text-[11px]">
                  Common Seal
                </div>
              </div>

              {/* Terms Note */}
              <div className="text-center text-[10px] text-slate-600 px-3 max-w-[260px]">
                Computer Generated Account Statement. Maintained on official accounts server.
              </div>

              {/* Stamp & Authorized Signatory */}
              <div className="w-[35%] flex flex-col items-center justify-center">
                <div className="min-h-[50px] flex items-center justify-center py-0.5">
                  <img
                    src={STAMP_IMAGE_BASE64 || '/sm_concretech_stamp.png'}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-[125px] h-auto object-contain"
                  />
                </div>
                <div className="text-center font-bold border-t border-black w-full pt-1 text-[11px]">
                  For SM CONCRETECH<br />
                  <span className="font-normal text-[10px]">Authorised Signatory</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="no-print p-3 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified Customer Ledger • Official SM CONCRETECH format</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
