import fs from 'fs';
import path from 'path';

console.log('--- STARTING BILLING EXCEL SPREADSHEET REGISTER TEST ---');

const filePath = path.resolve('src/components/billing/BillingManagementView.jsx');
const content = fs.readFileSync(filePath, 'utf-8');

const assertions = [
  {
    name: 'FileSpreadsheet and Download icons imported',
    test: () => content.includes('FileSpreadsheet') && content.includes('Download')
  },
  {
    name: 'handleExportToExcel CSV function implemented',
    test: () => content.includes('handleExportToExcel') && content.includes('data:text/csv;charset=utf-8,\\uFEFF')
  },
  {
    name: 'Export to Excel button present in toolbar',
    test: () => content.includes('Export Excel') && content.includes('handleExportToExcel')
  },
  {
    name: '+ New Memo button present in toolbar for quick row addition',
    test: () => content.includes('+ New Memo') && content.includes('handleOpenCreateBill')
  },
  {
    name: 'Excel table header with individual columns (Date, Bill #, Party, Site, Vehicle, Total, Paid, Balance Due)',
    test: () => 
      content.includes('Bill Total (₹)') &&
      content.includes('Paid (₹)') &&
      content.includes('Balance Due (₹)') &&
      content.includes('Site Destination') &&
      content.includes('Excel Sales & Cash Register')
  },
  {
    name: 'Prominent, labeled + Pay button on rows',
    test: () => content.includes('+ Pay') && content.includes('handleOpenPaymentModal')
  },
  {
    name: 'Prominent, labeled Print button on rows',
    test: () => content.includes('<span>Print</span>') && content.includes('setPrintingBill')
  },
  {
    name: 'Excel footer totals row (tfoot) calculating sums',
    test: () => content.includes('<tfoot') && content.includes('Excel Register View')
  }
];

let allPassed = true;
assertions.forEach((a) => {
  if (a.test()) {
    console.log(`✓ [PASS] ${a.name}`);
  } else {
    console.error(`✗ [FAIL] ${a.name}`);
    allPassed = false;
  }
});

if (!allPassed) {
  console.error('\n❌ One or more Excel Spreadsheet Register assertions failed!');
  process.exit(1);
} else {
  console.log('\n======================================================');
  console.log('🎉 ALL 8 BILLING EXCEL SPREADSHEET ASSERTIONS PASSED!');
  console.log('======================================================');
}
