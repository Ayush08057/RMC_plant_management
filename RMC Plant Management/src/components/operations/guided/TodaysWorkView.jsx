import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Truck,
  Layers,
  PackageCheck,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  User
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { subscribeCloudStore, sanitizeStoreItems } from '../../../services/cloudSyncService';

const TRIPS_KEY = 'rmc_driver_trips_v2';
const CHALLANS_KEY = 'rmc_delivery_challans_v2';
const BATCHING_KEY = 'rmc_batching_sheets_v2';
const INWARD_KEY = 'rmc_material_inward_v2';

export default function TodaysWorkView({ onOpenWizard, onNavigateModule }) {
  const { language, t } = useLanguage();
  const [trips, setTrips] = useState([]);
  const [challans, setChallans] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inward, setInward] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    try {
      const tr = localStorage.getItem(TRIPS_KEY);
      if (tr) setTrips(sanitizeStoreItems(JSON.parse(tr)));

      const ch = localStorage.getItem(CHALLANS_KEY);
      if (ch) setChallans(sanitizeStoreItems(JSON.parse(ch)));

      const bt = localStorage.getItem(BATCHING_KEY);
      if (bt) setBatches(sanitizeStoreItems(JSON.parse(bt)));

      const inw = localStorage.getItem(INWARD_KEY);
      if (inw) setInward(sanitizeStoreItems(JSON.parse(inw)));
    } catch (e) {
      console.warn('Error loading today work data:', e);
    }

    const unsubTrips = subscribeCloudStore('cloud_driver_trips', TRIPS_KEY, [], (items) => {
      if (Array.isArray(items)) setTrips(items);
    });
    const unsubInward = subscribeCloudStore('cloud_material_inward', INWARD_KEY, [], (items) => {
      if (Array.isArray(items)) setInward(items);
    });
    const unsubChallans = subscribeCloudStore('cloud_delivery_challans', CHALLANS_KEY, [], (items) => {
      if (Array.isArray(items)) setChallans(items);
    });
    const unsubBatches = subscribeCloudStore('cloud_batching_sheets', BATCHING_KEY, [], (items) => {
      if (Array.isArray(items)) setBatches(items);
    });

    return () => {
      unsubTrips();
      unsubInward();
      unsubChallans();
      unsubBatches();
    };
  }, []);

  // 1. Vehicles currently away from plant
  const awayTrips = trips.filter(t => t.status === 'Departed' || t.status === 'En Route' || t.status === 'Pouring');
  // 2. Vehicles that have reached sites
  const atSiteTrips = trips.filter(t => t.status === 'Pouring' || t.status === 'At Site');
  // 3. Vehicles returning
  const returningTrips = trips.filter(t => t.status === 'Returning');
  // 4. Trips completed today
  const completedTrips = trips.filter(t => t.status === 'Completed');

  // 5. Materials received today
  const totalInwardMT = inward.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // 6. Concrete produced today (m³)
  const totalConcreteM3 = batches.reduce((sum, b) => sum + (Number(b.volume) || 0), 0) + 
    challans.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10 text-slate-800">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-slate-900">
              {language === 'mr' ? 'आजचे एकूण काम' : "Today's Operational Summary"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('instructionTodaysWork')}
          </p>
        </div>

        <div className="text-right">
          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* The 7 Core Answers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Q1: Vehicles Away From Plant */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {language === 'mr' ? 'साइटवर असलेल्या गाड्या' : 'Mixers Away on Road'}
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {awayTrips.length} <span className="text-xs font-normal text-slate-500">{language === 'mr' ? 'गाड्या' : 'mixers'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {language === 'mr' ? `${atSiteTrips.length} साइटवर खाली करत आहेत` : `${atSiteTrips.length} pouring at sites`}
          </p>
        </div>

        {/* Q2 & Q3: Returning to Plant */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {language === 'mr' ? 'परत येत असलेल्या गाड्या' : 'Mixers Returning'}
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {returningTrips.length} <span className="text-xs font-normal text-slate-500">{language === 'mr' ? 'गाड्या' : 'mixers'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {language === 'mr' ? 'वाटेवर आहेत' : 'En route to plant yard'}
          </p>
        </div>

        {/* Q4: Trips Completed Today */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {language === 'mr' ? 'पूर्ण झालेल्या फेऱ्या' : 'Trips Completed'}
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {completedTrips.length + challans.filter(c => c.status === 'Delivered').length}
            <span className="text-xs font-normal text-slate-500 ml-1">{language === 'mr' ? 'फेऱ्या' : 'trips'}</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">
            ✓ {language === 'mr' ? 'यशस्वीपणे पोहोचवले' : 'Delivered safely'}
          </p>
        </div>

        {/* Q6: Total Concrete Produced Today */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {language === 'mr' ? 'आजचे एकूण काँक्रीट' : 'Today’s Concrete'}
            </span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">
            {totalConcreteM3.toFixed(1)}
            <span className="text-xs font-normal text-slate-500 ml-1">m³</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {language === 'mr' ? 'एकूण उत्पादन' : 'Total batched & dispatched'}
          </p>
        </div>
      </div>

      {/* Live Dispatched Vehicles List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>{language === 'mr' ? 'गाड्यांची सद्यस्थिती' : 'Live Vehicle Dispatch Status'}</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-bold">
            {trips.length} {language === 'mr' ? 'गाड्यांची नोंद' : 'total vehicle trips today'}
          </span>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            <p>{language === 'mr' ? 'आज अजून कोणतीही गाडी रवाना झालेली नाही.' : 'No vehicle trips recorded yet today.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trips.map((t, idx) => (
              <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono font-black text-xs text-slate-900 flex items-center gap-2">
                      <span>{t.vehicleNo}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">{t.grade || 'M25'}</span>
                      <span className="text-[10px] font-bold text-slate-600">({t.quantityM3 || 6.0} m³)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{t.clientName || 'Customer Site'}</span>
                      <span>•</span>
                      <span>{t.driverName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {t.status === 'Completed' ? (language === 'mr' ? 'पूर्ण झाले' : 'Completed') : (language === 'mr' ? 'रस्त्यावर' : 'In Transit')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Materials Inward Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-amber-600" />
            <span>{language === 'mr' ? 'आज आलेला कच्चा माल' : 'Raw Materials Received Today'}</span>
          </h3>
          <span className="text-[11px] font-bold text-amber-800">
            {totalInwardMT > 0 ? `${totalInwardMT.toFixed(1)} MT Received` : 'Active'}
          </span>
        </div>

        {inward.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {language === 'mr' ? 'आज नवीन मालाची नोंद नाही.' : 'No new raw material deliveries recorded today yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {inward.slice(0, 4).map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">{item.material}</span>
                  <span className="text-[10px] text-slate-500">{item.supplier}</span>
                </div>
                <span className="font-mono font-black text-amber-950 text-xs">{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
