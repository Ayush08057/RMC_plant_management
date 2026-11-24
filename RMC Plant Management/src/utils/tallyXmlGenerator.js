/**
 * Tally Prime & Tally ERP 9 Standard XML Voucher Generator
 * Conforms to standard Tally XML envelope structure for 1-click import via:
 * Tally Prime -> Import (Alt + O) -> Transactions -> XML File
 */

function formatTallyDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
  try {
    // If format like DD/MM/YYYY or DD-MM-YYYY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
      } else {
        // DD-MM-YYYY
        return `${parts[2]}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }
  } catch {
    // fallback
  }
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates Tally XML for Sales Invoices & Cash Memos
 */
export function generateSalesTallyXml(bills = [], companyName = 'SHIVKRUPA READY MIX CONCRETE PLANT') {
  const vouchersXml = bills.map((bill) => {
    const vchDate = formatTallyDate(bill.date);
    const billNo = escapeXml(bill.billNo || bill.invoiceNo || 'INV-001');
    const customer = escapeXml(bill.customerName || 'Cash Customer');
    const total = parseFloat(bill.total || bill.netTotal || 0) || 0;
    const cgst = parseFloat(bill.cgst || 0) || 0;
    const sgst = parseFloat(bill.sgst || 0) || 0;
    const igst = parseFloat(bill.igst || 0) || 0;
    const totalGst = cgst + sgst + igst;
    const taxable = total - totalGst > 0 ? total - totalGst : total;
    const narration = escapeXml(`RMC Concrete supply for ${bill.place || 'Site'}. Challan: ${bill.challanNo || '-'}`);

    return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${vchDate}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${billNo}</VOUCHERNUMBER>
        <REFERENCE>${billNo}</REFERENCE>
        <PARTYLEDGERNAME>${customer}</PARTYLEDGERNAME>
        <NARRATION>${narration}</NARRATION>
        <ISINVOICE>Yes</ISINVOICE>
        
        <!-- Customer Account (Debit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${customer}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${total.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- RMC Concrete Sales Ledger (Credit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>RMC Concrete Sales</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${taxable.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        ${cgst > 0 ? `
        <!-- Output CGST -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${cgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>` : ''}

        ${sgst > 0 ? `
        <!-- Output SGST -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${sgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>` : ''}

        ${igst > 0 ? `
        <!-- Output IGST -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output IGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${igst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>` : ''}
      </VOUCHER>
    </TALLYMESSAGE>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates Tally XML for Customer Payment Receipts
 */
export function generateReceiptsTallyXml(bills = [], companyName = 'SHIVKRUPA READY MIX CONCRETE PLANT') {
  const allReceipts = [];

  bills.forEach((bill) => {
    if (Array.isArray(bill.paymentHistory) && bill.paymentHistory.length > 0) {
      bill.paymentHistory.forEach((pmt, idx) => {
        allReceipts.push({
          receiptNo: pmt.receiptNo || `RCP-${bill.billNo || '001'}-${idx + 1}`,
          date: pmt.date || bill.date,
          customer: bill.customerName || 'Customer',
          amount: parseFloat(pmt.amount || 0) || 0,
          mode: pmt.mode || 'Cash',
          refNo: pmt.referenceNo || pmt.refNo || '-',
          billNo: bill.billNo || bill.invoiceNo
        });
      });
    } else if (parseFloat(bill.paidAmount || 0) > 0) {
      allReceipts.push({
        receiptNo: `RCP-${bill.billNo || '001'}`,
        date: bill.date,
        customer: bill.customerName || 'Customer',
        amount: parseFloat(bill.paidAmount),
        mode: 'Cash',
        refNo: 'Full/Advance Receipt',
        billNo: bill.billNo || bill.invoiceNo
      });
    }
  });

  const vouchersXml = allReceipts.map((rcp) => {
    const vchDate = formatTallyDate(rcp.date);
    const rcpNo = escapeXml(rcp.receiptNo);
    const customer = escapeXml(rcp.customer);
    const bankOrCashLedger = rcp.mode.toLowerCase().includes('cash') ? 'Cash in Hand' : 'HDFC Bank Ltd';
    const narration = escapeXml(`Payment received against Bill ${rcp.billNo}. Mode: ${rcp.mode}. Ref: ${rcp.refNo}`);

    return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Receipt" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${vchDate}</DATE>
        <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${rcpNo}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${customer}</PARTYLEDGERNAME>
        <NARRATION>${narration}</NARRATION>
        
        <!-- Cash or Bank Debit -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${bankOrCashLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${rcp.amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Customer Credit -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${customer}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${rcp.amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates Tally XML for Raw Material Purchases (Cement, Aggregate, Sand, Diesel)
 */
export function generatePurchasesTallyXml(purchases = [], companyName = 'SHIVKRUPA READY MIX CONCRETE PLANT') {
  const vouchersXml = purchases.map((p) => {
    const vchDate = formatTallyDate(p.date);
    const vchNo = escapeXml(p.voucherNo || p.billNo || 'PUR-001');
    const supplier = escapeXml(p.supplierName || 'Material Vendor');
    const total = parseFloat(p.netTotal || p.total || p.amount || 0) || 0;
    const materialLedger = escapeXml(p.material || 'Raw Material Purchases');
    const narration = escapeXml(`Material purchased: ${p.material || 'Raw Material'}. Qty: ${p.qty || '-'} ${p.unit || ''}`);

    return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${vchDate}</DATE>
        <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${vchNo}</VOUCHERNUMBER>
        <REFERENCE>${vchNo}</REFERENCE>
        <PARTYLEDGERNAME>${supplier}</PARTYLEDGERNAME>
        <NARRATION>${narration}</NARRATION>
        
        <!-- Material Purchase Ledger (Debit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${materialLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${total.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Supplier Account (Credit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${supplier}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${total.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Triggers instant browser XML file download
 */
export function downloadXmlFile(xmlContent, fileName) {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
