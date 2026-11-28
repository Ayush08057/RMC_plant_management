/**
 * Live Google Sheets / Online Excel Real-Time Sync Service
 * 
 * Automatically sends new incoming material entries & chemical intakes
 * to a live Google Sheet or Excel Online spreadsheet via webhook in real time.
 */

import { getLocalIstDateStr } from '../utils/shiftUtils.js';

export const LIVE_SHEET_CONFIG_KEY = 'rmc_live_sheet_webhook_config_v1';
export const LIVE_SHEET_QUEUE_KEY = 'rmc_live_sheet_pending_queue_v1';

function enqueuePendingSheetSync(payload) {
  try {
    const raw = localStorage.getItem(LIVE_SHEET_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(payload);
    // Keep safe ceiling
    if (queue.length > 200) queue.shift();
    localStorage.setItem(LIVE_SHEET_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[LiveSheetSync] Queue write failed:', e);
  }
}

export async function flushLiveSheetQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const config = getLiveSheetConfig();
  if (!config.enabled || !config.webhookUrl || !config.webhookUrl.trim()) return;

  try {
    const raw = localStorage.getItem(LIVE_SHEET_QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const remaining = [];
    for (const payload of queue) {
      try {
        await fetch(config.webhookUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        remaining.push(payload);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(LIVE_SHEET_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(LIVE_SHEET_QUEUE_KEY);
      config.lastSyncedAt = new Date().toISOString();
      saveLiveSheetConfig(config);
    }
  } catch (e) {
    console.warn('[LiveSheetSync] Queue flush failed:', e);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushLiveSheetQueue();
  });
}

// Default configuration with helper instructions
export function getLiveSheetConfig() {
  try {
    const raw = localStorage.getItem(LIVE_SHEET_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read live sheet config:', e);
  }
  return {
    enabled: true,
    webhookUrl: '',
    autoSyncInward: true,
    autoSyncChemicals: true,
    lastSyncedAt: null,
  };
}

export function saveLiveSheetConfig(config) {
  try {
    localStorage.setItem(LIVE_SHEET_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save live sheet config:', e);
  }
}

/**
 * Sends a material inward record to the live Google Sheet / Excel Online webhook
 */
export async function syncMaterialInwardToLiveSheet(entry) {
  if (!entry) return { success: false, reason: 'No entry provided' };
  const config = getLiveSheetConfig();
  if (!config.enabled || !config.webhookUrl || !config.webhookUrl.trim()) {
    return { success: false, reason: 'Live Sheet Webhook URL not configured' };
  }

  const payload = {
    eventType: 'MATERIAL_INWARD',
    timestamp: new Date().toISOString(),
    slipNo: entry.slipNo || entry.entryNo || '',
    date: entry.date || getLocalIstDateStr(),
    time: entry.time || new Date().toLocaleTimeString(),
    material: entry.material || '',
    supplier: entry.supplier || '',
    vehicleNo: entry.vehicleNo || '',
    grossWeight: Number(entry.grossWeight || 0),
    tareWeight: Number(entry.tareWeight || 0),
    netWeight: Number(entry.netTons || entry.netWeight || 0),
    unit: entry.unit || 'Tons',
    targetSilo: entry.targetSilo || entry.destination || '',
    challanNo: entry.challanNo || '',
    supplierInvoiceNo: entry.supplierInvoiceNo || '',
    moisturePct: entry.moisturePct || entry.moisturePercent || 0,
    recordedBy: entry.recordedBy || 'Plant Operator',
    remarks: entry.remarks || '',
    status: entry.status || 'Finalized'
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueuePendingSheetSync(payload);
    return { success: true, queued: true };
  }

  try {
    // Mode 'no-cors' is essential for Google Apps Script redirects across google domains
    await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    config.lastSyncedAt = new Date().toISOString();
    saveLiveSheetConfig(config);
    flushLiveSheetQueue();
    return { success: true };
  } catch (err) {
    enqueuePendingSheetSync(payload);
    console.warn('[LiveSheetSync] Queued for offline retry:', err);
    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Sends a chemical intake record to the live Google Sheet / Excel Online webhook
 */
export async function syncChemicalInwardToLiveSheet(chemEntry) {
  if (!chemEntry) return { success: false };
  const config = getLiveSheetConfig();
  if (!config.enabled || !config.webhookUrl || !config.webhookUrl.trim()) {
    return { success: false };
  }

  const payload = {
    eventType: 'CHEMICAL_INWARD',
    timestamp: new Date().toISOString(),
    slipNo: chemEntry.entryNo || chemEntry.id || '',
    date: chemEntry.date || '',
    time: chemEntry.time || '',
    material: chemEntry.chemicalName || '',
    supplier: chemEntry.supplier || '',
    vehicleNo: chemEntry.vehicleNo || 'Chemical Logistics',
    grossWeight: '-',
    tareWeight: '-',
    netWeight: Number(chemEntry.totalVolumeLiters || 0),
    unit: 'Liters',
    targetSilo: 'Chemical / Admixture Yard',
    challanNo: chemEntry.invoiceNo || '',
    supplierInvoiceNo: chemEntry.invoiceNo || '',
    moisturePct: '-',
    recordedBy: chemEntry.recordedBy || 'Plant Operator',
    remarks: chemEntry.remarks || `Barrels: ${chemEntry.fullBarrels || 0} x ${chemEntry.barrelCapacity || 0}L`,
    status: chemEntry.status || 'Approved'
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueuePendingSheetSync(payload);
    return { success: true, queued: true };
  }

  try {
    await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    config.lastSyncedAt = new Date().toISOString();
    saveLiveSheetConfig(config);
    flushLiveSheetQueue();
    return { success: true };
  } catch (err) {
    enqueuePendingSheetSync(payload);
    console.warn('[LiveSheetSync] Chemical queued for offline retry:', err);
    return { success: false, queued: true };
  }
}

/**
 * Standalone direct Excel (.CSV) download of all Inward Records for instant offline viewing
 */
export function downloadInwardMaterialsExcel(records = [], chemicalRecords = []) {
  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // UTF-8 BOM for proper Excel display

  // Section 1: Raw Materials (Aggregates, Sand, Cement, Fly Ash)
  csvContent += '--- INCOMING RAW MATERIALS REGISTER ---\n';
  csvContent += 'Slip No,Date,Time,Material,Supplier,Vehicle No,Gross Wt (Tons),Tare Wt (Tons),Net Wt (Tons),Target Silo / Bin,Challan No,Moisture %,Received By,Remarks,Status\n';

  (records || []).forEach((r) => {
    const slip = `"${r.slipNo || r.entryNo || ''}"`;
    const date = `"${r.date || ''}"`;
    const time = `"${r.time || ''}"`;
    const mat = `"${r.material || ''}"`;
    const sup = `"${r.supplier || ''}"`;
    const veh = `"${r.vehicleNo || ''}"`;
    const gross = r.grossWeight !== undefined && r.grossWeight !== '' ? Number(r.grossWeight).toFixed(2) : '0.00';
    const tare = r.tareWeight !== undefined && r.tareWeight !== '' ? Number(r.tareWeight).toFixed(2) : '0.00';
    const net = r.netTons !== undefined && r.netTons !== '' ? Number(r.netTons).toFixed(2) : '0.00';
    const silo = `"${r.targetSilo || r.destination || ''}"`;
    const ch = `"${r.challanNo || ''}"`;
    const moist = r.moisturePct || r.moisturePercent || '0';
    const by = `"${r.recordedBy || ''}"`;
    const rem = `"${(r.remarks || '').replace(/"/g, '""')}"`;
    const st = `"${r.status || 'Finalized'}"`;

    csvContent += `${slip},${date},${time},${mat},${sup},${veh},${gross},${tare},${net},${silo},${ch},${moist},${by},${rem},${st}\n`;
  });

  // Section 2: Chemical / Admixture Barrels
  if (chemicalRecords && chemicalRecords.length > 0) {
    csvContent += '\n--- INCOMING CHEMICAL & ADMIXTURE INTAKE ---\n';
    csvContent += 'Entry No,Date,Time,Chemical / Admixture,Supplier,Full Barrels,Capacity (L),Total Litres,Invoice No,Recorded By,Remarks,Status\n';
    chemicalRecords.forEach((c) => {
      const entryNo = `"${c.entryNo || ''}"`;
      const date = `"${c.date || ''}"`;
      const time = `"${c.time || ''}"`;
      const name = `"${c.chemicalName || ''}"`;
      const sup = `"${c.supplier || ''}"`;
      const barrels = c.fullBarrels || 0;
      const cap = c.barrelCapacity || 0;
      const vol = c.totalVolumeLiters || 0;
      const inv = `"${c.invoiceNo || ''}"`;
      const by = `"${c.recordedBy || ''}"`;
      const rem = `"${(c.remarks || '').replace(/"/g, '""')}"`;
      const st = `"${c.status || 'Received'}"`;
      csvContent += `${entryNo},${date},${time},${name},${sup},${barrels},${cap},${vol},${inv},${by},${rem},${st}\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SM_Concretech_Inward_Materials_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Standard Google Apps Script source code template for easy 1-click copy by users
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Auto-create bold headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Slip No", "Date", "Time", "Material", "Supplier", 
        "Vehicle No", "Gross Wt (Tons)", "Tare Wt (Tons)", "Net Wt (Tons)", 
        "Target Silo/Bin", "Challan No", "Moisture %", "Received By", "Remarks", "Status"
      ]);
      sheet.getRange(1, 1, 1, 16)
        .setFontWeight("bold")
        .setBackground("#1D5FA7")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
    
    // Append the newly received incoming material row
    sheet.appendRow([
      new Date(),
      data.slipNo || "",
      data.date || "",
      data.time || "",
      data.material || "",
      data.supplier || "",
      data.vehicleNo || "",
      data.grossWeight || 0,
      data.tareWeight || 0,
      data.netWeight || 0,
      data.targetSilo || "",
      data.challanNo || "",
      data.moisturePct || "-",
      data.recordedBy || "",
      data.remarks || "",
      data.status || "Received"
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", received: data.slipNo }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
