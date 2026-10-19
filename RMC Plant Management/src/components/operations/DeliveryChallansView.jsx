import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Truck, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  User, 
  X, 
  FileText,
  ShieldCheck,
  Calendar
} from 'lucide-react';

const CHALLAN_STORAGE_KEY = 'rmc_delivery_challans_v2';

const INITIAL_CHALLANS = [
  {
    id: 'DC-25-26/1420',
    challanNo: 'DC-25-26/1420',
    date: '19-Oct-2026',
    departureTime: '09:50 AM',
    customerName: 'Shree Construction & Infra',
    site: 'Tanang Highway Pier Zone #4',
    vehicleNo: 'MH-10-CR-1212',
    driverName: 'Sachin Shinde',
    grade: 'M25 Concrete',
    quantity: 6.0,
    slump: '125 mm',
    status: 'In Transit',
    receiverName: 'Amit Patil (Site Incharge)',
  },
  {
    id: 'DC-25-26/1419',
    challanNo: 'DC-25-26/1419',
    date: '19-Oct-2026',
    departureTime: '08:20 AM',
    customerName: 'Kulkarni Builders & Developers',
    site: 'Sangli Bypass Bridge Slab #2',
    vehicleNo: 'MH-10-CR-1313',
    driverName: 'Vikas Jadhav',
    grade: 'M30 Concrete',
    quantity: 6.0,
    slump: '135 mm',
    status: 'Delivered',
    receiverName: 'D. K. Mane',
  }
];

export default function DeliveryChallansView() {
  const [challans, setChallans] = useState(() => {
    try {
      const saved = localStorage.getItem(CHALLAN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_CHALLANS;
  });

  useEffect(() => {
    localStorage.setItem(CHALLAN_STORAGE_KEY, JSON.stringify(challans));
  }, [challans]);

  const [searchQuery, setSearchQuery] = useState('');
  const [printingChallan, setPrintingChallan] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    challanNo: `DC-25-26/${challans.length + 1421}`,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    departureTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    customerName: '',
    site: '',
    vehicleNo: 'MH-10-CR-1212',
    driverName: 'Sachin Shinde',
    grade: 'M25 Concrete',
    quantity: 6.0,
    slump: '125 mm',
    receiverName: '',
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) return alert('Enter customer name');
    const newChallan = {
      id: `DC-${Date.now()}`,
      ...form,
      status: 'In Transit',
      createdAt: new Date().toISOString()
    };
    setChallans([newChallan, ...challans]);
    setShowCreateModal(false);
  };

  const filtered = challans.filter(c => 
    c.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.site.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Transit Mixer Delivery Challans & Gate Passes</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Real-time concrete dispatch notes, site delivery receipts, and driver handovers
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challan, truck, site..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Challan</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full min-w-[750px] text-left text-xs">
          <thead>
            <tr className="bg-slate-100/90 text-slate-900 font-black uppercase text-[10px] border-b border-slate-200">
              <th className="py-2.5 px-3">Challan # & Time</th>
              <th className="py-2.5 px-3">Customer & Site</th>
              <th className="py-2.5 px-3">Mixer Vehicle</th>
              <th className="py-2.5 px-3">Concrete Grade</th>
              <th className="py-2.5 px-3 text-right">Volume</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3">
                  <div className="font-mono font-black text-slate-900">#{c.challanNo}</div>
                  <div className="text-[10px] text-slate-500">{c.date} • {c.departureTime}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900">{c.customerName}</div>
                  <div className="text-[10px] text-slate-500">{c.site}</div>
                </td>
                <td className="py-2.5 px-3 font-mono font-bold">{c.vehicleNo}</td>
                <td className="py-2.5 px-3 font-semibold text-blue-700">{c.grade}</td>
                <td className="py-2.5 px-3 text-right font-mono font-black">{c.quantity} m³</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => setPrintingChallan(c)}
                    className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                    title="Print Delivery Challan"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Printable Challan Modal */}
      {printingChallan && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 print:p-0 print:bg-white print:static print:block">
          <div className="bg-white text-black max-w-lg w-full rounded-2xl p-5 border border-black space-y-3 font-mono text-[11px] print:border-none print:shadow-none">
            <div className="flex justify-between items-center no-print border-b pb-2">
              <span className="font-bold">Delivery Challan Ticket</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded">Print</button>
                <button onClick={() => setPrintingChallan(null)} className="p-1 text-slate-600">✕</button>
              </div>
            </div>

            <div className="text-center border-b border-black pb-2">
              <h2 className="text-base font-black">SM CONCRETECH</h2>
              <p className="text-[10px]">A/P Tanang, Sangli - 416410 • +91 9421858683</p>
              <div className="font-bold border border-black py-0.5 mt-1 uppercase">Computerized Delivery Challan & Gate Pass</div>
            </div>

            <div className="grid grid-cols-2 gap-1 border-b border-black pb-2 text-[10px]">
              <div><strong>Challan #: </strong>{printingChallan.challanNo}</div>
              <div><strong>Date: </strong>{printingChallan.date} {printingChallan.departureTime}</div>
              <div><strong>Customer: </strong>{printingChallan.customerName}</div>
              <div><strong>Mix Grade: </strong>{printingChallan.grade}</div>
              <div><strong>Delivery Site: </strong>{printingChallan.site}</div>
              <div><strong>Mixer Truck: </strong>{printingChallan.vehicleNo}</div>
              <div><strong>Quantity: </strong>{printingChallan.quantity} m³</div>
              <div><strong>Driver: </strong>{printingChallan.driverName}</div>
            </div>

            <div className="p-2 border border-black text-[9px] leading-tight">
              <strong>Notice to Customer:</strong> Do not add water to the transit mixer drum at the site without written authorisation from the QA/QC engineer. Adding excess water reduces compressive strength and voids concrete structural warranty.
            </div>

            <div className="grid grid-cols-2 pt-6 text-center text-[10px]">
              <div className="border-t border-dotted border-black pt-1">Driver Signature</div>
              <div className="border-t border-dotted border-black pt-1">Site Customer Receiver Signature</div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Modal */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm">Issue Delivery Challan</h3>
              <button onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">Customer / Project Name</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => setForm({...form, customerName: e.target.value})}
                  className="w-full p-2 border rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold mb-1">Site Location</label>
                  <input
                    type="text"
                    value={form.site}
                    onChange={e => setForm({...form, site: e.target.value})}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Mixer Truck</label>
                  <input
                    type="text"
                    value={form.vehicleNo}
                    onChange={e => setForm({...form, vehicleNo: e.target.value})}
                    className="w-full p-2 border rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold mb-1">Concrete Grade</label>
                  <select
                    value={form.grade}
                    onChange={e => setForm({...form, grade: e.target.value})}
                    className="w-full p-2 border rounded-xl"
                  >
                    <option>M15 Concrete</option>
                    <option>M20 Concrete</option>
                    <option>M25 Concrete</option>
                    <option>M30 Concrete</option>
                    <option>M35 Concrete</option>
                    <option>M40 Concrete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.quantity}
                    onChange={e => setForm({...form, quantity: Number(e.target.value)})}
                    className="w-full p-2 border rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl">Save & Issue</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
