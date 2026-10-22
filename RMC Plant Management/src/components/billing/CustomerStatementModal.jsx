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
  onRecordPayment,
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

  // Filter bills for the selected customer (or all customers if 'ALL')
  const isAll = !selectedCust || selectedCust === 'ALL' || selectedCust.toLowerCase() === 'all customers';
  const customerBills = allBills
    .map(normalizeBill)
    .filter(
      (b) =>
        isAll ||
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
  const totalFilteredPaid = filteredBills.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0);
  const totalFilteredBalance = totalFilteredBilled - totalFilteredPaid;

  // Running balance calculation for statement ledger rows
  let cumulativeRunningBalance = 0;
  const statementRows = filteredBills.map((b) => {
    const billAmt = Number(b.finalAmount) || 0;
    const paidAmt = Number(b.paidAmount) || 0;
    cumulativeRunningBalance += (billAmt - paidAmt);
    return {
      ...b,
      paymentCredited: paidAmt,
      statementBalance: cumulativeRunningBalance,
    };
  });

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

  // Export 6-column statement to CSV/Excel respecting the selected date range
  const handleExportStatement = () => {
    if (statementRows.length === 0) {
      alert('No statement records to export for the selected date range.');
      return;
    }
    const headers = ['Date', 'Bill No.', 'Bill Amount', 'Payment Credited', 'Description', 'Balance'];
    const rows = statementRows.map((b) => [
      `"${formatDisplayDate(b.date)}"`,
      `"${b.billNo || ''}"`,
      Number(b.finalAmount || 0).toFixed(2),
      Number(b.paymentCredited || 0).toFixed(2),
      `"${(getBillDescription(b) || '').replace(/"/g, '""')}"`,
      Number(b.statementBalance || 0).toFixed(2),
    ]);

    // Add total row at bottom
    rows.push([
      '"Total"',
      '""',
      totalFilteredBilled.toFixed(2),
      totalFilteredPaid.toFixed(2),
      `"${statementRows.length} records"`,
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
      <div className="cash-memo-modal-container bg-white text-slate-900 w-full max-w-[1040px] max-h-[96vh] flex flex-col rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:h-auto print:w-full print:border-none print:m-0 print:p-0 print:overflow-visible print:block my-auto print:my-0">
        
        {/* ========================================================
            1. PAGE HEADER (Clean, Compact, Minimal ERP Header)
            ======================================================== */}
        <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Cash Memo &amp; Billing Statement
                </h1>
                {selectedCust && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#1D5FA7] border border-blue-200 truncate">
                    {selectedCust}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                View bills, payments received, and outstanding balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportStatement}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Export 6-column statement to CSV/Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Print official statement"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            2. DATE FILTER SECTION (One clean row on desktop)
            ======================================================== */}
        <div className="no-print bg-slate-50/80 border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700 whitespace-nowrap">
                From Date:
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-700 whitespace-nowrap">
                To Date:
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyFilter}
                className="h-8 px-3.5 rounded-md text-xs font-semibold bg-[#123B6D] hover:bg-[#1D5FA7] text-white transition-colors cursor-pointer shadow-2xs"
              >
                Apply Filter
              </button>

              <button
                type="button"
                onClick={handleResetFilter}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset</span>
              </button>
            </div>

            {(appliedFilter.fromDate || appliedFilter.toDate) && (
              <span className="text-[11px] font-medium text-slate-600 sm:ml-auto">
                Period: <strong className="text-slate-900 font-mono">{appliedFilter.fromDate ? formatDisplayDate(appliedFilter.fromDate) : 'Start'}</strong> to <strong className="text-slate-900 font-mono">{appliedFilter.toDate ? formatDisplayDate(appliedFilter.toDate) : 'End'}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="cash-memo-scroll-area p-4 sm:p-6 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible print:block print:w-full">
          
          {/* ========================================================
              ON-SCREEN STATEMENT INTERFACE (no-print)
              ======================================================== */}
          <div className="no-print space-y-4">
            
            {/* 3. OPTIONAL COMPACT FINANCIAL SUMMARY */}
            {/* 3. OPTIONAL COMPACT FINANCIAL SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-white to-[#F5F9FF] rounded-xl border border-[#D4E4F7] p-3 shadow-2xs">
                <div className="text-[11px] font-extrabold text-[#123B6D] uppercase tracking-wider">
                  Total Bill Amount
                </div>
                <div className="text-base font-black font-mono text-slate-950 mt-0.5">
                  ₹ {formatCurrency(totalFilteredBilled)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-emerald-50/70 rounded-xl border border-emerald-200 p-3 shadow-2xs">
                <div className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Total Payment Credited
                </div>
                <div className="text-base font-black font-mono text-emerald-700 mt-0.5">
                  ₹ {formatCurrency(totalFilteredPaid)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-amber-50/70 rounded-xl border border-amber-200 p-3 shadow-2xs">
                <div className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                  Outstanding Balance
                </div>
                <div className={`text-base font-black font-mono mt-0.5 ${totalFilteredBalance > 0 ? 'text-amber-950' : 'text-emerald-700'}`}>
                  ₹ {formatCurrency(totalFilteredBalance)}
                  {totalFilteredBalance <= 0 && ' ✓'}
                </div>
              </div>
            </div>

            {/* 4. SIX-COLUMN BILLING STATEMENT TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white border-b-2 border-[#123B6D] text-[11px] font-extrabold uppercase tracking-wider select-none shadow-xs">
                      <th className="py-3 px-3 whitespace-nowrap w-[110px] border-r border-white/20 text-white">Date</th>
                      <th className="py-3 px-3 whitespace-nowrap w-[120px] border-r border-white/20 text-white">Bill No.</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap w-[130px] border-r border-white/20 text-white">Bill Amount</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap w-[140px] border-r border-white/20 text-emerald-300 font-black">Payment Credited</th>
                      <th className="py-3 px-3 border-r border-white/20 min-w-[200px] text-white">Description</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap w-[130px] text-white">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statementRows.length > 0 ? (
                      statementRows.map((b, idx) => (
                        <tr key={b.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Date */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-800 border-r border-slate-200/80">
                            {formatDisplayDate(b.date)}
                          </td>

                          {/* 2. Bill No. */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-semibold text-slate-900 border-r border-slate-200/80">
                            {b.billNo}
                          </td>

                          {/* 3. Bill Amount */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 border-r border-slate-200/80">
                            ₹ {formatCurrency(b.finalAmount)}
                          </td>

                          {/* 4. Payment Credited */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-semibold text-emerald-700 border-r border-slate-200/80">
                            {Number(b.paymentCredited || 0) > 0 ? `₹ ${formatCurrency(b.paymentCredited)}` : '₹ 0.00'}
                          </td>

                          {/* 5. Description */}
                          <td className="py-2 px-3 border-r border-slate-200/80">
                            {onUpdateDescription ? (
                              <input
                                type="text"
                                value={b.description !== undefined ? b.description : (getBillDescription(b) === '-' ? '' : getBillDescription(b))}
                                onChange={(e) => onUpdateDescription(b.id, e.target.value)}
                                placeholder="Type payment description..."
                                className="w-full px-2 py-1 text-xs font-semibold text-slate-900 bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white rounded border border-slate-200 hover:border-slate-300 focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7] transition-all outline-none"
                                title="Click to edit payment description manually"
                              />
                            ) : (
                              <div className="font-semibold text-slate-900 truncate" title={getBillDescription(b)}>
                                {getBillDescription(b)}
                              </div>
                            )}
                          </td>

                          {/* 6. Balance */}
                          <td className={`py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold ${b.statementBalance > 0 ? 'text-slate-900' : 'text-emerald-700'}`}>
                            ₹ {formatCurrency(b.statementBalance)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 px-4 text-center">
                          <p className="text-slate-600 text-xs font-medium">
                            No billing records found for the selected dates.
                          </p>
                          {(appliedFilter.fromDate || appliedFilter.toDate) && (
                            <button
                              type="button"
                              onClick={handleResetFilter}
                              className="mt-2 text-xs font-semibold text-[#1D5FA7] hover:underline cursor-pointer"
                            >
                              Reset date filter to view all records
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {statementRows.length > 0 && (
                    <tfoot className="bg-gradient-to-r from-[#EAF3FF] to-[#F5F9FF] border-t-2 border-[#1D5FA7] text-xs font-bold text-slate-900">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider text-[#123B6D] font-extrabold border-r border-[#D4E4F7]">
                          Total ({statementRows.length} record{statementRows.length !== 1 ? 's' : ''}):
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 border-r border-[#D4E4F7]">
                          ₹ {formatCurrency(totalFilteredBilled)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 border-r border-[#D4E4F7]">
                          ₹ {formatCurrency(totalFilteredPaid)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-[#D4E4F7] text-center text-[11px] text-slate-600 font-semibold">
                          Statement Summary
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                          ₹ {formatCurrency(totalFilteredBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* ========================================================
              5. PRINTABLE STATEMENT DOCUMENT (Strictly for Printing)
              ======================================================== */}
          <div
            ref={printRef}
            className="cash-memo-printable hidden print:block bg-white text-black border border-black w-full max-w-[780px] mx-auto text-xs leading-normal font-sans select-text p-4 sm:p-6"
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
                  <span className="font-bold text-sm text-black">{isAll ? 'All Customers (Combined Statement)' : selectedCust}</span>
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
            <div className="my-3 border border-black bg-slate-50/70 p-3 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="border-r border-black/40 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Total Bill Amount</span>
                <span className="font-mono font-black text-black text-base block mt-0.5">
                  ₹ {formatCurrency(totalFilteredBilled)}
                </span>
              </div>
              <div className="border-r border-black/40 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Payment Credited</span>
                <span className="font-mono font-black text-emerald-800 text-base block mt-0.5">
                  ₹ {formatCurrency(totalFilteredPaid)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Total Balance Due</span>
                <span className={`font-mono font-black text-base block mt-0.5 ${totalFilteredBalance > 0 ? 'text-black' : 'text-emerald-700'}`}>
                  ₹ {formatCurrency(totalFilteredBalance)}
                  {totalFilteredBalance <= 0 && ' ✓'}
                </span>
              </div>
            </div>

            {/* EXACTLY SIX STATEMENT COLUMNS */}
            <div className="mt-3">
              <table className="w-full border-collapse border border-black text-xs text-left">
                <thead>
                  <tr className="border-b-2 border-black bg-[#123B6D] text-white print:bg-slate-200 print:text-black font-extrabold text-xs">
                    <th className="py-2.5 px-2 border-r border-black w-[13%] whitespace-nowrap text-white print:text-black">Date</th>
                    <th className="py-2.5 px-2 border-r border-black w-[13%] whitespace-nowrap text-white print:text-black">Bill No.</th>
                    <th className="py-2.5 px-2 border-r border-black w-[18%] text-right whitespace-nowrap text-white print:text-black">Bill Amount</th>
                    <th className="py-2.5 px-2 border-r border-black w-[18%] text-right whitespace-nowrap text-emerald-300 print:text-black font-black">Payment Credited</th>
                    <th className="py-2.5 px-2 border-r border-black w-[22%] text-white print:text-black">Description</th>
                    <th className="py-2.5 px-2 text-right w-[16%] whitespace-nowrap text-white print:text-black">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.length > 0 ? (
                    statementRows.map((b, idx) => (
                      <tr key={b.id || idx} className="border-b border-black/70 hover:bg-slate-50/50">
                        {/* 1. Date */}
                        <td className="py-2 px-2 border-r border-black font-mono">
                          {formatDisplayDate(b.date)}
                        </td>

                        {/* 2. Bill No. */}
                        <td className="py-2 px-2 border-r border-black font-mono font-bold">
                          {b.billNo}
                        </td>

                        {/* 3. Bill Amount */}
                        <td className="py-2 px-2 border-r border-black text-right font-mono font-bold whitespace-nowrap">
                          ₹ {formatCurrency(b.finalAmount)}
                        </td>

                        {/* 4. Payment Credited */}
                        <td className="py-2 px-2 border-r border-black text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          ₹ {formatCurrency(b.paymentCredited)}
                        </td>

                        {/* 5. Description */}
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
                                className="print:hidden w-full px-1.5 py-0.5 text-xs font-medium text-slate-900 bg-transparent hover:bg-white/80 focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                                title="Click to edit description manually"
                              />
                            </>
                          ) : (
                            getBillDescription(b)
                          )}
                        </td>

                        {/* 6. Balance */}
                        <td className="py-2 px-2 text-right font-mono font-bold whitespace-nowrap">
                          ₹ {formatCurrency(b.statementBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                        No statement records found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-black text-xs">
                    <td colSpan={2} className="py-2 px-2 border-r border-black uppercase text-right whitespace-nowrap">
                      Total:
                    </td>
                    <td className="py-2 px-2 border-r border-black text-right font-mono font-black whitespace-nowrap">
                      ₹ {formatCurrency(totalFilteredBilled)}
                    </td>
                    <td className="py-2 px-2 border-r border-black text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                      ₹ {formatCurrency(totalFilteredPaid)}
                    </td>
                    <td className="py-2 px-2 border-r border-black text-center text-[11px] text-slate-600">
                      {statementRows.length} record{statementRows.length !== 1 ? 's' : ''}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-black whitespace-nowrap">
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
    </div>
  </div>
);

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
