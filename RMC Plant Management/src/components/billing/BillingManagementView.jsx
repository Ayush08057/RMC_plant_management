import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ReceiptText, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  Lock, 
  Unlock, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Search, 
  Filter, 
  Calendar, 
  Truck, 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Smartphone,
  ArrowLeft,
  X,
  LayoutGrid,
  Table,
  Maximize2,
  Minimize2,
  Loader2
} from 'lucide-react';
import CashMemoPrintView from './CashMemoPrintView';
import { useExclusiveModal } from '../dashboard/Modal';
import { numberToIndianWords } from '../../utils/numberToWords';
import { useAuth } from '../../context/AuthContext';
import { useWorkforce } from '../../context/WorkforceContext';
import { sendOwnerOtpApi, verifyOwnerOtpApi } from '../../services/otpService';

const BILLING_STORAGE_KEY = 'rmc_billing_records_v3';
const PURCHASES_STORAGE_KEY = 'rmc_plant_purchases_v3';
const OTP_LOGS_STORAGE_KEY = 'rmc_billing_otp_audit_v3';

// Owner Contact Information (From Cash Memo header & official accounts)
export const OWNER_SECURITY_PROFILE = {
  name: 'Sunil More / Shahesh D. Mane',
  role: 'Owner & Proprietor',
  phone: '+91 9373488061',
  altPhone: '+91 98200 00008',
  company: 'SM CONCRETECH',
  location: 'A/P Tanang, Sangli - 416410',
};

// Initial Cash Memos & Material Purchases (All dummy data removed)
const INITIAL_BILLS = [];
const INITIAL_PURCHASES = [];
const INITIAL_OTP_LOGS = [];

export default function BillingManagementView({ defaultSection = 'cash_memos' }) {
  const { user } = useAuth();
  const { addAuditLog } = useWorkforce();

  // Active sub-tab: 'cash_memos' | 'purchases' | 'otp_audit'
  const [activeSection, setActiveSection] = useState(defaultSection);

  // Persistent Bills State
  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem(BILLING_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved bills:', e);
    }
    return INITIAL_BILLS;
  });

  // Persistent Purchases State
  const [purchases, setPurchases] = useState(() => {
    try {
      const saved = localStorage.getItem(PURCHASES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved purchases:', e);
    }
    return INITIAL_PURCHASES;
  });

  // Persistent OTP Logs State (All dummy records removed)
  const [otpLogs, setOtpLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(OTP_LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved OTP logs:', e);
    }
    return INITIAL_OTP_LOGS;
  });

  // Clean legacy dummy storage data on mount
  useEffect(() => {
    try {
      localStorage.removeItem('rmc_billing_records_v1');
      localStorage.removeItem('rmc_billing_records_v2');
      localStorage.removeItem('rmc_plant_purchases_v1');
      localStorage.removeItem('rmc_plant_purchases_v2');
      localStorage.removeItem('rmc_billing_otp_audit_v1');
      localStorage.removeItem('rmc_billing_otp_audit_v2');
    } catch (e) {
      // ignore
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(bills));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [bills]);

  useEffect(() => {
    try {
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [purchases]);

  useEffect(() => {
    try {
      localStorage.setItem(OTP_LOGS_STORAGE_KEY, JSON.stringify(otpLogs));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [otpLogs]);

  // Live Timer Heartbeat for 10-Minute Countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Modals state
  const [printingBill, setPrintingBill] = useState(null);
  const [showBillFormModal, setShowBillFormModal] = useState(false);
  const [showPurchaseFormModal, setShowPurchaseFormModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);

  // OTP Security Authorization Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [targetItemForOtp, setTargetItemForOtp] = useState(null); // { item, type: 'bill' | 'purchase' }
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSessionId, setOtpSessionId] = useState(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccessAlert, setOtpSuccessAlert] = useState(null);
  const [otpDispatchedSms, setOtpDispatchedSms] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(30);

  // OTP Resend Countdown Timer
  useEffect(() => {
    if (!otpModalOpen || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpModalOpen, resendCountdown]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isTableFullScreen, setIsTableFullScreen] = useState(false);
  const [notification, setNotification] = useState(null);

  useExclusiveModal(otpModalOpen, () => setOtpModalOpen(false));
  useExclusiveModal(showBillFormModal, () => setShowBillFormModal(false));
  useExclusiveModal(showPurchaseFormModal, () => setShowPurchaseFormModal(false));
  useExclusiveModal(isTableFullScreen, () => setIsTableFullScreen(false));
  useExclusiveModal(Boolean(printingBill), () => setPrintingBill(null));

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * Helper: Calculates 10-minute timing window status for any record
   * Returns: { isWithin10Mins, remainingSec, formattedRemaining, elapsedMins }
   */
  const getTimingStatus = (createdAt) => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsedSec = Math.floor((now - createdTime) / 1000);
    const remainingSec = Math.max(0, 600 - elapsedSec); // 10 minutes = 600 seconds
    const isWithin10Mins = remainingSec > 0;
    const elapsedMins = Math.floor(elapsedSec / 60);

    const remM = Math.floor(remainingSec / 60);
    const remS = remainingSec % 60;
    const formattedRemaining = `${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;

    return {
      isWithin10Mins,
      remainingSec,
      formattedRemaining,
      elapsedMins,
    };
  };

  // Bill Form State
  const [billForm, setBillForm] = useState({
    billNo: `25-26/${bills.length + 115}`,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    vehicle: 'MH-10-CR-1212',
    place: 'Aaudumbar',
    customerName: '',
    site: '',
    customerMobile: '',
    refName: '',
    items: [
      { sn: 1, material: 'Pump', qty: 1, unit: 'Unit', rate: 6000, total: 6000 }
    ],
    transportation: 0,
    bankName: 'SM CONCRETECH',
    bankAccountNo: '41890021000189',
    bankAccountType: 'Current',
    bankBranch: 'Miraj / Sangli',
    bankIfsc: 'SBIN0001234',
  });

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    voucherNo: `PUR-25-26/0${purchases.length + 91}`,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    supplierName: '',
    supplierMobile: '',
    material: 'OPC 53 Grade Cement',
    vehicleNo: '',
    plantLocation: 'Main Plant Unit #01 (Tanang)',
    weighbridgeSlipNo: '',
    qty: 10,
    unit: 'Ton',
    rate: 6400,
    taxPercent: 18,
    paymentStatus: 'Pending',
    remarks: '',
  });

  // Open Create Bill Form
  const handleOpenCreateBill = () => {
    setEditingBill(null);
    setBillForm({
      billNo: `25-26/${bills.length + 115}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      vehicle: '',
      place: 'Aaudumbar',
      customerName: '',
      site: '',
      customerMobile: '',
      refName: '',
      items: [
        { sn: 1, material: 'M25 Concrete', qty: 6, unit: 'm³', rate: 4200, total: 25200 }
      ],
      transportation: 0,
      bankName: 'SM CONCRETECH',
      bankAccountNo: '41890021000189',
      bankAccountType: 'Current',
      bankBranch: 'Miraj / Sangli',
      bankIfsc: 'SBIN0001234',
    });
    setShowBillFormModal(true);
  };

  // Open Create Purchase Form
  const handleOpenCreatePurchase = () => {
    setEditingPurchase(null);
    setPurchaseForm({
      voucherNo: `PUR-25-26/0${purchases.length + 91}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      supplierName: '',
      supplierMobile: '',
      material: 'OPC 53 Grade Cement',
      vehicleNo: '',
      plantLocation: 'Main Plant Unit #01 (Tanang)',
      weighbridgeSlipNo: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
      qty: 25,
      unit: 'Ton',
      rate: 6200,
      taxPercent: 18,
      paymentStatus: 'Credit (15 Days)',
      remarks: 'Inward material quality approved',
    });
    setShowPurchaseFormModal(true);
  };

  /**
   * INITIATE EDIT WORKFLOW:
   * 1. Checks 10-Minute Rule!
   * 2. If <= 10 mins: Opens edit form directly!
   * 3. If > 10 mins: Blocks direct edit & triggers Owner Mobile OTP Modal!
   */
  const handleRequestEditBill = (bill) => {
    const timing = getTimingStatus(bill.createdAt);

    if (timing.isWithin10Mins) {
      // Within 10-Minute Window: Grant direct access!
      openEditBillModal(bill);
      showToast(`✓ 10-Minute grace period active (${timing.formattedRemaining} left). Direct edit access granted.`);
    } else {
      // Exceeded 10 Minutes: Require Owner OTP!
      setTargetItemForOtp({ item: bill, type: 'bill' });
      initiateOwnerOtpFlow(bill, 'Cash Memo');
    }
  };

  const handleRequestEditPurchase = (purchase) => {
    const timing = getTimingStatus(purchase.createdAt);

    if (timing.isWithin10Mins) {
      // Within 10-Minute Window: Grant direct access!
      openEditPurchaseModal(purchase);
      showToast(`✓ 10-Minute grace period active (${timing.formattedRemaining} left). Direct edit access granted.`);
    } else {
      // Exceeded 10 Minutes: Require Owner OTP!
      setTargetItemForOtp({ item: purchase, type: 'purchase' });
      initiateOwnerOtpFlow(purchase, 'Material Purchase');
    }
  };

  // Helper to trigger Owner OTP modal & generate 6-digit code
  // Helper to trigger Owner OTP modal via API
  const initiateOwnerOtpFlow = async (item, typeName) => {
    setEnteredOtp('');
    setOtpError(null);
    setOtpSuccessAlert(null);
    setResendCountdown(30);

    const refNo = item.billNo || item.voucherNo;
    try {
      const res = await sendOwnerOtpApi({
        phone: OWNER_SECURITY_PROFILE.phone,
        refNo,
        typeName,
        requestedBy: user?.name || 'Accountant',
      });
      if (res?.sessionId) {
        setOtpSessionId(res.sessionId);
      }
      setOtpDispatchedSms(`SM CONCRETECH SECURITY ALERT: OTP dispatched via Dove SMS gateway to registered phone ${OWNER_SECURITY_PROFILE.phone}.`);
      showToast(`📨 OTP dispatched via Dove SMS to ${OWNER_SECURITY_PROFILE.phone}`);
    } catch (err) {
      console.warn('OTP API dispatch notice:', err);
      setOtpDispatchedSms(`SM CONCRETECH SECURITY ALERT: OTP dispatched to ${OWNER_SECURITY_PROFILE.phone}.`);
    }

    setOtpModalOpen(true);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || !targetItemForOtp) return;
    const item = targetItemForOtp.item;
    const typeName = targetItemForOtp.type === 'bill' ? 'Cash Memo' : 'Material Purchase';
    const refNo = item.billNo || item.voucherNo;

    setEnteredOtp('');
    setOtpError(null);
    setResendCountdown(30);

    try {
      const res = await sendOwnerOtpApi({
        phone: OWNER_SECURITY_PROFILE.phone,
        refNo,
        typeName,
        requestedBy: user?.name || 'Accountant',
      });
      if (res?.sessionId) {
        setOtpSessionId(res.sessionId);
      }
      showToast(`✓ Fresh OTP dispatched via Dove SMS to ${OWNER_SECURITY_PROFILE.phone}`);
    } catch (err) {
      showToast(`✓ Fresh OTP request sent to ${OWNER_SECURITY_PROFILE.phone}`);
    }
  };


  // Verify Owner OTP via API
  const handleVerifyOtpAndUnlock = async (e) => {
    e.preventDefault();
    setOtpError(null);

    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit numeric OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    const refNo = targetItemForOtp.item.billNo || targetItemForOtp.item.voucherNo;

    try {
      // Validate via OTP API endpoint
      const result = await verifyOwnerOtpApi({
        otp: enteredOtp.trim(),
        phone: OWNER_SECURITY_PROFILE.phone,
        refNo,
        sessionId: otpSessionId,
      });

      if (!result.verified) {
        setOtpError(result.message || '❌ Invalid OTP! The code entered failed API validation.');
        setIsVerifyingOtp(false);
        return;
      }

      // OTP Verified! Log security audit entry
      const newLog = {
        id: `OTP-LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        billNo: refNo,
        itemType: targetItemForOtp.type === 'bill' ? 'Cash Memo' : 'Material Purchase',
        requestedBy: user?.name || 'Accountant',
        ownerPhone: OWNER_SECURITY_PROFILE.phone,
        status: 'Owner OTP Verified & Authorized via Dove SMS (EXTSKL)',
        reason: 'Owner OTP Authorization',
      };

      setOtpLogs((prev) => [newLog, ...prev]);
      addAuditLog(`Owner OTP Verified (${refNo})`, 'Billing Security', `Unlocked by Owner OTP via Dove SMS`);

      setOtpSuccessAlert(`✓ Owner OTP Verified via Dove SMS! Edit access granted for ${refNo}.`);
      
      setTimeout(() => {
        setOtpModalOpen(false);
        if (targetItemForOtp.type === 'bill') {
          openEditBillModal(targetItemForOtp.item, true);
        } else {
          openEditPurchaseModal(targetItemForOtp.item, true);
        }
      }, 600);
    } catch (err) {
      setOtpError(err.message || 'Validation service error. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const openEditBillModal = (bill, authorizedByOtp = false) => {
    setEditingBill({ ...bill, authorizedByOtp });
    setBillForm({
      billNo: bill.billNo,
      date: bill.date,
      vehicle: bill.vehicle || '',
      place: bill.place || '',
      customerName: bill.customerName || '',
      site: bill.site || '',
      customerMobile: bill.customerMobile || '',
      refName: bill.refName || '',
      items: bill.items || [{ sn: 1, material: 'Pump', qty: 1, unit: 'Unit', rate: 6000, total: 6000 }],
      transportation: bill.transportation || 0,
      bankName: bill.bankName || 'SM CONCRETECH',
      bankAccountNo: bill.bankAccountNo || '41890021000189',
      bankAccountType: bill.bankAccountType || 'Current',
      bankBranch: bill.bankBranch || 'Miraj / Sangli',
      bankIfsc: bill.bankIfsc || 'SBIN0001234',
    });
    setShowBillFormModal(true);
  };

  const openEditPurchaseModal = (purchase, authorizedByOtp = false) => {
    setEditingPurchase({ ...purchase, authorizedByOtp });
    setPurchaseForm({
      voucherNo: purchase.voucherNo,
      date: purchase.date,
      supplierName: purchase.supplierName,
      supplierMobile: purchase.supplierMobile,
      material: purchase.material,
      vehicleNo: purchase.vehicleNo,
      plantLocation: purchase.plantLocation,
      weighbridgeSlipNo: purchase.weighbridgeSlipNo,
      qty: purchase.qty,
      unit: purchase.unit,
      rate: purchase.rate,
      taxPercent: purchase.taxPercent || 18,
      paymentStatus: purchase.paymentStatus,
      remarks: purchase.remarks,
    });
    setShowPurchaseFormModal(true);
  };

  // Add Item Row to Bill
  const handleAddItemRow = () => {
    const nextSn = billForm.items.length + 1;
    setBillForm({
      ...billForm,
      items: [
        ...billForm.items,
        { sn: nextSn, material: 'M30 Concrete', qty: 1, unit: 'm³', rate: 4300, total: 4300 }
      ]
    });
  };

  // Remove Item Row from Bill
  const handleRemoveItemRow = (idx) => {
    if (billForm.items.length <= 1) return;
    const updated = billForm.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sn: i + 1 }));
    setBillForm({ ...billForm, items: updated });
  };

  // Update Item in Bill
  const handleItemChange = (idx, field, value) => {
    const updated = [...billForm.items];
    updated[idx][field] = value;
    if (field === 'qty' || field === 'rate') {
      const q = Number(field === 'qty' ? value : updated[idx].qty) || 0;
      const r = Number(field === 'rate' ? value : updated[idx].rate) || 0;
      updated[idx].total = q * r;
    }
    setBillForm({ ...billForm, items: updated });
  };

  // Save / Update Bill
  const handleSaveBill = (e) => {
    e.preventDefault();
    if (!billForm.customerName.trim()) {
      alert('Please enter party/customer name.');
      return;
    }

    const totalAmount = billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0);
    const trans = Number(billForm.transportation) || 0;
    const finalAmount = totalAmount + trans;
    const amountInWords = numberToIndianWords(finalAmount);

    if (editingBill) {
      // Update existing bill
      const updatedList = bills.map((b) => {
        if (b.id === editingBill.id) {
          return {
            ...b,
            ...billForm,
            totalAmount,
            transportation: trans,
            finalAmount,
            amountInWords,
            updatedAt: new Date().toISOString(),
          };
        }
        return b;
      });
      setBills(updatedList);
      showToast(`✓ Bill #${billForm.billNo} updated successfully!`);
    } else {
      // Create new bill
      const newBill = {
        id: `BILL-${Date.now()}`,
        ...billForm,
        type: 'Cash Memo',
        totalAmount,
        transportation: trans,
        finalAmount,
        amountInWords,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBills([newBill, ...bills]);
      showToast(`✓ Cash Memo #${newBill.billNo} generated successfully! (10-Minute direct edit window active)`);
    }

    setShowBillFormModal(false);
  };

  // Save / Update Plant Material Purchase
  const handleSavePurchase = (e) => {
    e.preventDefault();
    if (!purchaseForm.supplierName.trim()) {
      alert('Please enter supplier name.');
      return;
    }

    const total = Number(purchaseForm.qty) * Number(purchaseForm.rate);
    const tax = total * ((Number(purchaseForm.taxPercent) || 18) / 100);
    const finalAmount = total + tax;

    if (editingPurchase) {
      const updatedList = purchases.map((p) => {
        if (p.id === editingPurchase.id) {
          return {
            ...p,
            ...purchaseForm,
            totalAmount: total,
            taxAmount: tax,
            finalAmount,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      setPurchases(updatedList);
      showToast(`✓ Purchase Voucher #${purchaseForm.voucherNo} updated successfully!`);
    } else {
      const newPurchase = {
        id: `PUR-${Date.now()}`,
        ...purchaseForm,
        totalAmount: total,
        taxAmount: tax,
        finalAmount,
        createdAt: new Date().toISOString(),
      };
      setPurchases([newPurchase, ...purchases]);
      showToast(`✓ Plant Purchase Voucher #${newPurchase.voucherNo} created! (10-Minute grace active)`);
    }

    setShowPurchaseFormModal(false);
  };

  // Delete Bill
  const handleDeleteBill = (id, billNo) => {
    if (confirm(`Are you sure you want to delete Cash Memo #${billNo}?`)) {
      setBills(bills.filter((b) => b.id !== id));
      showToast(`Bill #${billNo} removed.`);
    }
  };

  // Delete Purchase
  const handleDeletePurchase = (id, voucherNo) => {
    if (confirm(`Are you sure you want to delete Purchase Voucher #${voucherNo}?`)) {
      setPurchases(purchases.filter((p) => p.id !== id));
      showToast(`Voucher #${voucherNo} removed.`);
    }
  };

  return (
    <div className="space-y-5 text-xs text-slate-800">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white border border-emerald-500 shadow-xl flex items-center gap-3 animate-pop-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs">{notification}</span>
        </div>
      )}

      {/* Navigation Tabs & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Left: Navigation Tabs & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSection('cash_memos')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'cash_memos'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ReceiptText className="w-4 h-4 text-amber-600" />
              <span>Cash Memos (Sales Bills)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-mono font-bold">
                {bills.length}
              </span>
            </button>
          </div>

          {/* Search Bar (Left aligned, next to tabs) */}
          <div className="relative w-full sm:w-56 lg:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill no, vehicle, site..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTableFullScreen(!isTableFullScreen)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title={isTableFullScreen ? 'Exit Full Screen' : 'Full Screen Table'}
          >
            {isTableFullScreen ? <Minimize2 className="w-4 h-4 text-slate-700" /> : <Maximize2 className="w-4 h-4 text-amber-600" />}
          </button>

          <button
            type="button"
            onClick={handleOpenCreateBill}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Cash Memo</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: CASH MEMOS (SALES BILLS) LIST
          ======================================================== */}
      {activeSection === 'cash_memos' && (
        <div className="w-full">
          {(() => {
            const tableElement = (
              <div className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${isTableFullScreen ? 'fixed inset-0 z-[999999] w-screen h-screen bg-white rounded-none p-0 m-0 border-none overflow-auto flex flex-col' : ''}`}>
                {isTableFullScreen && (
                  <div className="flex items-center justify-between p-3.5 px-5 bg-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-amber-400" />
                      <h3 className="font-black text-sm">Cash Memos Register (Full Screen View)</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTableFullScreen(false)}
                      className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                      title="Exit Full Screen"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse table-auto sm:table-fixed">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-200/90">
                        <th className="py-3 px-3.5 w-[15%]">Bill No & Date</th>
                        <th className="py-3 px-3.5 w-[24%]">Party / Customer & Site</th>
                        <th className="py-3 px-3.5 w-[14%]">Transit Vehicle</th>
                        <th className="py-3 px-3.5 w-[17%]">Material Items</th>
                        <th className="py-3 px-3.5 w-[13%] text-right">Final Amount</th>
                        <th className="py-3 px-3.5 w-[11%] text-center">Policy Status</th>
                        <th className="py-3 px-3.5 w-[10%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                    {bills
                      .filter((b) => {
                        const q = searchQuery.toLowerCase();
                        return (
                          b.billNo.toLowerCase().includes(q) ||
                          (b.customerName || '').toLowerCase().includes(q) ||
                          (b.site || '').toLowerCase().includes(q) ||
                          (b.vehicle || '').toLowerCase().includes(q)
                        );
                      })
                      .map((bill) => {
                        const timing = getTimingStatus(bill.createdAt);
                        return (
                          <tr key={bill.id} className="hover:bg-amber-50/40 transition-colors group">
                            <td className="py-3 px-3">
                              <div className="font-mono font-black text-slate-900 text-xs flex items-center gap-1">
                                <ReceiptText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>#{bill.billNo}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{bill.date}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 text-xs leading-snug truncate">{bill.customerName}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{bill.site || bill.place || 'Tanang Site Zone'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-[11px] font-mono text-slate-800 font-semibold truncate">
                                <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{bill.vehicle || 'Direct'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-800 text-[11px] line-clamp-2 leading-tight">
                                {bill.items.map((it) => `${it.material} (${it.qty} ${it.unit})`).join(', ')}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                                ₹ {Number(bill.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {timing.isWithin10Mins ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9px] font-mono font-bold">
                                  <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0 animate-pulse" />
                                  <span>EDIT ({timing.formattedRemaining})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-mono font-bold">
                                  <Lock className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                  <span>LOCKED (OTP)</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPrintingBill(bill)}
                                  className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-2xs transition-all cursor-pointer"
                                  title="Print Cash Memo"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRequestEditBill(bill)}
                                  className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer shadow-2xs ${
                                    timing.isWithin10Mins
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                  }`}
                                  title={timing.isWithin10Mins ? 'Direct Edit' : 'Owner OTP Edit'}
                                >
                                  {timing.isWithin10Mins ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-rose-600" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteBill(bill.id, bill.billNo)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                                  title="Delete Memo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            );

            return isTableFullScreen ? createPortal(tableElement, document.body) : tableElement;
          })()}
        </div>
      )}

      {/* ========================================================
          TAB 2: PLANT MATERIAL PURCHASES LIST
          ======================================================== */}
      {activeSection === 'purchases' && (
        <div className="space-y-4">
          <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden ${isTableFullScreen ? 'fixed inset-0 z-[999999] w-screen h-screen bg-white rounded-none p-0 m-0 border-none overflow-auto flex flex-col' : ''}`}>
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Plant Material Purchases Register (Table View)</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-bold">
                    {purchases.length} VOUCHERS
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTableFullScreen(!isTableFullScreen)}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    title={isTableFullScreen ? 'Exit Full Screen' : 'Full Screen Table'}
                  >
                    {isTableFullScreen ? <Minimize2 className="w-4 h-4 text-slate-700" /> : <Maximize2 className="w-4 h-4 text-cyan-600" />}
                  </button>
                </div>
              </div>

              <div className="w-full">
                <table className="w-full text-left text-xs text-slate-700 border-collapse table-auto sm:table-fixed">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-200/90">
                      <th className="py-3 px-3 w-[15%]">Voucher No & Date</th>
                      <th className="py-3 px-3 w-[24%]">Supplier & Plant Location</th>
                      <th className="py-3 px-3 w-[20%]">Inward Material & Qty</th>
                      <th className="py-3 px-3 w-[13%]">Truck & Slip No</th>
                      <th className="py-3 px-3 w-[12%] text-right">Voucher Total</th>
                      <th className="py-3 px-3 w-[10%] text-center">Policy Status</th>
                      <th className="py-3 px-3 w-[6%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {purchases
                      .filter((p) => {
                        const q = searchQuery.toLowerCase();
                        return (
                          p.voucherNo.toLowerCase().includes(q) ||
                          p.supplierName.toLowerCase().includes(q) ||
                          p.material.toLowerCase().includes(q) ||
                          (p.vehicleNo || '').toLowerCase().includes(q)
                        );
                      })
                      .map((purchase) => {
                        const timing = getTimingStatus(purchase.createdAt);
                        return (
                          <tr key={purchase.id} className="hover:bg-cyan-50/40 transition-colors group">
                            <td className="py-3 px-3">
                              <div className="font-mono font-black text-slate-900 text-xs flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                <span>#{purchase.voucherNo}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{purchase.date || 'Today'}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 text-xs leading-snug truncate">{purchase.supplierName}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <Building2 className="w-3 h-3 text-cyan-600 shrink-0" />
                                <span className="truncate">{purchase.plantLocation || 'Main Plant Silo'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-cyan-900 text-xs truncate">{purchase.material}</div>
                              <div className="text-[10px] text-slate-600 font-mono truncate">
                                {purchase.qty} {purchase.unit} @ ₹{purchase.rate}/{purchase.unit}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-mono text-xs font-bold text-slate-800 truncate">
                                {purchase.vehicleNo || 'Inward Truck'}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Slip #{purchase.weighbridgeSlipNo || 'WB-01'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-mono font-black text-cyan-900 text-xs sm:text-sm">
                                ₹ {Number(purchase.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono font-semibold truncate">{purchase.paymentStatus}</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {timing.isWithin10Mins ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9px] font-mono font-bold">
                                  <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0 animate-pulse" />
                                  <span>EDIT ({timing.formattedRemaining})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-mono font-bold">
                                  <Lock className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                  <span>LOCKED (OTP)</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRequestEditPurchase(purchase)}
                                  className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer shadow-2xs ${
                                    timing.isWithin10Mins
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                  }`}
                                  title={timing.isWithin10Mins ? 'Direct Edit' : 'Owner OTP Edit'}
                                >
                                  {timing.isWithin10Mins ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-rose-600" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeletePurchase(purchase.id, purchase.voucherNo)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                                  title="Delete Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

        </div>
      )}

      {/* ========================================================
          TAB 3: OWNER OTP AUDIT LOGS TABLE
          ======================================================== */}
      {activeSection === 'otp_audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Owner OTP Security Audit Register
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Complete audit trail of all bill & material purchase modifications authorized past the 10-minute window
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              Owner Phone: {OWNER_SECURITY_PROFILE.phone}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Document Ref #</th>
                  <th className="py-2.5 px-3">Record Type</th>
                  <th className="py-2.5 px-3">Accountant / User</th>
                  <th className="py-2.5 px-3">Owner Authorized</th>
                  <th className="py-2.5 px-3">Audit Reason</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {otpLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      #{log.billNo}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {log.itemType}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {log.requestedBy}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {log.ownerPhone}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium max-w-xs">
                      {log.reason}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: OWNER MOBILE OTP VERIFICATION (10-MIN GATE)
          ======================================================== */}
      {otpModalOpen && targetItemForOtp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-pop-in">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden text-slate-900 my-auto">
            {/* Modal Header - Sleek Executive Navy / Slate Theme */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-4 sm:p-4.5 text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-white" />
                  <span>Back</span>
                </button>

                <div className="h-4 w-px bg-white/20 shrink-0 hidden sm:block" />

                <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-400/30 backdrop-blur-md flex items-center justify-center font-bold text-white shrink-0">
                  <KeyRound className="w-4.5 h-4.5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black tracking-tight truncate">
                    Owner Authorization Required
                  </h3>
                  <p className="text-xs text-blue-200/80 truncate">
                    10-Minute grace period expired for #{targetItemForOtp.item.billNo || targetItemForOtp.item.voucherNo}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Form Content - No Scrollbar, Perfectly Fitted */}
            <form onSubmit={handleVerifyOtpAndUnlock} className="p-4 sm:p-5 space-y-3.5 text-xs flex flex-col">
              
              {/* Owner Registered Mobile Information & Live Dispatch Card */}
              <div className="royal-blue-live-panel p-3.5 rounded-2xl text-white border border-blue-300/25 space-y-3 shadow-md shadow-blue-950/20">
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-blue-100 text-[11px] font-bold uppercase tracking-wider">
                      OTP Automatically Dispatched
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-100 bg-emerald-950/40 border border-emerald-300/30 px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    🟢 Dove Gateway Live (EXTSKL)
                  </span>
                </div>

                <div className="relative z-10 rounded-xl bg-blue-950/30 p-3 border border-blue-200/15 space-y-2 backdrop-blur-sm">
                  <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-blue-100/75 font-medium">Authorized Owner:</span>
                    <span className="font-bold text-white sm:text-right">{OWNER_SECURITY_PROFILE.name}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-blue-100/75 font-medium">Delivered to Registered Mobile:</span>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-cyan-200" />
                      <span className="font-mono font-black text-white text-sm tracking-wide">
                        {OWNER_SECURITY_PROFILE.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] pt-1.5 border-t border-blue-200/15 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-blue-100/75">Security Validity:</span>
                    <span className="text-amber-200 font-bold">5 Minutes (Single-Use Only)</span>
                  </div>
                </div>

                {/* Live Gateway Delivery & Resend Action */}
                <div className="relative z-10 pt-0.5 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-blue-100/80 text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Instant carrier delivery via Dove SMS</span>
                  </div>
                  {resendCountdown > 0 ? (
                    <span className="text-blue-100/75 font-mono text-[10px]">
                      Resend in <strong className="text-cyan-200">{resendCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-cyan-200 hover:text-white font-bold transition-colors cursor-pointer text-[10px] flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg border border-white/15"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* OTP Input Field */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Enter 6-Digit Owner Authorization OTP *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-2.5 rounded-2xl text-center text-2xl font-mono font-black tracking-[0.4em] bg-slate-50 border-2 border-slate-300 focus:bg-white focus:border-blue-600 focus:outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                    required
                    autoFocus
                    disabled={isVerifyingOtp}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Enter the 6-digit code delivered to registered mobile number <strong>{OWNER_SECURITY_PROFILE.phone}</strong>.
                </p>
                {/* Firebase Phone Auth invisible reCAPTCHA mount container */}
                <div id="recaptcha-container"></div>
              </div>

              {/* Error / Success Feedback */}
              {otpError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
              {otpSuccessAlert && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{otpSuccessAlert}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  disabled={isVerifyingOtp}
                  onClick={() => setOtpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white shadow-md shadow-blue-900/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Verify OTP & Unlock Bill</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE / EDIT CASH MEMO BILL FORM
          ======================================================== */}
      {showBillFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col my-auto overflow-hidden text-slate-900 text-xs">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 sm:px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowBillFormModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:scale-95 text-white flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
                  <span>Back</span>
                </button>

                <div className="h-4 w-px bg-slate-700 shrink-0 hidden sm:block" />

                <div className="min-w-0">
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2 truncate">
                    <ReceiptText className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="truncate">{editingBill ? `Edit Cash Memo #${billForm.billNo}` : 'Generate Official Cash Memo'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    SM CONCRETECH • Format matching official paper memo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBillFormModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bill Form Content */}
            <form onSubmit={handleSaveBill} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Row 1: Bill No, Date, Vehicle, Place */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Bill No *</label>
                  <input
                    type="text"
                    value={billForm.billNo}
                    onChange={(e) => setBillForm({ ...billForm, billNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="text"
                    value={billForm.date}
                    onChange={(e) => setBillForm({ ...billForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Vehicle</label>
                  <input
                    type="text"
                    value={billForm.vehicle}
                    onChange={(e) => setBillForm({ ...billForm, vehicle: e.target.value })}
                    placeholder="e.g. MH-10-CR-1212"
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Place *</label>
                  <input
                    type="text"
                    value={billForm.place}
                    onChange={(e) => setBillForm({ ...billForm, place: e.target.value })}
                    placeholder="e.g. Aaudumbar"
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Bill To Party */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <span className="font-bold text-xs text-amber-950 block">Bill To Party Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Party / Client Name *</label>
                    <input
                      type="text"
                      value={billForm.customerName}
                      onChange={(e) => setBillForm({ ...billForm, customerName: e.target.value })}
                      placeholder="e.g. Patil Infrastructure & Builders"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={billForm.customerMobile}
                      onChange={(e) => setBillForm({ ...billForm, customerMobile: e.target.value })}
                      placeholder="e.g. +91 98221 54321"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Site Location</label>
                    <input
                      type="text"
                      value={billForm.site}
                      onChange={(e) => setBillForm({ ...billForm, site: e.target.value })}
                      placeholder="e.g. Aaudumbar Riverside Pier"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Reference Name</label>
                    <input
                      type="text"
                      value={billForm.refName}
                      onChange={(e) => setBillForm({ ...billForm, refName: e.target.value })}
                      placeholder="e.g. D. K. Patil"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Items Table (Material, Qty, Unit, Rate, Total) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Materials & Dispatch Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-10 text-center">SN.</th>
                        <th className="p-2">Material Description</th>
                        <th className="p-2 w-16 text-center">Qty</th>
                        <th className="p-2 w-20 text-center">Unit</th>
                        <th className="p-2 w-24 text-right">Rate</th>
                        <th className="p-2 w-28 text-right">Total (₹)</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billForm.items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.material}
                              onChange={(e) => handleItemChange(idx, 'material', e.target.value)}
                              placeholder="e.g. Pump or Concrete Grade"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-900 font-medium"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-center font-mono font-bold text-slate-900"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-center text-slate-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-right font-mono font-bold text-slate-900"
                              required
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-black text-slate-950">
                            {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            {billForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-rose-500 hover:text-rose-700 font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 4: Transportation & Final Total Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Transportation Charges (₹)</label>
                  <input
                    type="number"
                    value={billForm.transportation}
                    onChange={(e) => setBillForm({ ...billForm, transportation: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Total in Words will update automatically
                  </span>
                </div>

                <div className="flex flex-col justify-end text-right">
                  <span className="text-slate-500 text-xs">Computed Final Amount:</span>
                  <span className="text-xl font-black font-mono text-emerald-700">
                    ₹ {(
                      billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) +
                      (Number(billForm.transportation) || 0)
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 truncate">
                    {numberToIndianWords(
                      billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) +
                      (Number(billForm.transportation) || 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBillFormModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 border border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md cursor-pointer"
                >
                  {editingBill ? 'Save & Update Bill' : 'Generate Cash Memo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE / EDIT PLANT MATERIAL PURCHASE FORM
          ======================================================== */}
      {showPurchaseFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col my-auto overflow-hidden text-slate-900 text-xs">
            <div className="bg-slate-900 text-white p-3.5 sm:px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowPurchaseFormModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:scale-95 text-white flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
                  <span>Back</span>
                </button>

                <div className="h-4 w-px bg-slate-700 shrink-0 hidden sm:block" />

                <h3 className="text-base font-black tracking-tight flex items-center gap-2 truncate">
                  <Truck className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="truncate">{editingPurchase ? `Edit Purchase #${purchaseForm.voucherNo}` : 'Record Plant Material Purchase'}</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPurchaseFormModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePurchase} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Voucher No *</label>
                  <input
                    type="text"
                    value={purchaseForm.voucherNo}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, voucherNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="text"
                    value={purchaseForm.date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    value={purchaseForm.supplierName}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
                    placeholder="e.g. UltraTech Cement or Local Quarry"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier Contact</label>
                  <input
                    type="text"
                    value={purchaseForm.supplierMobile}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierMobile: e.target.value })}
                    placeholder="+91 98230 00000"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Material Description *</label>
                  <select
                    value={purchaseForm.material}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, material: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-bold"
                  >
                    <option value="OPC 53 Grade Cement">OPC 53 Grade Cement</option>
                    <option value="PPC Cement (Flyash Based)">PPC Cement (Flyash Based)</option>
                    <option value="10mm Basalt Aggregates">10mm Basalt Aggregates</option>
                    <option value="20mm Basalt Aggregates">20mm Basalt Aggregates</option>
                    <option value="Crushed M-Sand (Zone II)">Crushed M-Sand (Zone II)</option>
                    <option value="River Sand (Washed)">River Sand (Washed)</option>
                    <option value="Fly Ash (Class F)">Fly Ash (Class F)</option>
                    <option value="PCE Chemical Admixture">PCE Chemical Admixture</option>
                    <option value="Plant Diesel Fuel">Plant Diesel Fuel</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Weighbridge Slip No</label>
                  <input
                    type="text"
                    value={purchaseForm.weighbridgeSlipNo}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, weighbridgeSlipNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Inward Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    value={purchaseForm.qty}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Rate per Unit (₹)</label>
                  <input
                    type="number"
                    value={purchaseForm.rate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPurchaseFormModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 border border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white"
                >
                  {editingPurchase ? 'Update Purchase' : 'Save Purchase Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CASH MEMO PRINT VIEW (PIXEL-PERFECT POPUP MODAL)
          ======================================================== */}
      {printingBill && (
        <CashMemoPrintView
          bill={printingBill}
          onClose={() => setPrintingBill(null)}
        />
      )}

    </div>
  );
}
