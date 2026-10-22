import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck,
  User,
  Clock,
  CheckCircle2,
  X,
  HelpCircle,
  Check,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { pushCloudStore } from '../../../services/cloudSyncService';
import HelpModal from './HelpModal';

const TRIPS_STORAGE_KEY = 'rmc_driver_trips_v2';
const CHALLAN_STORAGE_KEY = 'rmc_delivery_challans_v2';

export default function RecordVehicleReturnWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [returnTime, setReturnTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [returnedM3, setReturnedM3] = useState(0);
  const [finalOdo, setFinalOdo] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const ongoing = parsed.filter(t => t.status !== 'Completed');
          setActiveTrips(ongoing);
          if (ongoing.length > 0) {
            setSelectedTrip(ongoing[0]);
            setFinalOdo('');
          }
        }
      }
    } catch (e) {
      console.warn('Error reading trips:', e);
    }
  }, [isOpen]);

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    setFinalOdo('');
  };

  const handleSave = () => {
    if (!selectedTrip) return;

    const startOdo = Number(selectedTrip.startOdometer) || 0;
    const endOdo = Number(finalOdo);

    if (!endOdo || endOdo <= 0) {
      alert(language === 'mr' ? 'कृपया अंतिम ओडोमीटर रीडिंग टाका.' : 'Please enter a valid positive final odometer reading.');
      return;
    }
    if (startOdo > 0 && endOdo < startOdo) {
      alert(language === 'mr' ? 'अंतिम ओडोमीटर सुरुवातीच्या ओडोमीटरपेक्षा कमी असू शकत नाही.' : `Final odometer (${endOdo}) cannot be less than starting odometer (${startOdo}).`);
      return;
    }

    const diffKm = startOdo > 0 ? Number((endOdo - startOdo).toFixed(1)) : 0;

    // Calculate actual turnaround minutes
    let actualTurnaround = 45;
    try {
      if (selectedTrip.departureTime) {
        const now = new Date();
        const depParts = selectedTrip.departureTime.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
        if (depParts) {
          let depHour = parseInt(depParts[1], 10);
          const depMin = parseInt(depParts[2], 10);
          const depAmPm = depParts[3];
          if (depAmPm && depAmPm.toUpperCase() === 'PM' && depHour < 12) depHour += 12;
          if (depAmPm && depAmPm.toUpperCase() === 'AM' && depHour === 12) depHour = 0;
          const depDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), depHour, depMin);
          const diffMs = Math.max(0, now.getTime() - depDate.getTime());
          actualTurnaround = Math.round(diffMs / (1000 * 60)) || 45;
        }
      }
    } catch {}

    // Update in rmc_driver_trips_v2
    try {
      const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
      if (raw) {
        const trips = JSON.parse(raw);
        const updated = trips.map(t => {
          if (t.id === selectedTrip.id || t.challanNo === selectedTrip.challanNo) {
            return {
              ...t,
              status: 'Completed',
              plantReturnTime: returnTime,
              finalOdometer: endOdo,
              distanceKm: diffKm,
              tripDistanceKm: diffKm,
              turnaroundMins: actualTurnaround,
              returnedM3: Number(returnedM3) || 0
            };
          }
          return t;
        });
        localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updated));
        pushCloudStore('cloud_driver_trips', TRIPS_STORAGE_KEY, updated);
      }
    } catch (e) {
      console.warn('Error updating trip:', e);
    }

    // Also update vehicle in fleet to Available & update odometer
    try {
      const vehKey = 'rmc_plant_vehicles_v2';
      const vehRaw = localStorage.getItem(vehKey);
      if (vehRaw) {
        const vehList = JSON.parse(vehRaw);
        const updatedVehs = vehList.map(v => {
          if (v.vehicleNo === selectedTrip.vehicleNo) {
            return {
              ...v,
              status: 'Available / Plant',
              currentOdometer: endOdo || v.currentOdometer
            };
          }
          return v;
        });
        localStorage.setItem(vehKey, JSON.stringify(updatedVehs));
        pushCloudStore('cloud_plant_vehicles', vehKey, updatedVehs);
      }
    } catch {}

    // Also update delivery challans to Delivered
    try {
      const challanRaw = localStorage.getItem(CHALLAN_STORAGE_KEY);
      if (challanRaw) {
        const challans = JSON.parse(challanRaw);
        const updatedChallans = challans.map(c => {
          if (c.challanNo === selectedTrip.challanNo || c.vehicleNo === selectedTrip.vehicleNo) {
            return { ...c, status: 'Delivered' };
          }
          return c;
        });
        localStorage.setItem(CHALLAN_STORAGE_KEY, JSON.stringify(updatedChallans));
        pushCloudStore('cloud_delivery_challans', CHALLAN_STORAGE_KEY, updatedChallans);
      }
    } catch (e) {
      // ignore
    }

    setSavedSuccess(true);
    if (onComplete) onComplete(selectedTrip);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {language === 'mr' ? 'गाडी परत आली (वापसी नोंद)' : 'Record Vehicle Return'}
              </h3>
              <p className="text-[11px] text-emerald-200">
                {language === 'mr' ? 'प्लॅन्टमध्ये परत आलेल्या गाडीची नोंद करा' : 'Mark vehicle return to plant yard'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('help', 'Help')}</span>
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short Instruction Banner */}
        <div className="bg-emerald-50 px-5 py-2 border-b border-emerald-200 text-xs text-emerald-950 font-semibold">
          {t('instructionRecordReturn')}
        </div>

        {/* Success View */}
        {savedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {t('returnRecordedSuccess')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'mr'
                  ? `गाडी ${selectedTrip?.vehicleNo} प्लॅन्टमध्ये परत आल्याची नोंद झाली.`
                  : `Mixer truck ${selectedTrip?.vehicleNo} marked returned to plant yard.`}
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
              >
                {t('done', 'Done')}
              </button>
            </div>
          </div>
        ) : (
          /* Return Form */
          <div className="p-5 space-y-4">
            {activeTrips.length === 0 ? (
              <div className="text-center py-8 text-slate-500 space-y-2">
                <Truck className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                <p className="font-bold text-xs">
                  {language === 'mr' ? 'सध्या कोणतीही गाडी रस्त्यावर किंवा साइटवर नाही.' : 'No active trips currently away from plant.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {language === 'mr' ? 'सर्व गाड्या प्लॅन्टमध्ये उभ्या आहेत.' : 'All registered fleet vehicles are in yard.'}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    {t('qWhichVehicleReturned')}
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {language === 'mr' ? 'रस्त्यावरील गाड्यांपैकी परत आलेली गाडी निवडा:' : 'Tap the vehicle that just entered the plant gate:'}
                  </p>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeTrips.map((trip) => {
                      const isSelected = selectedTrip?.id === trip.id;
                      return (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => handleSelectTrip(trip)}
                          className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 font-bold shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-mono font-black text-xs text-slate-900">{trip.vehicleNo}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                <span>{trip.driverName}</span>
                                <span>•</span>
                                <span className="text-blue-700 font-bold">{trip.grade || 'M25'}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            {trip.status || 'In Transit'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Return time, final odometer & leftover concrete */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      {t('qReturnTime')}
                    </label>
                    <input
                      type="text"
                      value={returnTime}
                      onChange={e => setReturnTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold bg-white focus:outline-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Final Odometer (km)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 12480"
                      value={finalOdo}
                      onChange={e => setFinalOdo(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold bg-white focus:outline-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      {language === 'mr' ? 'शिल्लक काँक्रीट (m³):' : 'Returned (m³):'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={returnedM3}
                      onChange={e => setReturnedM3(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono bg-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!selectedTrip}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{language === 'mr' ? 'वापसी नोंद करा' : 'Confirm Return'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <HelpModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          topic="recordReturn"
        />
      </div>
    </div>,
    document.body
  );
}
