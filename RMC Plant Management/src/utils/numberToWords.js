/**
 * Converts numbers to Indian numbering system words (e.g. 6000 -> Six Thousand Rupees ONLY)
 */
export function numberToIndianWords(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Zero Rupees ONLY';
  
  const num = Math.floor(Number(amount));
  if (num === 0) return 'Zero Rupees ONLY';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertSection(n) {
    if (n === 0) return '';
    if (n < 20) return singleDigits[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + singleDigits[n % 10] : '');
    return singleDigits[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertSection(n % 100) : '');
  }

  let words = '';
  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  let hundred = remainder;

  if (crore > 0) {
    words += convertSection(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertSection(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertSection(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertSection(hundred) + ' ';
  }

  return words.trim() + ' Rupees ONLY';
}
