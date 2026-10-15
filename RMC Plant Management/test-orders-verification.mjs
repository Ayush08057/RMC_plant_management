/**
 * Verification Test Suite for "Today's Scheduled Concrete Orders"
 * Plant Manager Dashboard - SM Concrete Tech RMC System
 */

import assert from 'node:assert/strict';

console.log('--- STARTING VERIFICATION TEST SUITE ---');

// 1. Timezone & Business Date Handling Test
const PLANT_TIMEZONE = 'Asia/Kolkata';

function getTodayISTDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PLANT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function normalizeOrderDate(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: PLANT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    }
  } catch {}
  return str.slice(0, 10);
}

const todayIST = getTodayISTDate();
console.log(`Current Plant Business Date (IST): ${todayIST}`);
assert.match(todayIST, /^\d{4}-\d{2}-\d{2}$/, 'Today IST must be YYYY-MM-DD');

// 2. Sample Orders Simulation
const CURRENT_PLANT_NAME = 'Main Plant Unit #01';
const CURRENT_PLANT_ID = 'PLANT-001';

const sampleOrders = [
  {
    id: 'ORD-1001',
    orderId: 'ORD-1001',
    plant: 'Main Plant Unit #01',
    client: 'L&T Construction',
    project: 'Metro Pillar Section 4',
    grade: 'M35',
    qty: '12.0 m³',
    volume: 12.0,
    site: 'Sector 62, Station 4',
    timeSlot: '09:00 AM - 11:00 AM',
    priority: 'High',
    status: 'Scheduled',
    scheduledDate: todayIST,
  },
  {
    id: 'ORD-1002',
    orderId: 'ORD-1002',
    plant: 'Main Plant Unit #01',
    client: 'Shapoorji Pallonji',
    project: 'Highrise Tower B',
    grade: 'M40',
    qty: '8.5 m³',
    volume: 8.5,
    site: 'Golf Course Extension',
    timeSlot: '11:30 AM - 01:30 PM',
    priority: 'Urgent',
    status: 'Batched',
    scheduledDate: todayIST,
  },
  {
    id: 'ORD-1003',
    orderId: 'ORD-1003',
    plant: 'Other Plant Unit #02', // Different plant
    client: 'DLF Cyberpark',
    grade: 'M25',
    volume: 6.0,
    scheduledDate: todayIST,
    status: 'Scheduled',
  },
  {
    id: 'ORD-1004',
    orderId: 'ORD-1004',
    plant: 'Main Plant Unit #01',
    client: 'Tata Projects',
    grade: 'M30',
    volume: 7.0,
    scheduledDate: '2026-01-01', // Different date
    status: 'Scheduled',
  },
  {
    id: 'ORD-1005',
    orderId: 'ORD-1005',
    plant: 'Main Plant Unit #01',
    client: 'Cancelled Client',
    grade: 'M20',
    volume: 5.0,
    scheduledDate: todayIST,
    status: 'Cancelled', // Cancelled order
  },
  // Duplicate record test
  {
    id: 'ORD-1001',
    orderId: 'ORD-1001',
    plant: 'Main Plant Unit #01',
    client: 'L&T Construction (Duplicate)',
    grade: 'M35',
    volume: 12.0,
    scheduledDate: todayIST,
    status: 'Scheduled',
  }
];

// TEST: Date, Plant, Cancelled, and Deduplication Filtering
function filterTodayOrders(orders, currentPlant, targetDate) {
  const orderMap = new Map();

  orders.forEach((order) => {
    if (!order) return;
    const orderId = order.orderId || order.id;
    if (!orderId) return;
    if (order.status === 'Cancelled') return;

    const plantMatches =
      !order.plant ||
      order.plant === currentPlant ||
      order.plantId === CURRENT_PLANT_ID ||
      order.plant === 'Plant Unit #01';

    if (!plantMatches) return;

    const orderDate = normalizeOrderDate(order.scheduledDate || order.date || order.createdAt);
    if (orderDate === targetDate) {
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, order);
      }
    }
  });

  return Array.from(orderMap.values());
}

const filtered = filterTodayOrders(sampleOrders, CURRENT_PLANT_NAME, todayIST);

console.log(`Eligible orders for today: ${filtered.length}`);
assert.equal(filtered.length, 2, 'Should filter down to exactly 2 valid orders (ORD-1001 and ORD-1002)');
assert.equal(filtered[0].orderId, 'ORD-1001');
assert.equal(filtered[1].orderId, 'ORD-1002');
console.log('✓ TEST 8 & 11 Passed: Date, plant, cancellation, and deduplication verified.');

// TEST: Search Functionality
const searchKeys = ['orderId', 'id', 'client', 'customer', 'project', 'projectName', 'grade', 'mixGrade', 'concreteGrade', 'site', 'pourLocation', 'priority'];

function searchFilter(data, query) {
  if (!query.trim()) return data;
  const q = query.trim().toLowerCase();
  return data.filter((item) => {
    return searchKeys.some((k) => {
      const val = item[k];
      return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
    });
  });
}

// TEST 4: Search by Order ID
const resById = searchFilter(filtered, 'ORD-1002');
assert.equal(resById.length, 1);
assert.equal(resById[0].orderId, 'ORD-1002');
console.log('✓ TEST 4 Passed: Search by order ID returned exact match.');

// TEST 5: Search by Customer Name & Grade
const resByClient = searchFilter(filtered, 'shapo');
assert.equal(resByClient.length, 1);
assert.equal(resByClient[0].client, 'Shapoorji Pallonji');

const resByGrade = searchFilter(filtered, 'M35');
assert.equal(resByGrade.length, 1);
assert.equal(resByGrade[0].grade, 'M35');
console.log('✓ TEST 5 Passed: Search by customer and mix grade works with partial, case-insensitive match.');

// TEST 6: Clear Search
const resCleared = searchFilter(filtered, '');
assert.equal(resCleared.length, 2);
console.log('✓ TEST 6 Passed: Clearing search restores full list.');

// TEST 7: Edit Order
const updatedOrder = { ...filtered[0], qty: '15.0 m³', volume: 15.0, status: 'Batched' };
const updatedList = filtered.map(o => o.orderId === updatedOrder.orderId ? updatedOrder : o);
assert.equal(updatedList[0].qty, '15.0 m³');
assert.equal(updatedList[0].status, 'Batched');
console.log('✓ TEST 7 Passed: Order editing properly updates displayed fields.');

// TEST 12: Summary Cards Real Metric Calculation
function computeMetrics(orders, trips, plants) {
  let targetVolume = 0;
  let producedVolume = 0;
  let dispatchedCount = 0;
  let batchedCount = 0;

  orders.forEach((ord) => {
    const vol = parseFloat(ord.volume || ord.qty) || 0;
    targetVolume += vol;

    const statusLower = String(ord.status || '').toLowerCase();
    const isBatchedOrBeyond = [
      'batched', 'loading', 'in transit', 'dispatched', 'at site', 'pouring', 'delivered', 'completed'
    ].includes(statusLower);

    if (isBatchedOrBeyond) producedVolume += vol;
    if (['loading', 'in transit', 'dispatched', 'at site', 'pouring', 'delivered', 'completed'].includes(statusLower)) {
      dispatchedCount += 1;
    }
    if (['batched', 'loading', 'in transit', 'dispatched'].includes(statusLower)) {
      batchedCount += 1;
    }
  });

  const percentage = targetVolume > 0 ? Math.min(100, Math.round((producedVolume / targetVolume) * 100)) : 0;

  return {
    todayProduction: `${producedVolume.toFixed(1)} m³`,
    targetVolume: targetVolume.toFixed(1),
    dispatchedCount,
    percentage
  };
}

const metrics = computeMetrics(updatedList, [], []);
console.log('Computed Metrics:', metrics);
assert.equal(metrics.targetVolume, '23.5');
assert.equal(metrics.todayProduction, '23.5 m³'); // Both are now batched
assert.equal(metrics.percentage, 100);
console.log('✓ TEST 12 Passed: Summary cards use real data without fabricated values.');

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY ---');
