import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Loader2,
  IndianRupee,
  Hash,
  UserCheck,
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
  History,
  CheckCheck,
  TrendingUp,
  CircleDollarSign,
  ChevronDown
} from 'lucide-react';
import CashMemoPrintView from './CashMemoPrintView';
import CustomerStatementModal from './CustomerStatementModal';
import { useExclusiveModal } from '../dashboard/Modal';
import { numberToIndianWords } from '../../utils/numberToWords';
import { useAuth } from '../../context/AuthContext';
import { useWorkforce } from '../../context/WorkforceContext';
import { sendOwnerOtpApi, verifyOwnerOtpApi } from '../../services/otpService';
import { normalizeBill } from '../../utils/billingPayments';

export { normalizeBill };

const BILLING_STORAGE_KEY = 'rmc_billing_records_v3';
const PURCHASES_STORAGE_KEY = 'rmc_plant_purchases_v3';
const OTP_LOGS_STORAGE_KEY = 'rmc_billing_otp_audit_v3';

// Owner Contact Information (From Cash Memo header & official accounts)
export const OWNER_SECURITY_PROFILE = {
  name: 'Sunil More / Shahesh D. Mane',
  role: 'Owner & Proprietor',
  phone: '+91 9421858683',
  altPhone: '+91 9373488061',
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

  // Persistent Bills State with payment tracking normalization
  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem(BILLING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeBill);
        }
      }
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

  // Customer Filter & Statement Modal State
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [customerStatementModal, setCustomerStatementModal] = useState(null);

  // Derived Unique Customer Names
  const uniqueCustomers = useMemo(() => {
    return Array.from(
      new Set(bills.map((b) => (b.customerName || 'Cash Customer').trim()).filter(Boolean))
    ).sort();
  }, [bills]);

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

  // Payment Collection & History Modal State
  const [paymentModalBill, setPaymentModalBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'Cash', // 'Cash' | 'Online UPI' | 'Bank Transfer' | 'Cheque'
    referenceNo: '',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    receivedBy: '',
    remarks: '',
  });
  const [paymentError, setPaymentError] = useState(null);

  useExclusiveModal(otpModalOpen, () => setOtpModalOpen(false));
  useExclusiveModal(showBillFormModal, () => setShowBillFormModal(false));
  useExclusiveModal(showPurchaseFormModal, () => setShowPurchaseFormModal(false));
  useExclusiveModal(isTableFullScreen, () => setIsTableFullScreen(false));
  useExclusiveModal(!!paymentModalBill, () => setPaymentModalBill(null));

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
    constructionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
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
    initialPaymentOption: 'unpaid', // 'unpaid' | 'partial' | 'full'
    initialPaymentAmount: 0,
    initialPaymentMode: 'Cash',
    initialPaymentRef: '',
    initialPaymentRemarks: '',
  });

  const [billMobileError, setBillMobileError] = useState(null);
  const [billFormErrors, setBillFormErrors] = useState({});
  const customerNameInputRef = useRef(null);

  // Strict 10-Digit Mobile Handler
  const handleMobileChange = (e) => {
    let inputVal = e.target.value;
    let digits = inputVal.replace(/\D/g, '');
    
    // If pasted with 91 prefix and 12 digits, strip 91
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    
    // Limit to 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }
    
    setBillForm((prev) => ({ ...prev, customerMobile: digits }));
    
    // Live validation feedback
    if (digits.length === 0) {
      setBillMobileError(null);
    } else if (digits.length > 0 && !/^[6-9]/.test(digits)) {
      setBillMobileError('Must start with 6, 7, 8, or 9 (Indian cellular standard)');
    } else if (digits.length > 0 && digits.length < 10) {
      setBillMobileError(`${10 - digits.length} digit${10 - digits.length > 1 ? 's' : ''} remaining`);
    } else if (digits.length === 10) {
      setBillMobileError(null);
    }
  };

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
    setBillMobileError(null);
    setBillFormErrors({});
    setBillForm({
      billNo: `25-26/${bills.length + 115}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      constructionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      vehicle: '',
      place: 'Aaudumbar',
      customerName: selectedCustomer !== 'ALL' ? selectedCustomer : '',
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
      initialPaymentOption: 'unpaid', // 'unpaid' | 'partial' | 'full'
      initialPaymentAmount: 0,
      initialPaymentMode: 'Cash',
      initialPaymentRef: '',
      initialPaymentRemarks: '',
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
    setBillMobileError(null);
    setBillFormErrors({});
    const rawMobile = (bill.customerMobile || '').replace(/\D/g, '');
    const cleanMobile = rawMobile.length === 12 && rawMobile.startsWith('91') ? rawMobile.slice(2) : rawMobile.slice(-10);
    setBillForm({
      billNo: bill.billNo,
      date: bill.date,
      constructionDate: bill.constructionDate || bill.date || '',
      vehicle: bill.vehicle || '',
      place: bill.place || '',
      customerName: bill.customerName || '',
      site: bill.site || '',
      customerMobile: cleanMobile || '',
      refName: bill.refName || '',
      items: bill.items || [{ sn: 1, material: 'Pump', qty: 1, unit: 'Unit', rate: 6000, total: 6000 }],
      transportation: bill.transportation || 0,
      bankName: bill.bankName || 'SM CONCRETECH',
      bankAccountNo: bill.bankAccountNo || '41890021000189',
      bankAccountType: bill.bankAccountType || 'Current',
      bankBranch: bill.bankBranch || 'Miraj / Sangli',
      bankIfsc: bill.bankIfsc || 'SBIN0001234',
      initialPaymentOption: 'unpaid',
      initialPaymentAmount: 0,
      initialPaymentMode: 'Cash',
      initialPaymentRef: '',
      initialPaymentRemarks: '',
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
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    setBillFormErrors({});
    setBillMobileError(null);

    // Fallback party name to 'Cash Customer' if empty
    const partyName = (billForm.customerName || '').trim() || 'Cash Customer';

    // Format mobile number safely
    let cleanMobile = (billForm.customerMobile || '').replace(/\D/g, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.slice(2);
    }
    const formattedMobile = cleanMobile.length === 10 ? `+91 ${cleanMobile}` : (cleanMobile || '');

    // Ensure valid items
    const validItems = (billForm.items && billForm.items.length > 0)
      ? billForm.items.map((it, idx) => {
          const qty = Number(it.qty) || 1;
          const rate = Number(it.rate) || 4200;
          return {
            sn: idx + 1,
            material: (it.material || '').trim() || 'M25 Concrete',
            qty,
            unit: it.unit || 'm³',
            rate,
            total: qty * rate,
          };
        })
      : [{ sn: 1, material: 'M25 Concrete', qty: 6, unit: 'm³', rate: 4200, total: 25200 }];

    const totalAmount = validItems.reduce((s, it) => s + (Number(it.total) || 0), 0);
    const trans = Number(billForm.transportation) || 0;
    const finalAmount = totalAmount + trans;
    const amountInWords = numberToIndianWords(finalAmount);

    const billNumber = (billForm.billNo || '').trim() || `25-26/${bills.length + 115}`;
    const billDate = (billForm.date || '').trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const billConstructionDate = (billForm.constructionDate || '').trim() || billDate;
    const billVehicle = (billForm.vehicle || '').trim() || 'MH-10-CR-1212';
    const billPlace = (billForm.place || '').trim() || 'Aaudumbar';

    if (editingBill) {
      // Update existing bill while preserving payments history and recalculating balance
      const updatedList = bills.map((b) => {
        if (b.id === editingBill.id) {
          const payments = Array.isArray(b.payments) ? b.payments : [];
          const paidAmount = payments.length > 0 
            ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
            : Number(b.paidAmount || 0);
          const balanceAmount = Math.max(0, finalAmount - paidAmount);
          const paymentStatus = balanceAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Unpaid');

          return normalizeBill({
            ...b,
            ...billForm,
            billNo: billNumber,
            date: billDate,
            constructionDate: billConstructionDate,
            vehicle: billVehicle,
            place: billPlace,
            customerName: partyName,
            customerMobile: formattedMobile,
            items: validItems,
            totalAmount,
            transportation: trans,
            finalAmount,
            paidAmount,
            balanceAmount,
            paymentStatus,
            amountInWords,
            updatedAt: new Date().toISOString(),
          });
        }
        return b;
      });
      setBills(updatedList);
      try {
        localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Storage error:', err);
      }
      showToast(`✓ Bill #${billNumber} updated successfully!`);
      const updatedItem = updatedList.find((b) => b.id === editingBill.id);
      setShowBillFormModal(false);
      setEditingBill(null);
      if (updatedItem) {
        setPrintingBill(updatedItem);
      }
    } else {
      // Create new bill with optional initial payment (Cash or Online)
      let initialPayments = [];
      let initialPaid = 0;
      let initialStatus = 'Unpaid';

      if (billForm.initialPaymentOption === 'full') {
        initialPaid = finalAmount;
        initialStatus = 'Paid';
        initialPayments.push({
          id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: billDate,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          amount: initialPaid,
          mode: billForm.initialPaymentMode || 'Cash',
          referenceNo: (billForm.initialPaymentRef || 'Full payment at billing').trim(),
          receivedBy: user?.name || 'Cashier / Supervisor',
          remarks: (billForm.initialPaymentRemarks || 'Paid in full on generation').trim(),
          createdAt: new Date().toISOString(),
        });
      } else if (billForm.initialPaymentOption === 'partial') {
        const enteredAmt = Math.min(finalAmount, Math.max(0, Number(billForm.initialPaymentAmount) || 0));
        if (enteredAmt > 0) {
          initialPaid = enteredAmt;
          initialStatus = initialPaid >= finalAmount ? 'Paid' : 'Partially Paid';
          initialPayments.push({
            id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: billDate,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            amount: initialPaid,
            mode: billForm.initialPaymentMode || 'Cash',
            referenceNo: (billForm.initialPaymentRef || 'Advance payment at billing').trim(),
            receivedBy: user?.name || 'Cashier / Supervisor',
            remarks: (billForm.initialPaymentRemarks || 'Advance manual cash/online payment on site').trim(),
            createdAt: new Date().toISOString(),
          });
        }
      }

      const initialBalance = Math.max(0, finalAmount - initialPaid);

      const newBill = normalizeBill({
        id: `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...billForm,
        billNo: billNumber,
        date: billDate,
        constructionDate: billConstructionDate,
        vehicle: billVehicle,
        place: billPlace,
        customerName: partyName,
        customerMobile: formattedMobile,
        items: validItems,
        type: 'Cash Memo',
        totalAmount,
        transportation: trans,
        finalAmount,
        paidAmount: initialPaid,
        balanceAmount: initialBalance,
        paymentStatus: initialStatus,
        payments: initialPayments,
        amountInWords,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const updatedList = [newBill, ...bills];
      setBills(updatedList);
      try {
        localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Storage error:', err);
      }

      if (initialPaid > 0 && addAuditLog) {
        addAuditLog(
          `Initial Payment Logged (${newBill.billNo})`,
          'Billing',
          `₹${initialPaid.toLocaleString('en-IN')} (${billForm.initialPaymentMode}) recorded at memo generation`
        );
      }

      showToast(`✓ Cash Memo #${newBill.billNo} generated successfully!`);
      setShowBillFormModal(false);
      setEditingBill(null);
      setPrintingBill(newBill);
    }

    setActiveSection('cash_memos');
    setSearchQuery('');
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
      const nextBills = bills.filter((b) => b.id !== id);
      setBills(nextBills);
      try {
        localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(nextBills));
      } catch (e) {
        console.error('Storage error:', e);
      }
      showToast(`Bill #${billNo} removed.`);
    }
  };

  // Open Payment Collection & History Modal
  const handleOpenPaymentModal = (bill) => {
    const norm = normalizeBill(bill);
    setPaymentModalBill(norm);
    setPaymentForm({
      amount: norm.balanceAmount > 0 ? norm.balanceAmount : '',
      mode: 'Cash',
      referenceNo: '',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      receivedBy: user?.name || 'Cashier / Supervisor',
      remarks: norm.balanceAmount > 0 ? (norm.paidAmount > 0 ? 'Balance settlement payment' : 'Advance received on site') : '',
    });
    setPaymentError(null);
  };

  // Record a payment (Cash, Online UPI, Bank Transfer, Cheque)
  const handleRecordPayment = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (!paymentModalBill) return;

    const payAmt = Number(paymentForm.amount);
    if (!payAmt || isNaN(payAmt) || payAmt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    const currentBalance = Number(paymentModalBill.balanceAmount || 0);
    if (payAmt > currentBalance && currentBalance > 0) {
      if (!confirm(`Entered payment (₹${payAmt.toLocaleString('en-IN')}) exceeds the pending balance (₹${currentBalance.toLocaleString('en-IN')}). Do you want to proceed with this payment?`)) {
        return;
      }
    }

    const newPayment = {
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: paymentForm.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: paymentForm.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      amount: payAmt,
      mode: paymentForm.mode || 'Cash',
      referenceNo: (paymentForm.referenceNo || '').trim(),
      receivedBy: (paymentForm.receivedBy || user?.name || 'Cashier / Supervisor').trim(),
      remarks: (paymentForm.remarks || '').trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedBills = bills.map((b) => {
      if (b.id === paymentModalBill.id) {
        const existingPayments = Array.isArray(b.payments) ? b.payments : [];
        const updatedPayments = [newPayment, ...existingPayments];
        const newPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const newBalance = Math.max(0, (Number(b.finalAmount) || 0) - newPaid);
        const newStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

        return normalizeBill({
          ...b,
          payments: updatedPayments,
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
      return b;
    });

    setBills(updatedBills);
    try {
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(updatedBills));
    } catch (err) {
      console.error('Storage error:', err);
    }

    if (addAuditLog) {
      addAuditLog(
        `Payment Recorded (${paymentModalBill.billNo})`,
        'Billing',
        `₹${payAmt.toLocaleString('en-IN')} via ${paymentForm.mode} received by ${paymentForm.receivedBy || user?.name || 'Cashier'}`
      );
    }

    const refreshedBill = updatedBills.find((b) => b.id === paymentModalBill.id);
    setPaymentModalBill(refreshedBill);
    setPaymentForm((prev) => ({
      ...prev,
      amount: refreshedBill.balanceAmount > 0 ? refreshedBill.balanceAmount : '',
      referenceNo: '',
      remarks: '',
    }));
    setPaymentError(null);
    showToast(`✓ Payment of ₹${payAmt.toLocaleString('en-IN')} (${paymentForm.mode}) recorded for Bill #${paymentModalBill.billNo}!`);
  };

  // Delete / Revert an incorrect payment record
  const handleDeletePayment = (paymentId) => {
    if (!paymentModalBill) return;
    const targetPayment = (paymentModalBill.payments || []).find((p) => p.id === paymentId);
    if (!targetPayment) return;

    if (!confirm(`Are you sure you want to void/delete this payment record of ₹${Number(targetPayment.amount).toLocaleString('en-IN')} (${targetPayment.mode})? The bill balance will be restored.`)) {
      return;
    }

    const updatedBills = bills.map((b) => {
      if (b.id === paymentModalBill.id) {
        const updatedPayments = (b.payments || []).filter((p) => p.id !== paymentId);
        const newPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const newBalance = Math.max(0, (Number(b.finalAmount) || 0) - newPaid);
        const newStatus = newBalance <= 0 ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : 'Unpaid');

        return normalizeBill({
          ...b,
          payments: updatedPayments,
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
      return b;
    });

    setBills(updatedBills);
    try {
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(updatedBills));
    } catch (err) {
      console.error('Storage error:', err);
    }

    if (addAuditLog) {
      addAuditLog(
        `Payment Voided (${paymentModalBill.billNo})`,
        'Billing',
        `Reverted ₹${Number(targetPayment.amount).toLocaleString('en-IN')} (${targetPayment.mode})`
      );
    }

    const refreshedBill = updatedBills.find((b) => b.id === paymentModalBill.id);
    setPaymentModalBill(refreshedBill);
    showToast(`Payment of ₹${Number(targetPayment.amount).toLocaleString('en-IN')} reversed.`);
  };

  // Delete Purchase
  const handleDeletePurchase = (id, voucherNo) => {
    if (confirm(`Are you sure you want to delete Purchase Voucher #${voucherNo}?`)) {
      const nextPurchases = purchases.filter((p) => p.id !== id);
      setPurchases(nextPurchases);
      try {
        localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(nextPurchases));
      } catch (e) {
        console.error('Storage error:', e);
      }
      showToast(`Voucher #${voucherNo} removed.`);
    }
  };

  return (
    <div className="space-y-5 text-xs text-slate-800">
      
      {/* Toast Notification Banner (Rendered via Portal so it is always on top) */}
      {notification && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-5 right-5 z-[100000] p-4 rounded-2xl bg-slate-900/95 text-white border border-slate-700 shadow-2xl flex items-center gap-3 animate-pop-in backdrop-blur-md">
          {notification.startsWith('⚠️') ? (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="font-semibold text-xs">{notification}</span>
        </div>,
        document.body
      )}

      {/* Navigation Tabs & Action Toolbar - Responsive Grid on Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3 mb-3">
        {/* Left: Navigation Tabs, Search Bar, and Customer Selector */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('cash_memos')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSection === 'cash_memos'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ReceiptText className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cash Memos (Sales Bills)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-mono font-bold">
                {bills.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[170px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill no, vehicle, site..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            />
          </div>

          {/* Customer Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="pl-8 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 shadow-2xs appearance-none cursor-pointer"
            >
              <option value="ALL">All Customers ({bills.length})</option>
              {uniqueCustomers.map((c) => {
                const count = bills.filter((b) => (b.customerName || 'Cash Customer').trim().toLowerCase() === c.trim().toLowerCase()).length;
                return (
                  <option key={c} value={c}>
                    {c} ({count})
                  </option>
                );
              })}
            </select>
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Fetch Statement Quick Button */}
          <button
            type="button"
            onClick={() => {
              const targetCust = selectedCustomer !== 'ALL' ? selectedCustomer : (uniqueCustomers[0] || 'Cash Customer');
              setCustomerStatementModal(targetCust);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Fetch Customer Statement of Account"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Customer Statement</span>
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsTableFullScreen(!isTableFullScreen)}
            className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0"
            title={isTableFullScreen ? 'Exit Full Screen' : 'Full Screen Table'}
          >
            {isTableFullScreen ? <Minimize2 className="w-4 h-4 text-slate-700" /> : <Maximize2 className="w-4 h-4 text-amber-600" />}
          </button>

          <button
            type="button"
            onClick={handleOpenCreateBill}
            className="flex-1 sm:flex-none justify-center px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 shrink-0" />
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
            const customerBills = selectedCustomer === 'ALL'
              ? bills
              : bills.filter((b) => (b.customerName || 'Cash Customer').trim().toLowerCase() === selectedCustomer.trim().toLowerCase());

            const totalInvoiced = customerBills.reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);
            const totalCash = customerBills.reduce((s, b) => s + (Number(b.cashPaidAmount) || 0), 0);
            const totalOnline = customerBills.reduce((s, b) => s + (Number(b.onlinePaidAmount) || 0), 0);
            const totalBalance = customerBills.reduce((s, b) => s + (Number(b.balanceAmount) || 0), 0);
            const paidBillsCount = customerBills.filter((b) => b.paymentStatus === 'Paid').length;
            const pendingBillsCount = customerBills.filter((b) => b.paymentStatus !== 'Paid').length;

            const filteredBills = customerBills.filter((b) => {
              const q = searchQuery.toLowerCase();
              return (
                b.billNo.toLowerCase().includes(q) ||
                (b.customerName || '').toLowerCase().includes(q) ||
                (b.site || '').toLowerCase().includes(q) ||
                (b.vehicle || '').toLowerCase().includes(q)
              );
            });

            const tableElement = (
              <div className="space-y-3.5">
                {/* Active Customer Filter Banner */}
                {selectedCustomer !== 'ALL' && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-200/90 p-3 px-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{selectedCustomer}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {customerBills.length} {customerBills.length === 1 ? 'Cash Memo' : 'Cash Memos'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2 mt-0.5 font-mono">
                          <span>Invoiced: <strong className="text-slate-900">₹{totalInvoiced.toLocaleString('en-IN')}</strong></span>
                          <span>• Paid: <strong className="text-emerald-700">₹{(totalCash + totalOnline).toLocaleString('en-IN')}</strong></span>
                          <span>• Due: <strong className={totalBalance > 0 ? 'text-amber-800 font-black' : 'text-emerald-600'}>₹{totalBalance.toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCustomerStatementModal(selectedCustomer)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/10 transition-all cursor-pointer active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Fetch Statement of Account</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer('ALL')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                )}

                {/* 4 Financial & Payment KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* 1. Total Invoiced */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {selectedCustomer !== 'ALL' ? 'Customer Invoiced' : 'Total Invoiced'}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ReceiptText className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-slate-900 text-base sm:text-lg">
                        ₹ {totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                        {selectedCustomer !== 'ALL' ? `${selectedCustomer} (${customerBills.length} Memos)` : `${bills.length} Total Cash Memos`}
                      </div>
                    </div>
                  </div>

                  {/* 2. Total Cash Received */}
                  <div className="bg-white rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-emerald-800 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Cash Received</span>
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Banknote className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-emerald-700 text-base sm:text-lg">
                        ₹ {totalCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">
                        {selectedCustomer !== 'ALL' ? `${selectedCustomer} Cash Paid` : 'Manual On-Site & Counter Cash'}
                      </div>
                    </div>
                  </div>

                  {/* 3. Total Online / Bank Received */}
                  <div className="bg-white rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-blue-800 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Online / UPI</span>
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <QrCode className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-blue-700 text-base sm:text-lg">
                        ₹ {totalOnline.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-blue-700 font-medium mt-0.5 truncate">
                        {selectedCustomer !== 'ALL' ? `${selectedCustomer} Online Receipts` : 'UPI, NEFT & Cheques'}
                      </div>
                    </div>
                  </div>

                  {/* 4. Total Outstanding Balance */}
                  <div className="bg-white rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-900 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Balance Due</span>
                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-amber-900 text-base sm:text-lg">
                        ₹ {totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                        {pendingBillsCount} Pending • {paidBillsCount} Paid in Full
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Container */}
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
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                        title="Exit Full Screen"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* DESKTOP TABLE VIEW (Visible on >= md screens) */}
                  <div className="hidden md:block w-full overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-200/90 select-none">
                          <th className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">Bill No & Date</th>
                          <th className="py-2.5 px-2 sm:px-2.5">Party & Site</th>
                          <th className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">Vehicle</th>
                          <th className="py-2.5 px-2 sm:px-2.5">Material Items</th>
                          <th className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">Bill Total</th>
                          <th className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">Paid vs Balance</th>
                          <th className="py-2.5 px-2 sm:px-2.5 text-center whitespace-nowrap">Status</th>
                          <th className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {filteredBills.length > 0 ? (
                          filteredBills.map((bill) => {
                            const timing = getTimingStatus(bill.createdAt);
                            const hasBalance = Number(bill.balanceAmount || 0) > 0;
                            return (
                              <tr key={bill.id} className="hover:bg-amber-50/40 transition-colors group">
                                <td className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">
                                  <div className="font-mono font-black text-slate-900 text-xs flex items-center gap-1">
                                    <ReceiptText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>#{bill.billNo}</span>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 mt-0.5 space-y-0.5">
                                    <div>Bill: {bill.date}</div>
                                    <div className="text-amber-800 font-bold">Const: {bill.constructionDate || bill.date}</div>
                                  </div>
                                </td>

                                <td className="py-2.5 px-2 sm:px-2.5 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-slate-900 text-xs leading-snug truncate max-w-[110px] lg:max-w-[160px]" title={bill.customerName}>
                                      {bill.customerName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCustomer(bill.customerName || 'Cash Customer');
                                        setCustomerStatementModal(bill.customerName || 'Cash Customer');
                                      }}
                                      className="text-[9px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer shrink-0 transition-colors"
                                      title="Fetch Statement for this customer"
                                    >
                                      Statement
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[130px] lg:max-w-[180px]">
                                    <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="truncate">{bill.site || bill.place || 'Tanang Site Zone'}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-800 font-bold shadow-2xs">
                                    <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>{bill.vehicle || 'Direct'}</span>
                                  </span>
                                </td>

                                <td className="py-2.5 px-2 sm:px-2.5">
                                  <div className="space-y-0.5">
                                    {bill.items && bill.items.length > 0 ? (
                                      bill.items.map((it, idx) => (
                                        <div key={idx} className="text-[11px] leading-tight whitespace-nowrap">
                                          <span className="font-bold text-slate-900">{it.material}</span>{' '}
                                          <span className="font-mono text-slate-500 text-[10px]">({it.qty} {it.unit})</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 text-xs italic">No items</span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">
                                  <div className="font-mono font-black text-slate-900 text-xs">
                                    ₹ {Number(bill.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Paid Amount vs Outstanding Balance */}
                                <td className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">
                                  <div className="text-[10px] font-mono font-bold text-emerald-700">
                                    Paid: ₹ {Number(bill.paidAmount || 0).toLocaleString('en-IN')}
                                  </div>
                                  <div className={`text-[10px] font-mono mt-0.5 ${hasBalance ? 'text-amber-800 font-black' : 'text-emerald-600 font-medium'}`}>
                                    {hasBalance ? `Due: ₹ ${Number(bill.balanceAmount).toLocaleString('en-IN')}` : 'Cleared ✓'}
                                  </div>
                                </td>

                                {/* Payment Status Badge */}
                                <td className="py-2.5 px-2 sm:px-2.5 text-center whitespace-nowrap">
                                  {bill.paymentStatus === 'Paid' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                      <span>Paid</span>
                                    </span>
                                  ) : bill.paymentStatus === 'Partially Paid' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                      <Clock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                      <span>Partial</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                                      <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                      <span>Unpaid</span>
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center justify-end gap-1 shrink-0">
                                    {/* 1-Click Collect / Record Payment Modal */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentModal(bill)}
                                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95 shrink-0 ${
                                        hasBalance
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                      }`}
                                      title={hasBalance ? 'Collect / Record Payment' : 'View Payment History'}
                                    >
                                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPrintingBill(bill)}
                                      className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                                      title="Print Cash Memo"
                                    >
                                      <Printer className="w-3.5 h-3.5 shrink-0" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRequestEditBill(bill)}
                                      className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                                        timing.isWithin10Mins
                                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                      }`}
                                      title={timing.isWithin10Mins ? 'Direct Edit' : 'Owner OTP Edit'}
                                    >
                                      {timing.isWithin10Mins ? <Edit3 className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBill(bill.id, bill.billNo)}
                                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer active:scale-95 shrink-0"
                                      title="Delete Memo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              No cash memos found matching search query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE RESPONSIVE CARDS (< md screens) */}
                  <div className="block md:hidden p-2.5 sm:p-3 space-y-2.5 bg-slate-50/50">
                    {filteredBills.length > 0 ? (
                      filteredBills.map((bill) => {
                        const timing = getTimingStatus(bill.createdAt);
                        const hasBalance = Number(bill.balanceAmount || 0) > 0;
                        return (
                          <div
                            key={bill.id}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 transition-all"
                          >
                            {/* Card Top: Bill No & Status Pill */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ReceiptText className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="font-mono font-black text-slate-900 text-xs truncate">
                                  #{bill.billNo}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 truncate">
                                  • Bill: {bill.date} • <strong className="text-amber-800">Const: {bill.constructionDate || bill.date}</strong>
                                </span>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {bill.paymentStatus === 'Paid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                    <span>Paid</span>
                                  </span>
                                ) : bill.paymentStatus === 'Partially Paid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                    <Clock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                    <span>Partial</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                                    <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                    <span>Unpaid</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer Name & Site Location */}
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-black text-slate-900 text-xs leading-snug">
                                  {bill.customerName}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(bill.customerName || 'Cash Customer');
                                    setCustomerStatementModal(bill.customerName || 'Cash Customer');
                                  }}
                                  className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                                >
                                  Fetch Statement
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{bill.site || bill.place || 'Tanang Site Zone'}</span>
                              </div>
                            </div>

                            {/* Transit Vehicle & Material Items Summary */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-slate-100">
                              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg font-mono text-slate-800 font-bold text-[10px]">
                                <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{bill.vehicle || 'Direct Mixer'}</span>
                              </span>
                              <div className="font-medium text-slate-700 text-[11px] truncate flex-1 min-w-[140px]">
                                {bill.items.map((it) => `${it.material} (${it.qty} ${it.unit})`).join(', ')}
                              </div>
                            </div>

                            {/* Mobile Financial Breakdown: Total / Paid / Due */}
                            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Bill</span>
                                <span className="font-mono font-black text-slate-900 text-xs">
                                  ₹ {Number(bill.finalAmount).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider block">Paid</span>
                                <span className="font-mono font-black text-emerald-700 text-xs">
                                  ₹ {Number(bill.paidAmount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-amber-800 font-bold uppercase tracking-wider block">Balance Due</span>
                                <span className={`font-mono font-black text-xs ${hasBalance ? 'text-amber-800' : 'text-emerald-600'}`}>
                                  {hasBalance ? `₹ ${Number(bill.balanceAmount).toLocaleString('en-IN')}` : '₹ 0'}
                                </span>
                              </div>
                            </div>

                            {/* Card Bottom: Clean Actions Bar & 1-Tap Payment Button */}
                            <div className="pt-1 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(bill)}
                                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 ${
                                  hasBalance
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                                }`}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>{hasBalance ? `Collect (Due ₹${Number(bill.balanceAmount).toLocaleString('en-IN')})` : 'Payment History'}</span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPrintingBill(bill)}
                                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                                  title="Print Cash Memo"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRequestEditBill(bill)}
                                  className={`p-2 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                    timing.isWithin10Mins
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                  }`}
                                  title={timing.isWithin10Mins ? 'Direct Edit' : 'Owner OTP Edit'}
                                >
                                  {timing.isWithin10Mins ? <Edit3 className="w-4 h-4" /> : <Lock className="w-4 h-4 text-rose-600" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteBill(bill.id, bill.billNo)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer active:scale-95"
                                  title="Delete Memo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        No cash memos match your search.
                      </div>
                    )}
                  </div>
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
          {(() => {
            const filteredPurchases = purchases.filter((p) => {
              const q = searchQuery.toLowerCase();
              return (
                p.voucherNo.toLowerCase().includes(q) ||
                p.supplierName.toLowerCase().includes(q) ||
                p.material.toLowerCase().includes(q) ||
                (p.vehicleNo || '').toLowerCase().includes(q)
              );
            });

            const purchaseElement = (
              <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${isTableFullScreen ? 'fixed inset-0 z-[999999] w-screen h-screen bg-white rounded-none p-0 m-0 border-none overflow-auto flex flex-col' : ''}`}>
                <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-cyan-600 shrink-0" />
                    <h3 className="font-bold text-slate-900 text-sm">Plant Material Purchases Register</h3>
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

                {/* DESKTOP TABLE VIEW (Visible on >= md screens) */}
                <div className="hidden md:block w-full overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-200/90 select-none">
                        <th className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">Voucher No & Date</th>
                        <th className="py-2.5 px-2 sm:px-2.5">Supplier & Plant Location</th>
                        <th className="py-2.5 px-2 sm:px-2.5">Inward Material & Qty</th>
                        <th className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">Truck & Slip No</th>
                        <th className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">Voucher Total</th>
                        <th className="py-2.5 px-2 sm:px-2.5 text-center whitespace-nowrap">Policy Status</th>
                        <th className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {filteredPurchases.length > 0 ? (
                        filteredPurchases.map((purchase) => {
                          const timing = getTimingStatus(purchase.createdAt);
                          return (
                            <tr key={purchase.id} className="hover:bg-cyan-50/40 transition-colors group">
                              <td className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">
                                <div className="font-mono font-black text-slate-900 text-xs flex items-center gap-1">
                                  <Truck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                  <span>#{purchase.voucherNo}</span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{purchase.date || 'Today'}</div>
                              </td>

                              <td className="py-2.5 px-2 sm:px-2.5 min-w-0">
                                <div className="font-bold text-slate-900 text-xs leading-snug truncate max-w-[130px] lg:max-w-[180px]">{purchase.supplierName}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[130px] lg:max-w-[180px]">
                                  <Building2 className="w-3 h-3 text-cyan-600 shrink-0" />
                                  <span className="truncate">{purchase.plantLocation || 'Main Plant Silo'}</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-2 sm:px-2.5">
                                <div className="font-bold text-cyan-900 text-xs truncate max-w-[140px] lg:max-w-[180px]">{purchase.material}</div>
                                <div className="text-[10px] text-slate-600 font-mono truncate">
                                  {purchase.qty} {purchase.unit} @ ₹{purchase.rate}/{purchase.unit}
                                </div>
                              </td>

                              <td className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap">
                                <div className="font-mono text-xs font-bold text-slate-800 truncate">
                                  {purchase.vehicleNo || 'Inward Truck'}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Slip #{purchase.weighbridgeSlipNo || 'WB-01'}</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">
                                <div className="font-mono font-black text-cyan-900 text-xs">
                                  ₹ {Number(purchase.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono font-semibold truncate">{purchase.paymentStatus}</div>
                              </td>

                              <td className="py-2.5 px-2 sm:px-2.5 text-center whitespace-nowrap">
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

                              <td className="py-2.5 px-2 sm:px-2.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleRequestEditPurchase(purchase)}
                                    className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                                      timing.isWithin10Mins
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                    }`}
                                    title={timing.isWithin10Mins ? 'Direct Edit' : 'Owner OTP Edit'}
                                  >
                                    {timing.isWithin10Mins ? <Edit3 className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeletePurchase(purchase.id, purchase.voucherNo)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer active:scale-95 shrink-0"
                                    title="Delete Voucher"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No material purchase vouchers found matching search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE RESPONSIVE CARDS (< md screens) */}
                <div className="block md:hidden p-2.5 sm:p-3 space-y-2.5 bg-slate-50/50">
                  {filteredPurchases.length > 0 ? (
                    filteredPurchases.map((purchase) => {
                      const timing = getTimingStatus(purchase.createdAt);
                      return (
                        <div
                          key={purchase.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 transition-all"
                        >
                          {/* Card Top: Voucher No & Policy Status */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                              <span className="font-mono font-black text-slate-900 text-xs truncate">
                                #{purchase.voucherNo}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                • {purchase.date || 'Today'}
                              </span>
                            </div>

                            <div className="shrink-0">
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
                            </div>
                          </div>

                          {/* Supplier & Plant Location */}
                          <div>
                            <div className="font-black text-slate-900 text-xs leading-snug">
                              {purchase.supplierName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-cyan-600 shrink-0" />
                              <span className="truncate">{purchase.plantLocation || 'Main Plant Silo'}</span>
                            </div>
                          </div>

                          {/* Material Description & Vehicle */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] pt-1 border-t border-slate-100">
                            <div>
                              <span className="font-bold text-cyan-950 block">{purchase.material}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {purchase.qty} {purchase.unit} @ ₹{purchase.rate}/{purchase.unit}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg font-mono text-slate-800 font-bold text-[10px]">
                              <span>{purchase.vehicleNo || 'Inward Truck'}</span>
                            </span>
                          </div>

                          {/* Card Bottom: Total & Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Voucher Total:</span>
                              <span className="font-mono font-black text-cyan-900 text-sm">
                                ₹ {Number(purchase.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRequestEditPurchase(purchase)}
                                className={`p-2 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                  timing.isWithin10Mins
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                }`}
                                title={timing.isWithin10Mins ? 'Direct Edit' : 'Owner OTP Edit'}
                              >
                                {timing.isWithin10Mins ? <Edit3 className="w-4 h-4" /> : <Lock className="w-4 h-4 text-rose-600" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePurchase(purchase.id, purchase.voucherNo)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer active:scale-95"
                                title="Delete Voucher"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                      No material purchase vouchers match your search.
                    </div>
                  )}
                </div>
              </div>
            );

            return isTableFullScreen ? createPortal(purchaseElement, document.body) : purchaseElement;
          })()}
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
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
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
      {otpModalOpen && targetItemForOtp && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] app-modal-backdrop flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-pop-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
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
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL: CREATE / EDIT CASH MEMO BILL FORM (REDESIGNED)
          ======================================================== */}
      {showBillFormModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] app-modal-backdrop flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="bg-white rounded-3xl border border-[#D4E4F7] shadow-2xl max-w-4xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col my-auto overflow-hidden text-slate-900 text-xs">
            
            {/* Header: Executive Royal Navy with Amber Accent Bar */}
            <div className="bg-gradient-to-r from-[#0D2847] via-[#123B6D] to-[#1E528F] text-white p-3.5 sm:px-6 flex items-center justify-between border-b border-[#123B6D]/60 shrink-0 relative overflow-hidden">
              {/* Top Accent Gold Bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowBillFormModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                  <span>Back</span>
                </button>

                <div className="h-5 w-px bg-white/20 shrink-0 hidden sm:block" />

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
                    <ReceiptText className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2 truncate text-white">
                      <span className="truncate">{editingBill ? `Edit Cash Memo #${billForm.billNo}` : 'Generate Official Cash Memo'}</span>
                      <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                        Official Paper Format
                      </span>
                    </h3>
                    <p className="text-[11px] text-blue-200/90 truncate flex items-center gap-1.5">
                      <span className="font-semibold text-white">SM CONCRETECH</span>
                      <span>•</span>
                      <span>Authorized Pre-printed Cash Voucher</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline font-mono text-amber-300">GST / Delivery Reconciled</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBillFormModal(false)}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bill Form Content */}
            <form onSubmit={handleSaveBill} noValidate className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              
              {/* Section 1: Memo Metadata & Dispatch Info */}
              <div className="bg-white rounded-2xl border border-[#D4E4F7] p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1D5FA7] border border-blue-200/60 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">Document & Dispatch Details</span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Bill No <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={billForm.billNo}
                        onChange={(e) => setBillForm({ ...billForm, billNo: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 font-mono font-bold text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Bill Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={billForm.date}
                        onChange={(e) => setBillForm({ ...billForm, date: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 font-bold text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">
                      Construction Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
                      <input
                        type="text"
                        value={billForm.constructionDate}
                        onChange={(e) => setBillForm({ ...billForm, constructionDate: e.target.value })}
                        placeholder="e.g. 19 Oct 2026"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-amber-50/40 border border-amber-300 font-bold text-slate-900 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Transit Vehicle
                    </label>
                    <div className="relative">
                      <Truck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={billForm.vehicle}
                        onChange={(e) => setBillForm({ ...billForm, vehicle: e.target.value })}
                        placeholder="e.g. MH-10-CR-1212"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 font-mono uppercase text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Place of Delivery <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={billForm.place}
                        onChange={(e) => setBillForm({ ...billForm, place: e.target.value })}
                        placeholder="e.g. Aaudumbar"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 font-medium text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Bill To Party Information (With Strict 10-Digit Mobile Validity) */}
              <div className="bg-white rounded-2xl border border-[#D4E4F7] p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">Bill To Party & Client Dossier</span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md">Step 2 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Party / Client Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBillForm((prev) => ({ ...prev, customerName: 'Cash Customer' }));
                            setBillFormErrors((prev) => ({ ...prev, customerName: null }));
                          }}
                          className="text-[10px] font-bold text-[#1D5FA7] hover:text-white bg-blue-50 hover:bg-[#1D5FA7] px-2 py-0.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          + Cash Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBillForm((prev) => ({ ...prev, customerName: 'Walk-in Client' }));
                            setBillFormErrors((prev) => ({ ...prev, customerName: null }));
                          }}
                          className="text-[10px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          + Walk-in
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={customerNameInputRef}
                        type="text"
                        value={billForm.customerName}
                        onChange={(e) => {
                          setBillForm({ ...billForm, customerName: e.target.value });
                          if (billFormErrors.customerName) {
                            setBillFormErrors((prev) => ({ ...prev, customerName: null }));
                          }
                        }}
                        placeholder="e.g. Patil Infrastructure (or leave blank for Cash Customer)"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                    {billFormErrors.customerName && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{billFormErrors.customerName}</span>
                      </p>
                    )}
                  </div>

                  {/* 10-Digit Mobile Number Validation Component */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>Mobile Number</span>
                        <span className="text-[10px] text-slate-600 font-normal">(10-Digit Cellular)</span>
                      </label>
                      {billForm.customerMobile && (
                        <div className="flex items-center gap-1">
                          {billForm.customerMobile.length === 10 && /^[6-9]/.test(billForm.customerMobile) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Valid 10 Digits</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              !/^[6-9]/.test(billForm.customerMobile) && billForm.customerMobile.length > 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span>{billForm.customerMobile.length}/10 digits</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative flex rounded-xl shadow-2xs overflow-hidden">
                      <div className="bg-slate-100 border border-r-0 border-slate-300 px-2.5 py-2 flex items-center gap-1.5 shrink-0 text-slate-700 font-mono font-bold text-xs select-none">
                        <span className="text-xs">🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="tel"
                          maxLength={10}
                          inputMode="numeric"
                          value={billForm.customerMobile}
                          onChange={handleMobileChange}
                          placeholder="e.g. 9822154321"
                          className={`w-full pl-3 pr-9 py-2 rounded-r-xl bg-slate-50/70 border font-mono font-bold text-xs text-slate-900 focus:bg-white transition-all ${
                            billForm.customerMobile?.length === 10 && /^[6-9]/.test(billForm.customerMobile)
                              ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                              : billMobileError && billForm.customerMobile
                              ? 'border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20'
                              : 'border-slate-300 focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15'
                          }`}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {billForm.customerMobile?.length === 10 && /^[6-9]/.test(billForm.customerMobile) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : billForm.customerMobile?.length > 0 ? (
                            <Phone className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Real-time Helper & Error Feedback */}
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      {billMobileError ? (
                        <span className="text-amber-700 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{billMobileError}</span>
                        </span>
                      ) : billForm.customerMobile?.length === 10 && /^[6-9]/.test(billForm.customerMobile) ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Valid 10-digit Indian mobile verified</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">Enter standard 10 digits starting with 6, 7, 8, or 9</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Site Location</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={billForm.site}
                        onChange={(e) => setBillForm({ ...billForm, site: e.target.value })}
                        placeholder="e.g. Aaudumbar Riverside Pier"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Reference Name</label>
                    <div className="relative">
                      <UserCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={billForm.refName}
                        onChange={(e) => setBillForm({ ...billForm, refName: e.target.value })}
                        placeholder="e.g. D. K. Patil"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Materials & Dispatch Items */}
              <div className="bg-white rounded-2xl border border-[#D4E4F7] p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1D5FA7] border border-blue-200/60 flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Materials & Concrete Dispatch Items</span>
                      <span className="text-[10px] text-slate-600 block">Step 3 of 3 • Dynamic line-item billing calculator</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-[#D4E4F7] rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                    <thead className="bg-[#F5F9FF] font-mono font-bold text-[#123B6D] border-b border-[#D4E4F7] text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">SN.</th>
                        <th className="py-2.5 px-3">Material Description / Concrete Grade</th>
                        <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                        <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                        <th className="py-2.5 px-3 w-32 text-right">Total Amount (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4E4F7]">
                      {billForm.items.map((item, idx) => (
                        <tr key={idx} className="bg-white hover:bg-[#F5F9FF]/50 transition-colors">
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[11px]">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.material}
                              onChange={(e) => handleItemChange(idx, 'material', e.target.value)}
                              placeholder="e.g. M25 Concrete or Concrete Pump"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7]/20 text-xs transition-all"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 border border-slate-300 text-center font-mono font-bold text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7]/20 text-xs transition-all"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              placeholder="m³"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 border border-slate-300 text-center font-semibold text-slate-700 focus:bg-white focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7]/20 text-xs transition-all"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 border border-slate-300 text-right font-mono font-bold text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-1 focus:ring-[#1D5FA7]/20 text-xs transition-all"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-950 text-xs">
                            ₹ {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {billForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-black" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Transportation & Computed Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-5 bg-white rounded-2xl border border-[#D4E4F7] p-4 shadow-2xs space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Transportation / Freight Charges</span>
                    <span className="text-[10px] text-slate-600 font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-600 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      value={billForm.transportation}
                      onChange={(e) => setBillForm({ ...billForm, transportation: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-300 font-mono font-bold text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Calculates directly into final memo amount & printable paper breakdown.
                  </p>
                </div>

                <div className="sm:col-span-7 bg-gradient-to-br from-[#F5F9FF] to-[#EAF3FF] rounded-2xl border border-[#D4E4F7] p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Items Subtotal:</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹ {billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {Number(billForm.transportation) > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Transportation:</span>
                        <span className="font-mono font-bold text-slate-900">
                          + ₹ {Number(billForm.transportation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="h-px bg-[#D4E4F7] my-2" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-700">Computed Final Amount:</span>
                      <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                        ₹ {(
                          billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) +
                          (Number(billForm.transportation) || 0)
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#D4E4F7]/60 flex items-start gap-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded shrink-0 border border-amber-200">
                      In Words
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 italic line-clamp-2">
                      {numberToIndianWords(
                        billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) +
                        (Number(billForm.transportation) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Payment Collection & Advance (Optional) */}
              {!editingBill && (
                <div className="bg-white rounded-2xl border border-[#D4E4F7] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Payment Collection & Advance (On Site)</span>
                        <span className="text-[10px] text-slate-500 block">Track initial cash or online payment received from customer</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Optional
                    </span>
                  </div>

                  {/* 3 Payment Options: Unpaid / Advance / Full */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillForm({ ...billForm, initialPaymentOption: 'unpaid', initialPaymentAmount: 0 })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        billForm.initialPaymentOption === 'unpaid'
                          ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold ring-2 ring-blue-500/15'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        billForm.initialPaymentOption === 'unpaid' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {billForm.initialPaymentOption === 'unpaid' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">Unpaid / Full Credit</div>
                        <div className="text-[10px] text-slate-500">₹0 paid • Entire bill pending</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const compTotal = billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) + (Number(billForm.transportation) || 0);
                        setBillForm({ 
                          ...billForm, 
                          initialPaymentOption: 'partial', 
                          initialPaymentAmount: billForm.initialPaymentAmount || Math.round(compTotal / 2) 
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        billForm.initialPaymentOption === 'partial'
                          ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-bold ring-2 ring-amber-500/15'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        billForm.initialPaymentOption === 'partial' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                      }`}>
                        {billForm.initialPaymentOption === 'partial' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950">Partial Advance Paid</div>
                        <div className="text-[10px] text-amber-800">e.g. ₹25,000 cash on site</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const compTotal = billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) + (Number(billForm.transportation) || 0);
                        setBillForm({ ...billForm, initialPaymentOption: 'full', initialPaymentAmount: compTotal });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        billForm.initialPaymentOption === 'full'
                          ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold ring-2 ring-emerald-500/15'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        billForm.initialPaymentOption === 'full' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                      }`}>
                        {billForm.initialPaymentOption === 'full' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950">Paid in Full</div>
                        <div className="text-[10px] text-emerald-700">100% Settled Upfront</div>
                      </div>
                    </button>
                  </div>

                  {/* Advance Amount & Mode Fields (Shown when partial or full is chosen) */}
                  {billForm.initialPaymentOption !== 'unpaid' && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Amount */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Amount Received Now (₹) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-600 text-xs">₹</span>
                            <input
                              type="number"
                              value={billForm.initialPaymentAmount}
                              onChange={(e) => setBillForm({ ...billForm, initialPaymentAmount: Number(e.target.value) })}
                              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 focus:bg-white focus:border-[#1D5FA7] focus:ring-2 focus:ring-[#1D5FA7]/15 transition-all text-xs"
                              placeholder="e.g. 25000"
                              disabled={billForm.initialPaymentOption === 'full'}
                            />
                          </div>
                        </div>

                        {/* Mode Selector */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Payment Mode
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {['Cash', 'Online UPI', 'Bank Transfer', 'Cheque'].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setBillForm({ ...billForm, initialPaymentMode: mode })}
                                className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                  billForm.initialPaymentMode === mode
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {mode === 'Cash' ? '💵 Cash' : mode === 'Online UPI' ? '📱 UPI' : mode === 'Bank Transfer' ? '🏦 Bank' : '📑 Cheque'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Reference No & Remarks */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Receipt / UTR / Reference No <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={billForm.initialPaymentRef}
                            onChange={(e) => setBillForm({ ...billForm, initialPaymentRef: e.target.value })}
                            placeholder={billForm.initialPaymentMode === 'Cash' ? 'e.g. Cash Receipt #101' : 'e.g. UPI Ref / UTR / Cheque #'}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:bg-white focus:border-[#1D5FA7] transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={billForm.initialPaymentRemarks}
                            onChange={(e) => setBillForm({ ...billForm, initialPaymentRemarks: e.target.value })}
                            placeholder="e.g. Paid in cash on site to mixer driver"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:border-[#1D5FA7] transition-all"
                          />
                        </div>
                      </div>

                      {/* Live Math Calculation Summary */}
                      {(() => {
                        const compTotal = billForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0) + (Number(billForm.transportation) || 0);
                        const paidNow = Number(billForm.initialPaymentAmount) || 0;
                        const balDue = Math.max(0, compTotal - paidNow);
                        return (
                          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs">
                            <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Bill Total: ₹{compTotal.toLocaleString('en-IN')} • Paying: ₹{paidNow.toLocaleString('en-IN')} ({billForm.initialPaymentMode})</span>
                            </span>
                            <span className="font-mono font-black text-amber-900">
                              Balance Due: ₹{balDue.toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Sticky Submit Bar */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-200 bg-white -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 shrink-0 rounded-b-3xl">
                {/* Form Errors Banner */}
                {(billFormErrors.customerName || billFormErrors.customerMobile || billFormErrors.items || billFormErrors.general) && (
                  <div className="w-full p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="font-semibold">
                      {billFormErrors.customerName || billFormErrors.customerMobile || billFormErrors.items || billFormErrors.general}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBillFormModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel / Close</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveBill}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#123B6D] to-[#1D5FA7] hover:from-[#0F2D54] hover:to-[#123B6D] shadow-md shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ReceiptText className="w-4 h-4 text-amber-300" />
                    <span>{editingBill ? 'Save & Update Cash Memo' : 'Generate Official Cash Memo'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL: CREATE / EDIT PLANT MATERIAL PURCHASE FORM
          ======================================================== */}
      {showPurchaseFormModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] app-modal-backdrop flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
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
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL: PAYMENT COLLECTION & TRANSACTION HISTORY
          ======================================================== */}
      {paymentModalBill && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] app-modal-backdrop flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col my-auto overflow-hidden text-slate-900 text-xs">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-3.5 sm:px-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setPaymentModalBill(null)}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2 truncate">
                    <span>Cash Memo #{paymentModalBill.billNo}</span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/10 text-slate-200">
                      Payment Register
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    Party: <span className="font-bold text-white">{paymentModalBill.customerName}</span> • Site: {paymentModalBill.site || paymentModalBill.place || 'Tanang'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPaymentModalBill(null)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              
              {/* 3 High-Impact Financial Overview Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Memo Total</span>
                  <div className="font-mono font-black text-slate-900 text-sm sm:text-base mt-0.5">
                    ₹ {Number(paymentModalBill.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-3 shadow-2xs">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Total Paid</span>
                  <div className="font-mono font-black text-emerald-700 text-sm sm:text-base mt-0.5">
                    ₹ {Number(paymentModalBill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-emerald-800 font-medium truncate mt-0.5">
                    💵 ₹{Number(paymentModalBill.cashPaidAmount || 0).toLocaleString('en-IN')} Cash • 📱 ₹{Number(paymentModalBill.onlinePaidAmount || 0).toLocaleString('en-IN')} Online
                  </div>
                </div>

                <div className={`rounded-2xl border p-3 shadow-2xs ${
                  Number(paymentModalBill.balanceAmount || 0) > 0 
                    ? 'bg-amber-50/60 border-amber-300 text-amber-950' 
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    {Number(paymentModalBill.balanceAmount || 0) > 0 ? 'Balance Due' : 'Status'}
                  </span>
                  <div className="font-mono font-black text-sm sm:text-base mt-0.5">
                    {Number(paymentModalBill.balanceAmount || 0) > 0 
                      ? `₹ ${Number(paymentModalBill.balanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                      : 'PAID IN FULL ✓'}
                  </div>
                </div>
              </div>

              {/* Record Payment Form (If balance is due or additional payment needed) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Banknote className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">Record New Payment Entry</span>
                  </div>
                  {Number(paymentModalBill.balanceAmount || 0) > 0 ? (
                    <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      Balance Due: ₹{Number(paymentModalBill.balanceAmount).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Settled
                    </span>
                  )}
                </div>

                {paymentError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <form onSubmit={handleRecordPayment} className="space-y-3">
                  {/* Quick Shortcut Buttons for Fast Entry */}
                  {Number(paymentModalBill.balanceAmount || 0) > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-medium">Quick Amount:</span>
                      <button
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: paymentModalBill.balanceAmount })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold border border-emerald-300 transition-colors cursor-pointer text-[10px]"
                      >
                        Full Balance (₹{Number(paymentModalBill.balanceAmount).toLocaleString('en-IN')})
                      </button>
                      {paymentModalBill.balanceAmount > 10000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, amount: 10000 })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 transition-colors cursor-pointer text-[10px]"
                        >
                          ₹10,000
                        </button>
                      )}
                      {paymentModalBill.balanceAmount > 25000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, amount: 25000 })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 transition-colors cursor-pointer text-[10px]"
                        >
                          ₹25,000
                        </button>
                      )}
                      {paymentModalBill.balanceAmount > 5000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, amount: 5000 })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 transition-colors cursor-pointer text-[10px]"
                        >
                          ₹5,000
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Amount Input */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Amount Received (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-600 text-xs">₹</span>
                        <input
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          placeholder="e.g. 25000"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 transition-all text-xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Payment Mode Pills */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Payment Mode <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {['Cash', 'Online UPI', 'Bank Transfer', 'Cheque'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentForm({ ...paymentForm, mode })}
                            className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              paymentForm.mode === mode
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {mode === 'Cash' ? '💵 Cash' : mode === 'Online UPI' ? '📱 UPI' : mode === 'Bank Transfer' ? '🏦 Bank' : '📑 Cheque'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Reference / UTR No */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Receipt / UTR / Cheque #
                      </label>
                      <input
                        type="text"
                        value={paymentForm.referenceNo}
                        onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                        placeholder={paymentForm.mode === 'Cash' ? 'e.g. Cash Receipt #101' : 'e.g. 12-digit UPI Ref / UTR'}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white focus:border-emerald-600 transition-all"
                      />
                    </div>

                    {/* Received By */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Received By
                      </label>
                      <input
                        type="text"
                        value={paymentForm.receivedBy}
                        onChange={(e) => setPaymentForm({ ...paymentForm, receivedBy: e.target.value })}
                        placeholder="e.g. Sunil More / Ramesh"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 transition-all"
                      />
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Remarks / Note
                      </label>
                      <input
                        type="text"
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                        placeholder="e.g. Advance paid at site"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record Payment ({paymentForm.mode} ₹{Number(paymentForm.amount || 0).toLocaleString('en-IN')})</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Payment History & Timeline */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                      <History className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      Payment History & Transaction Log ({paymentModalBill.payments?.length || 0})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    All Cash & Online Records Maintained
                  </span>
                </div>

                {paymentModalBill.payments && paymentModalBill.payments.length > 0 ? (
                  <div className="space-y-2">
                    {paymentModalBill.payments.map((p, pIdx) => {
                      const isCash = (p.mode || '').toLowerCase().includes('cash');
                      return (
                        <div
                          key={p.id || pIdx}
                          className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isCash ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isCash ? <Banknote className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-slate-900 text-sm">
                                  ₹ {Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  isCash 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                    : 'bg-blue-50 text-blue-800 border-blue-300'
                                }`}>
                                  {p.mode || 'Cash'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span>{p.date} • {p.time}</span>
                                {p.referenceNo && <span>• Ref: <strong className="font-mono text-slate-700">{p.referenceNo}</strong></span>}
                                {p.receivedBy && <span>• Recvd by: {p.receivedBy}</span>}
                                {p.remarks && <span>• "{p.remarks}"</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              title="Revert / Void this payment entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <CreditCard className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    <p className="font-medium text-xs">No payment records logged yet for this memo.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the form above to record cash or online transactions.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:px-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPaymentModalBill(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrintingBill(paymentModalBill);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Updated Memo</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
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

      {/* ========================================================
          CUSTOMER STATEMENT OF ACCOUNT (LEDGER MODAL)
          ======================================================== */}
      {customerStatementModal && (
        <CustomerStatementModal
          customerName={customerStatementModal}
          allBills={bills}
          uniqueCustomers={uniqueCustomers}
          onSelectCustomer={(cust) => {
            setSelectedCustomer(cust);
            setCustomerStatementModal(cust);
          }}
          onClose={() => setCustomerStatementModal(null)}
        />
      )}

    </div>
  );
}
