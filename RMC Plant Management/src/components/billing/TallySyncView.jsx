import React, { useState } from 'react';
import {
  Download,
  ReceiptText,
  CreditCard,
  Truck,
  CheckCircle2,
  FileCode,
  Building2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import {
  generateSalesTallyXml,
  generateReceiptsTallyXml,
  generatePurchasesTallyXml,
  downloadXmlFile
} from '../../utils/tallyXmlGenerator';
import { roundCurrency } from '../../utils/billingPayments';
import { useLanguage } from '../../context/LanguageContext';

export default function TallySyncView({ bills = [], purchases = [] }) {
  const { language } = useLanguage();
  const [companyName, setCompanyName] = useState('SHIVKRUPA READY MIX CONCRETE PLANT');
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  // Calculate totals
  const totalSalesAmount = roundCurrency(bills.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0));
  
  let totalReceiptsCount = 0;
  let totalReceiptsAmount = 0;
  bills.forEach(b => {
    if (Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0) {
      totalReceiptsCount += b.paymentHistory.length;
      b.paymentHistory.forEach(p => {
        totalReceiptsAmount = roundCurrency(totalReceiptsAmount + (parseFloat(p.amount) || 0));
      });
    } else if (parseFloat(b.paidAmount || 0) > 0) {
      totalReceiptsCount += 1;
      totalReceiptsAmount = roundCurrency(totalReceiptsAmount + parseFloat(b.paidAmount || 0));
    }
  });

  const totalPurchasesAmount = roundCurrency(purchases.reduce(
    (sum, p) => sum + (parseFloat(p.netTotal || p.total || p.amount) || 0),
    0
  ));

  // Handlers
  const handleExportSales = () => {
    if (bills.length === 0) {
      alert('No sales bills to export.');
      return;
    }
    const xml = generateSalesTallyXml(bills, companyName);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadXmlFile(xml, `Tally_Sales_Vouchers_${dateStr}.xml`);
    setDownloadSuccess(`Sales XML for ${bills.length} bills downloaded successfully.`);
  };

  const handleExportReceipts = () => {
    if (totalReceiptsCount === 0) {
      alert('No payment receipts recorded yet.');
      return;
    }
    const xml = generateReceiptsTallyXml(bills, companyName);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadXmlFile(xml, `Tally_Receipt_Vouchers_${dateStr}.xml`);
    setDownloadSuccess(`Receipts XML for ${totalReceiptsCount} payments downloaded.`);
  };

  const handleExportPurchases = () => {
    if (purchases.length === 0) {
      alert('No purchase bills to export.');
      return;
    }
    const xml = generatePurchasesTallyXml(purchases, companyName);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadXmlFile(xml, `Tally_Purchase_Vouchers_${dateStr}.xml`);
    setDownloadSuccess(`Purchases XML for ${purchases.length} bills downloaded.`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
          <button
            onClick={() => setDownloadSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-xl p-3 sm:p-4 shadow-sm border border-emerald-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Tally Prime & ERP 9 Direct Synchronization</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {language === 'mr' ? 'टॅली प्राइम XML एक्सपोर्ट' : '1-Click Tally XML Sync'}
            </h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              {language === 'mr'
                ? 'सॉफ्टवेअरमधील विक्री बिले, ग्राहकांकडून आलेली पेमेंट्स आणि कच्चा माल खरेदी १-क्लिकवर Tally XML मध्ये डाऊनलोड करा.'
                : 'Download sales invoices, customer receipt vouchers, and raw material purchases as ready-to-import Tally Prime XML.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-900/50 p-2 rounded-lg border border-emerald-700/60">
            <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] text-emerald-300 block uppercase font-bold">{language === 'mr' ? 'टॅली कंपनीचे नाव:' : 'Tally Company Name:'}</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Tally Company Name"
                className="bg-emerald-950/80 border border-emerald-600 rounded px-2 py-0.5 text-xs text-white font-semibold focus:outline-none w-48 sm:w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Simple Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CARD 1: SALES VOUCHERS */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-400 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <ReceiptText className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 font-mono">
                Sales Voucher
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-2.5">
              {language === 'mr' ? 'विक्री बिले' : 'Sales Invoices'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'mr' ? 'सर्व GST कॅश मेमो आणि विक्री बिले (Customer Ledgers & Taxes).' : 'All GST cash memos and sales invoices (Customer Ledgers & Taxes).'}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">{language === 'mr' ? 'एकूण बिले:' : 'Total Vouchers:'}</span>
              <span className="font-bold text-slate-900">{bills.length} {language === 'mr' ? 'बिले' : 'Bills'}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono mt-1">
              <span className="text-slate-500">{language === 'mr' ? 'एकूण रक्कम:' : 'Gross Value:'}</span>
              <span className="font-bold text-amber-700">₹{totalSalesAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={handleExportSales}
            disabled={bills.length === 0}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'mr' ? 'सेल्स XML डाऊनलोड करा' : 'Download Sales XML'}</span>
          </button>
        </div>

        {/* CARD 2: RECEIPTS VOUCHERS */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-blue-400 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <CreditCard className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 font-mono">
                Receipt Voucher
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-2.5">
              {language === 'mr' ? 'पेमेंट पावत्या' : 'Receipt Vouchers'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'mr' ? 'ग्राहकांकडून जमा झालेले पेमेंट्स (Cash, Bank, NEFT, Cheque).' : 'Customer payments received (Cash, Bank, NEFT, Cheque).'}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">{language === 'mr' ? 'एकूण पावत्या:' : 'Total Payments:'}</span>
              <span className="font-bold text-slate-900">{totalReceiptsCount} {language === 'mr' ? 'पावत्या' : 'Receipts'}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono mt-1">
              <span className="text-slate-500">{language === 'mr' ? 'जमा रक्कम:' : 'Amount Collected:'}</span>
              <span className="font-bold text-blue-700">₹{totalReceiptsAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={handleExportReceipts}
            disabled={totalReceiptsCount === 0}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'mr' ? 'पावत्या XML डाऊनलोड करा' : 'Download Receipts XML'}</span>
          </button>
        </div>

        {/* CARD 3: PURCHASE VOUCHERS */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-cyan-400 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Truck className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 font-mono">
                Purchase Voucher
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-2.5">
              {language === 'mr' ? 'कच्चा माल खरेदी' : 'Material Purchases'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'mr' ? 'सिमेंट, खडी, वाळू आणि डिझेल सप्लायर्सची खरेदी बिले.' : 'Purchase bills for cement, aggregates, sand, and diesel suppliers.'}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">{language === 'mr' ? 'एकूण खरेदी बिले:' : 'Total Inward Bills:'}</span>
              <span className="font-bold text-slate-900">{purchases.length} {language === 'mr' ? 'बिले' : 'Bills'}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono mt-1">
              <span className="text-slate-500">{language === 'mr' ? 'एकूण खरेदी:' : 'Total Purchase:'}</span>
              <span className="font-bold text-cyan-700">₹{totalPurchasesAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={handleExportPurchases}
            disabled={purchases.length === 0}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'mr' ? 'खरेदी XML डाऊनलोड करा' : 'Download Purchases XML'}</span>
          </button>
        </div>
      </div>

      {/* Simple 3-Step Guide for Tally Import */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <span>{language === 'mr' ? 'टॅली प्राइम मध्ये इम्पोर्ट कसे करावे? (३ सोप्या पायऱ्या)' : 'How to import into Tally Prime (3 Simple Steps)'}</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-blue-700 font-mono text-[11px]">{language === 'mr' ? 'पायरी १' : 'Step 1'}</span>
            <p className="text-slate-700">
              {language === 'mr' ? 'वरील बटनावर क्लिक करून XML फाईल डाऊनलोड करा.' : 'Click the button above to download the XML voucher file.'}
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-blue-700 font-mono text-[11px]">{language === 'mr' ? 'पायरी २' : 'Step 2'}</span>
            <p className="text-slate-700">
              {language === 'mr' 
                ? <>Tally Prime उघडा आणि वरून <strong className="font-mono">Import (Alt + O)</strong> निवडा.</>
                : <>Open Tally Prime and select <strong className="font-mono">Import (Alt + O)</strong> from top bar.</>}
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-blue-700 font-mono text-[11px]">{language === 'mr' ? 'पायरी ३' : 'Step 3'}</span>
            <p className="text-slate-700">
              {language === 'mr'
                ? <><strong className="font-mono">Transactions</strong> निवडून डाऊनलोड केलेली XML फाईल सिलेक्ट करा — सर्व नोंदी आपोआप जमा होतील!</>
                : <>Select <strong className="font-mono">Transactions</strong> and choose the downloaded XML file — all vouchers are instantly posted!</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
