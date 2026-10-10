import React, { useRef } from 'react';
import { Printer, Download, X, Check, ShieldCheck, Phone, MapPin, ArrowLeft } from 'lucide-react';
import { numberToIndianWords } from '../../utils/numberToWords';

export default function CashMemoPrintView({ bill, onClose, onPrint }) {
  const printRef = useRef(null);

  if (!bill) return null;

  const handleNativePrint = () => {
    window.print();
  };

  const items = bill.items || [
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
  const amountInWords = bill.amountInWords || numberToIndianWords(finalAmount);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Container Card */}
      <div className="bg-white text-slate-900 w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:h-auto my-auto">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white p-3 sm:px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:scale-95 text-white flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-2xs"
              title="Go Back (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold tracking-wide truncate">
                Bill #{bill.billNo || '25-26/114'} Preview
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNativePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================
            PRINTABLE CASH MEMO INVOICE (EXACT DESIGN MATCH)
            ======================================================== */}
        <div className="p-3 sm:p-6 overflow-y-auto overflow-x-auto bg-slate-100/60 flex-1 print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={printRef}
            className="cash-memo-printable bg-white text-black border-2 border-black w-full max-w-[760px] mx-auto text-[13px] leading-tight font-sans select-text shadow-sm print:shadow-none print:border-2 print:border-black"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            
            {/* Header: SM CONCRETECH */}
            <div className="text-center py-3 px-4 border-b border-black">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-black">
                SM CONCRETECH
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-black mt-0.5">
                A/P Tanang, Sangli - 416410
              </p>
              <p className="text-xs sm:text-sm font-bold text-black mt-0.5">
                +91 9373488061
              </p>
            </div>

            {/* Document Title Banner */}
            <div className="text-center py-1 font-bold text-sm sm:text-base border-b border-black bg-slate-50 print:bg-transparent">
              Cash Memo
            </div>

            {/* Bill Info & Place 2-Column Grid */}
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-2 border-r border-black space-y-1">
                <div>
                  <span className="font-normal text-black">Bill No: </span>
                  <span className="font-bold text-black">{bill.billNo || '25-26/114'}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Date: </span>
                  <span className="font-bold text-black">{bill.date || '11-Oct-2025'}</span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <div>
                  <span className="font-normal text-black">Vehicle: </span>
                  <span className="font-bold text-black">{bill.vehicle || ''}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Place: </span>
                  <span className="font-bold text-black">{bill.place || 'Aaudumbar'}</span>
                </div>
              </div>
            </div>

            {/* Bill To Party Banner */}
            <div className="text-center py-1 font-bold text-xs sm:text-sm border-b border-black bg-slate-50 print:bg-transparent">
              Bill To Party
            </div>

            {/* Party Details 2-Column Grid */}
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-2 border-r border-black space-y-1">
                <div>
                  <span className="font-normal text-black">Name: </span>
                  <span className="font-bold text-black">{bill.customerName || ''}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Site: </span>
                  <span className="font-bold text-black">{bill.site || ''}</span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <div>
                  <span className="font-normal text-black">Mobile: </span>
                  <span className="font-bold text-black">{bill.customerMobile || ''}</span>
                </div>
                <div>
                  <span className="font-normal text-black">Ref Name: </span>
                  <span className="font-bold text-black">{bill.refName || ''}</span>
                </div>
              </div>
            </div>

            {/* Table of Materials */}
            <div className="border-b border-black">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-black bg-slate-50 print:bg-transparent font-bold">
                    <th className="py-1.5 px-2 border-r border-black w-10 text-center">SN.</th>
                    <th className="py-1.5 px-2 border-r border-black">Material</th>
                    <th className="py-1.5 px-2 border-r border-black w-14 text-center">Qty</th>
                    <th className="py-1.5 px-2 border-r border-black w-14 text-center">Unit</th>
                    <th className="py-1.5 px-2 border-r border-black w-20 text-right">Rate</th>
                    <th className="py-1.5 px-2 w-24 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 print:border-none">
                      <td className="py-1.5 px-2 border-r border-black text-center font-normal">{item.sn || idx + 1}</td>
                      <td className="py-1.5 px-2 border-r border-black font-normal">{item.material}</td>
                      <td className="py-1.5 px-2 border-r border-black text-center font-normal">{item.qty}</td>
                      <td className="py-1.5 px-2 border-r border-black text-center font-normal">{item.unit || 'Unit'}</td>
                      <td className="py-1.5 px-2 border-r border-black text-right font-normal">
                        {Number(item.rate).toLocaleString('en-IN')}
                      </td>
                      <td className="py-1.5 px-2 text-right font-normal">
                        {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  {/* Spacer Rows to replicate pre-printed memo look */}
                  {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                    <tr key={`spacer-${i}`} className="h-6">
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td></td>
                    </tr>
                  ))}

                  {/* Subtotal Row */}
                  <tr className="border-t-2 border-black font-bold">
                    <td colSpan={2} className="py-1 px-3 border-r border-black text-right uppercase tracking-wider text-sm font-black">
                      Total
                    </td>
                    <td className="py-1 px-2 border-r border-black text-center font-bold">
                      {totalQty}
                    </td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="py-1 px-2 text-right font-black text-sm">
                      {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary & Amount in Words Section */}
            <div className="grid grid-cols-12 border-b border-black text-xs sm:text-sm">
              {/* Left Column: Total Amount in Words */}
              <div className="col-span-7 border-r border-black flex flex-col justify-between">
                <div className="p-2 border-b border-black font-normal text-center bg-slate-50 print:bg-transparent">
                  Total amount in words
                </div>
                <div className="p-3 font-bold text-center text-black flex items-center justify-center min-h-[50px] uppercase">
                  {amountInWords}
                </div>
              </div>

              {/* Right Column: Breakdown Totals */}
              <div className="col-span-5 font-bold">
                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-1.5 px-2 border-r border-black font-semibold">Total Amount</div>
                  <div className="p-1.5 px-2 text-right font-bold">
                    {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-1.5 px-2 border-r border-black font-semibold">Transportation</div>
                  <div className="p-1.5 px-2 text-right font-bold">
                    {transportation.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 font-black text-sm">
                  <div className="p-1.5 px-2 border-r border-black">Final Amount</div>
                  <div className="p-1.5 px-2 text-right">
                    {finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Bank Details, Seal, Signature */}
            <div className="grid grid-cols-12 text-xs sm:text-xs">
              
              {/* Left Column: Bank Details */}
              <div className="col-span-4 border-r border-black p-2 space-y-1">
                <div className="font-bold underline text-center mb-1">Bank Details</div>
                <div>Name: <span className="font-semibold">{bill.bankName || 'SM CONCRETECH'}</span></div>
                <div>A/C No: <span className="font-semibold font-mono">{bill.bankAccountNo || '41890021000189'}</span></div>
                <div>A/C Type: <span className="font-semibold">{bill.bankAccountType || 'Current'}</span></div>
                <div>Branch: <span className="font-semibold">{bill.bankBranch || 'Miraj / Sangli'}</span></div>
                <div>IFSC: <span className="font-semibold font-mono">{bill.bankIfsc || 'SBIN0001234'}</span></div>
              </div>

              {/* Center Column: Common Seal */}
              <div className="col-span-3 border-r border-black p-2 flex flex-col justify-end items-center relative">
                <div className="font-normal text-center border-t border-black w-full pt-0.5 mt-auto">
                  Common Seal
                </div>
              </div>

              {/* Right Column: Authorization & Signature */}
              <div className="col-span-5 p-2 flex flex-col justify-between text-right">
                <div className="text-[10px] leading-snug text-left">
                  Certified that the particulars given above are true and correct
                </div>

                <div className="text-center pt-2">
                  <div className="font-bold text-xs">For SM CONCRETECH</div>
                  
                  
                  {/* Signature Space */}
                  <div className="my-4"></div>

                  <div className="font-normal border-t border-black pt-0.5 text-center text-xs">
                    Authorised signatory
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="no-print p-3 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official SM CONCRETECH format • Formatted for standard A4 printing</span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNativePrint}
              className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Cash Memo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
