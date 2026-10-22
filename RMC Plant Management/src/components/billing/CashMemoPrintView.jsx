import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ArrowLeft, ShieldCheck } from 'lucide-react';
import { numberToIndianWords } from '../../utils/numberToWords';
import { STAMP_IMAGE_BASE64, COMMON_SEAL_IMAGE_BASE64 } from './billingAssets';
import { normalizeBill } from '../../utils/billingPayments';

export default function CashMemoPrintView({ bill, onClose, onPrint }) {
  const printRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('cash-memo-printing-active');
    const handleBeforePrint = () => {
      document.body.classList.add('cash-memo-printing-active');
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('cash-memo-printing-active');
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!bill) return null;

  const handleNativePrint = () => {
    document.body.classList.add('cash-memo-printing-active');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '11-Oct-2025';
    try {
      const parts = dateStr.includes('-') ? dateStr.split('-') : (dateStr.includes('/') ? dateStr.split('/') : null);
      if (parts && parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
        const day = parts[0].padStart(2, '0');
        const mIdx = parseInt(parts[1], 10) - 1;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (mIdx >= 0 && mIdx < 12) {
          return `${day}-${months[mIdx]}-${parts[2]}`;
        }
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatRate = (val) => {
    const num = Number(val) || 0;
    return num % 1 === 0 
      ? num.toLocaleString('en-IN') 
      : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const items = bill.items && bill.items.length > 0 ? bill.items : [
    {
      sn: 1,
      material: bill.material || 'Pump',
      qty: bill.qty || 1,
      unit: bill.unit || 'Unit',
      rate: bill.rate || 6000,
      total: bill.total || 6000,
    }
  ];

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalAmount = Number(bill.totalAmount || items.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
  const transportation = Number(bill.transportation || 0);
  const finalAmount = totalAmount + transportation;

  let amountInWords = bill.amountInWords || numberToIndianWords(finalAmount);
  if (!amountInWords.toLowerCase().includes('rupees')) {
    amountInWords = numberToIndianWords(finalAmount);
  }

  // Payment Tracking Calculations (Normalized across Cash vs Online History)
  const normBill = normalizeBill(bill);
  const payments = normBill.payments || [];
  const paidAmount = normBill.paidAmount || 0;
  const cashPaidAmount = normBill.cashPaidAmount || 0;
  const onlinePaidAmount = normBill.onlinePaidAmount || 0;
  const balanceAmount = normBill.balanceAmount !== undefined ? normBill.balanceAmount : Math.max(0, finalAmount - paidAmount);

  // Calculate table filler height to maintain the authentic pre-printed memo look
  const fillerHeight = Math.max(140, 280 - (items.length * 30));

  const modalContent = (
    <div 
      className="cash-memo-modal-overlay fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:block animate-fade-in"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Modal Dialog Card */}
      <div className="cash-memo-modal-container bg-white text-slate-900 w-full max-w-[760px] max-h-[95vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:h-auto print:w-full print:border-none print:m-0 print:p-0 print:overflow-visible print:block my-auto print:my-0">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer shrink-0"
              title="Go Back (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-white" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold tracking-wide truncate text-white">
                Cash Memo #{bill.billNo || '25-26/114'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleNativePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            PRINTABLE CASH MEMO INVOICE (PREVIOUS EXACT FORMAT)
            ======================================================== */}
        <div className="cash-memo-scroll-area p-3 sm:p-5 overflow-y-auto overflow-x-auto bg-slate-200/50 flex-1 print:bg-white print:p-0 print:overflow-visible print:block print:w-full">
          <div 
            ref={printRef}
            className="cash-memo-printable bg-white text-black border border-black w-full max-w-[700px] mx-auto text-[13px] leading-tight font-sans select-text shadow-sm print:shadow-none print:border print:border-black"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            
            {/* Header: SM CONCRETECH */}
            <div className="text-center py-2 px-4 border-b border-black">
              <h1 className="text-2xl font-bold tracking-wider text-black font-sans uppercase">
                SM CONCRETECH
              </h1>
              <p className="text-sm font-normal text-black mt-0.5">
                A/P Tanang, Sangli - 416410
              </p>
              <p className="text-sm font-normal text-black mt-0.5">
                +91 9421858683
              </p>
            </div>

            {/* Document Title Banner */}
            <div className="text-center py-0.5 font-bold text-sm sm:text-base border-b border-black bg-white">
              Cash Memo
            </div>

            {/* Bill Info & Place 2-Column Grid */}
            <div className="grid grid-cols-2 border-b border-black text-sm">
              <div className="py-1 px-3 border-r border-black space-y-1">
                <div>
                  <span className="font-normal text-black">Bill No: </span>
                  <span className="font-normal text-black">{bill.billNo || '25-26/114'}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Bill Date: </span>
                  <span className="font-normal text-black">{formatDate(bill.date)}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Const. Date: </span>
                  <span className="font-bold text-black">{formatDate(bill.constructionDate || bill.date)}</span>
                </div>
              </div>

              <div className="py-1 px-3 space-y-1">
                <div>
                  <span className="font-normal text-black">Vehicle: </span>
                  <span className="font-normal text-black">{bill.vehicle || ''}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Place: </span>
                  <span className="font-normal text-black">{bill.place || 'Aaudumbar'}</span>
                </div>
              </div>
            </div>

            {/* Bill To Party Banner */}
            <div className="text-center py-0.5 font-bold text-sm sm:text-base border-b border-black bg-white">
              Bill To Party
            </div>

            {/* Party Details 2-Column Grid */}
            <div className="grid grid-cols-2 border-b border-black text-sm">
              <div className="py-1 px-3 border-r border-black space-y-1">
                <div>
                  <span className="font-normal text-black">Name: </span>
                  <span className="font-normal text-black">{bill.customerName || bill.partyName || ''}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Site: </span>
                  <span className="font-normal text-black">{bill.site || ''}</span>
                </div>
              </div>

              <div className="py-1 px-3 space-y-1">
                <div>
                  <span className="font-normal text-black">Mobile: </span>
                  <span className="font-normal text-black">{bill.customerMobile || bill.mobile || ''}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Ref Name: </span>
                  <span className="font-normal text-black">{bill.refName || ''}</span>
                </div>
              </div>
            </div>

            {/* Table of Materials */}
            <div className="border-b border-black">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black font-normal">
                    <th className="py-1 px-1 border-r border-black w-[7%] text-center font-normal">SN.</th>
                    <th className="py-1 px-2 border-r border-black w-[45%] text-center font-normal">Material</th>
                    <th className="py-1 px-1 border-r border-black w-[11%] text-center font-normal">Qty</th>
                    <th className="py-1 px-1 border-r border-black w-[11%] text-center font-normal">Unit</th>
                    <th className="py-1 px-2 border-r border-black w-[12%] text-center font-normal">Rate</th>
                    <th className="py-1 px-2 w-[14%] text-center font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="font-normal">
                      <td className="py-1 px-1 border-r border-black text-center">{item.sn || idx + 1}</td>
                      <td className="py-1 px-2 border-r border-black text-left">{item.material}</td>
                      <td className="py-1 px-1 border-r border-black text-center">{item.qty}</td>
                      <td className="py-1 px-1 border-r border-black text-center">{item.unit || 'Unit'}</td>
                      <td className="py-1 px-2 border-r border-black text-right">{formatRate(item.rate)}</td>
                      <td className="py-1 px-2 text-right">{formatAmount(item.total)}</td>
                    </tr>
                  ))}

                  {/* Filler area with vertical divider borders extending to Total line */}
                  <tr style={{ height: `${fillerHeight}px` }}>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>

                  {/* Subtotal Row */}
                  <tr className="border-t border-black font-bold">
                    <td colSpan={2} className="py-1 px-3 border-r border-black text-right font-bold text-sm">
                      Total
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center font-bold">
                      {totalQty}
                    </td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="py-1 px-2 text-right font-bold text-sm">
                      {formatAmount(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary & Amount in Words Section */}
            <div className="flex border-b border-black text-sm">
              {/* Left Column: Total Amount in Words */}
              {/* Left Column: Total Amount in Words & Payment Settlement Status */}
              <div className="w-[74%] border-r border-black flex flex-col justify-between">
                <div className="py-0.5 px-2 border-b border-black font-normal text-center bg-white">
                  Total amount in words
                </div>
                <div className="py-2 px-3 font-bold text-center text-black flex items-center justify-center flex-1">
                  {amountInWords}
                </div>
                <div className="border-t border-black py-1 px-2 text-center text-xs">
                  {balanceAmount <= 0 ? (
                    <span className="font-bold text-emerald-800 uppercase tracking-wide">
                      ✓ PAID IN FULL {cashPaidAmount > 0 && `(Cash: ₹${formatAmount(cashPaidAmount)})`} {onlinePaidAmount > 0 && `(Online: ₹${formatAmount(onlinePaidAmount)})`}
                    </span>
                  ) : paidAmount > 0 ? (
                    <span className="font-bold text-amber-900 uppercase tracking-wide">
                      PARTIALLY PAID: ₹{formatAmount(paidAmount)} ({cashPaidAmount > 0 ? `Cash: ₹${formatAmount(cashPaidAmount)}` : ''}{onlinePaidAmount > 0 ? ` | Online: ₹${formatAmount(onlinePaidAmount)}` : ''}) • BALANCE DUE: ₹{formatAmount(balanceAmount)}
                    </span>
                  ) : (
                    <span className="font-bold text-slate-700 uppercase tracking-wide">
                      PAYMENT STATUS: UNPAID / CREDIT (FULL DUE: ₹{formatAmount(balanceAmount)})
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Breakdown Totals */}
              <div className="w-[26%] flex flex-col justify-between">
                <div>
                  <div className="flex border-b border-black">
                    <div className="w-[48%] py-1 px-1.5 border-r border-black font-normal text-left text-xs">
                      Total Amount
                    </div>
                    <div className="w-[52%] py-1 px-1.5 text-right font-bold text-xs">
                      {formatAmount(totalAmount)}
                    </div>
                  </div>

                  <div className="flex border-b border-black">
                    <div className="w-[48%] py-1 px-1.5 border-r border-black font-normal text-left text-xs">
                      Transportation
                    </div>
                    <div className="w-[52%] py-1 px-1.5 text-right font-normal text-xs">
                      {transportation}
                    </div>
                  </div>

                  <div className="flex border-b border-black font-bold bg-slate-50">
                    <div className="w-[48%] py-1 px-1.5 border-r border-black text-left text-xs">
                      Final Amount
                    </div>
                    <div className="w-[52%] py-1 px-1.5 text-right text-xs font-bold">
                      {formatAmount(finalAmount)}
                    </div>
                  </div>

                  <div className="flex border-b border-black font-medium">
                    <div className="w-[48%] py-1 px-1.5 border-r border-black text-left text-xs text-emerald-800">
                      Paid Amount
                    </div>
                    <div className="w-[52%] py-1 px-1.5 text-right text-xs font-bold text-emerald-800">
                      ₹ {formatAmount(paidAmount)}
                    </div>
                  </div>
                </div>

                <div className={`flex font-black border-t border-black ${balanceAmount > 0 ? 'bg-amber-100 text-amber-950' : 'bg-emerald-100 text-emerald-950'}`}>
                  <div className="w-[48%] py-1 px-1.5 border-r border-black text-left text-xs uppercase">
                    Balance Due
                  </div>
                  <div className="w-[52%] py-1 px-1.5 text-right text-xs font-mono font-black">
                    ₹ {formatAmount(balanceAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Bank Details, Seal, Signature */}
            <div className="flex text-xs sm:text-sm">
              
              {/* Left Column: Bank Details */}
              <div className="w-[30%] border-r border-black flex flex-col">
                <div className="font-bold text-center border-b border-black py-0.5 bg-white">
                  Bank Details
                </div>
                <div className="p-1.5 space-y-0.5 leading-tight flex-1 text-xs sm:text-sm">
                  <div>Name: <span className="font-normal">{bill.bankName || ''}</span></div>
                  <div>A/C No: <span className="font-normal">{bill.bankAccountNo || ''}</span></div>
                  <div>A/C Type: Current</div>
                  <div>Branch: <span className="font-normal">{bill.bankBranch || ''}</span></div>
                  <div>IFSC: <span className="font-normal">{bill.bankIfsc || ''}</span></div>
                </div>
              </div>

              {/* Center Column: Common Seal */}
              <div className="w-[30%] border-r border-black flex flex-col justify-between items-center">
                <div className="flex-1 flex items-center justify-center p-1 select-none pointer-events-none min-h-[90px] w-full">
                  <img
                    src={COMMON_SEAL_IMAGE_BASE64 || '/sm_concretech_common_seal.png'}
                    alt=""
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallbackTried) {
                        e.currentTarget.dataset.fallbackTried = 'true';
                        e.currentTarget.src = '/sm_concretech_common_seal.png';
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                    className="w-[90px] sm:w-[105px] h-auto object-contain my-auto"
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  />
                </div>
                <div className="font-normal text-center border-t border-black w-full py-0.5 text-xs sm:text-sm">
                  Common Seal
                </div>
              </div>

              {/* Right Column: Authorization & Signature */}
              <div className="w-[40%] flex flex-col justify-between">
                <div>
                  <div className="text-[10px] sm:text-[11px] leading-tight px-1.5 pt-0.5 text-left text-black">
                    Ceritified that the particulars given above are
                    <br />
                    true and correct
                  </div>

                  <div className="text-center font-bold text-xs sm:text-sm pt-1">
                    For SM CONCRETECH
                  </div>
                </div>

                {/* Real Authentic Rubber Stamp & Proprietor Signature */}
                <div className="flex flex-col items-center justify-center py-0.5 select-none pointer-events-none min-h-[50px] w-full">
                  <img
                    src={STAMP_IMAGE_BASE64 || '/sm_concretech_stamp.png'}
                    alt=""
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallbackTried) {
                        e.currentTarget.dataset.fallbackTried = 'true';
                        e.currentTarget.src = '/sm_concretech_stamp.png';
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                    className="w-[130px] sm:w-[145px] h-auto object-contain my-0.5"
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  />
                </div>

                <div className="border-t border-black text-center py-0.5 text-xs sm:text-sm font-normal">
                  Authorised signatory
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Controls (Hidden in Print) */}
        <div className="no-print p-3 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official SM CONCRETECH format • Formatted for standard printing</span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNativePrint}
              className="px-4 py-1.5 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Cash Memo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
