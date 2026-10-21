import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { STAMP_IMAGE_BASE64, COMMON_SEAL_IMAGE_BASE64 } from './billingAssets';
import {
  normalizeBill,
  parseToDateOnly,
  formatDisplayDate,
  formatCurrency,
  getBillDescription,
} from '../../utils/billingPayments';

export { parseToDateOnly, formatDisplayDate, formatCurrency, getBillDescription };

export default function CustomerStatementModal({
  customerName,
  allBills = [],
  uniqueCustomers = [],
  onSelectCustomer,
  onUpdateDescription,
  onClose,
}) {
  const [selectedCust, setSelectedCust] = useState(customerName || 'Cash Customer');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFilter, setAppliedFilter] = useState({ fromDate: '', toDate: '' });
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

  // Sort chronologically (oldest first for statement ledger)
  const sortedBills = [...customerBills].sort((a, b) => {
    const dateA = parseToDateOnly(a.date)?.getTime() || 0;
    const dateB = parseToDateOnly(b.date)?.getTime() || 0;
    return dateA - dateB;
  });

  // Apply Date Period Filter (inclusive of both boundary dates)
  const fromDateObj = appliedFilter.fromDate ? parseToDateOnly(appliedFilter.fromDate) : null;
  const toDateObj = appliedFilter.toDate ? parseToDateOnly(appliedFilter.toDate) : null;

  const filteredBills = sortedBills.filter((b) => {
    const billDateObj = parseToDateOnly(b.date);
    if (!billDateObj) return true;
    if (fromDateObj && billDateObj.getTime() < fromDateObj.getTime()) {
      return false;
    }
    if (toDateObj && billDateObj.getTime() > toDateObj.getTime()) {
      return false;
    }
    return true;
  });

  // Financial aggregates for filtered statement records
  const totalFilteredBilled = filteredBills.reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);
  const totalFilteredBalance = filteredBills.reduce((s, b) => s + (Number(b.balanceAmount) || 0), 0);

  // Extract customer contact & sites
  const customerMobile =
    customerBills.find((b) => b.customerMobile)?.customerMobile ||
    customerBills.find((b) => b.mobile)?.mobile ||
    'Not Provided';

  const sites = Array.from(
    new Set(customerBills.map((b) => b.site || b.place).filter(Boolean))
  );

  // Date Filter Handlers
  const handleApplyFilter = () => {
    setAppliedFilter({ fromDate, toDate });
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
    setAppliedFilter({ fromDate: '', toDate: '' });
  };

  // Export 5-column statement to CSV/Excel respecting the selected date range
  const handleExportStatement = () => {
    if (filteredBills.length === 0) {
      alert('No statement records to export for the selected date range.');
      return;
    }
    const headers = ['Date', 'Bill No.', 'Bill Amount', 'Description', 'Balance'];
    const rows = filteredBills.map((b) => [
      `"${formatDisplayDate(b.date)}"`,
      `"${b.billNo || ''}"`,
      Number(b.finalAmount || 0).toFixed(2),
      `"${(getBillDescription(b) || '').replace(/"/g, '""')}"`,
      Number(b.balanceAmount || 0).toFixed(2),
    ]);

    // Add total row at bottom
    rows.push([
      '"Total"',
      '""',
      totalFilteredBilled.toFixed(2),
      `"${filteredBills.length} records"`,
      totalFilteredBalance.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const rangeSuffix = appliedFilter.fromDate || appliedFilter.toDate
      ? `_${appliedFilter.fromDate || 'start'}_to_${appliedFilter.toDate || 'end'}`
      : '_all';
    link.setAttribute('download', `Statement_${selectedCust.replace(/\s+/g, '_')}${rangeSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <h3 className="text-sm font-bold tracking-wide">Cash Memo and Billing Statement</h3>
            </div>
          </div>

          {/* Customer Switcher & Action Controls */}
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
              onClick={handleExportStatement}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export statement respecting current date filter"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

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

        {/* Scrollable Document Area */}
        <div className="cash-memo-scroll-area p-3 sm:p-5 overflow-y-auto bg-slate-100/70 flex-1 print:bg-white print:p-0 print:overflow-visible print:block print:w-full">
          
          {/* DATE PERIOD FILTER (Placed above the table, hidden when printing) */}
          <div className="no-print bg-white border border-slate-300 rounded-xl p-3 sm:p-4 mb-3 max-w-[780px] mx-auto shadow-xs">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Date Period Filter</span>
              {(appliedFilter.fromDate || appliedFilter.toDate) && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Filter Active • Showing {filteredBills.length} record{filteredBills.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilter}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Apply Filter
                </button>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Printable Statement Document */}
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
                Cash Memo and Billing Statement
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
                  <span className="font-semibold text-black">Statement Period: </span>
                  <span className="font-bold font-mono text-black">
                    {appliedFilter.fromDate || appliedFilter.toDate
                      ? `${appliedFilter.fromDate ? formatDisplayDate(appliedFilter.fromDate) : 'Start'} to ${appliedFilter.toDate ? formatDisplayDate(appliedFilter.toDate) : 'End'}`
                      : 'All Records'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-black">Total Records: </span>
                  <span className="font-mono font-bold text-black">{filteredBills.length}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="my-3 border border-black bg-slate-50/70 p-3 grid grid-cols-2 gap-4 text-center text-xs">
              <div className="border-r border-black/40 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Total Bill Amount</span>
                <span className="font-mono font-black text-black text-base block mt-0.5">
                  ₹ {formatCurrency(totalFilteredBilled)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Total Balance Due</span>
                <span className={`font-mono font-black text-base block mt-0.5 ${totalFilteredBalance > 0 ? 'text-black' : 'text-emerald-700'}`}>
                  ₹ {formatCurrency(totalFilteredBalance)}
                  {totalFilteredBalance === 0 && ' ✓'}
                </span>
              </div>
            </div>

            {/* EXACTLY FIVE STATEMENT COLUMNS */}
            <div className="mt-3">
              <table className="w-full border-collapse border border-black text-xs text-left">
                <thead>
                  <tr className="border-b-2 border-black bg-slate-100 font-bold text-black text-xs">
                    <th className="py-2 px-2.5 border-r border-black w-[15%]">Date</th>
                    <th className="py-2 px-2.5 border-r border-black w-[15%]">Bill No.</th>
                    <th className="py-2 px-2.5 border-r border-black w-[20%] text-right">Bill Amount</th>
                    <th className="py-2 px-2.5 border-r border-black w-[30%]">Description</th>
                    <th className="py-2 px-2.5 text-right w-[20%]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length > 0 ? (
                    filteredBills.map((b, idx) => (
                      <tr key={b.id || idx} className="border-b border-black/70 hover:bg-slate-50/50">
                        <td className="py-2 px-2.5 border-r border-black font-mono">
                          {formatDisplayDate(b.date)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-black font-mono font-bold">
                          {b.billNo}
                        </td>
                        <td className="py-2 px-2.5 border-r border-black text-right font-mono font-bold">
                          ₹ {formatCurrency(b.finalAmount)}
                        </td>
                        <td className="py-1 px-2 border-r border-black">
                          {onUpdateDescription ? (
                            <>
                              <span className="hidden print:inline font-medium">
                                {getBillDescription(b)}
                              </span>
                              <input
                                type="text"
                                value={b.description !== undefined ? b.description : (getBillDescription(b) === '-' ? '' : getBillDescription(b))}
                                onChange={(e) => onUpdateDescription(b.id, e.target.value)}
                                placeholder="Type payment description..."
                                className="print:hidden w-full px-2 py-1 text-xs font-medium text-slate-900 bg-transparent hover:bg-white/80 focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                                title="Click to edit description manually"
                              />
                            </>
                          ) : (
                            getBillDescription(b)
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold">
                          ₹ {formatCurrency(b.balanceAmount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                        No statement records found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-black text-xs">
                    <td colSpan={2} className="py-2 px-2.5 border-r border-black uppercase text-right">
                      Total:
                    </td>
                    <td className="py-2 px-2.5 border-r border-black text-right font-mono font-black">
                      ₹ {formatCurrency(totalFilteredBilled)}
                    </td>
                    <td className="py-2 px-2.5 border-r border-black text-center text-[11px] text-slate-600">
                      {filteredBills.length} record{filteredBills.length !== 1 ? 's' : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black">
                      ₹ {formatCurrency(totalFilteredBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

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
            <span>Official Cash Memo and Billing Statement • SM CONCRETECH format</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportStatement}
              className="px-3.5 py-1.5 rounded-lg font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export CSV</span>
            </button>
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
