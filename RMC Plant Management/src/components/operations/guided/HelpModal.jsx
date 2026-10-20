import React from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, CheckCircle2, AlertCircle, Info, BookOpen } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function HelpModal({ isOpen, onClose, topic = 'general' }) {
  const { language } = useLanguage();
  if (!isOpen || typeof document === 'undefined') return null;

  const HELP_CONTENT = {
    general: {
      en: {
        title: 'How to use this system',
        subtitle: 'Simple guide for daily plant work',
        q1: 'What is this page for?',
        a1: 'This page helps you record daily plant operations quickly and correctly without complicated computer steps.',
        q2: 'What should I do?',
        a2: 'Select any large action card (like Send Vehicle, Receive Materials, or Make Concrete), answer the step-by-step questions, and click Save.',
        q3: 'What if I make a mistake?',
        a3: 'You can always click "Go Back" before saving, or click Cancel. Saved records can also be viewed and updated.',
      },
      mr: {
        title: 'ही सिस्टीम कशी वापरावी?',
        subtitle: 'दैनंदिन प्लॅन्ट कामासाठी सोपी माहिती',
        q1: 'हे पान कशासाठी आहे?',
        a1: 'हे पान प्लॅन्टवरील दैनंदिन कामे (गाडी पाठवणे, माल नोंदवणे, काँक्रीट बनवणे) अत्यंत सोप्या पद्धतीने नोंदवण्यासाठी आहे.',
        q2: 'मी काय करावे?',
        a2: 'मोठ्या बटनांपैकी जे काम करायचे आहे ते निवडा, विचारलेल्या साध्या प्रश्नांची उत्तरे द्या आणि "माहिती सेव्ह करा" दाबा.',
        q3: 'काही चूक झाली तर?',
        a3: 'सेव्ह करण्यापूर्वी तुम्ही कधीही "मागे जा" दाबू शकता. चूक झाल्यास रेकॉर्ड दुरुस्तही करता येतो.',
      }
    },
    sendVehicle: {
      en: {
        title: 'Help: Send Vehicle to Site',
        subtitle: 'Issuing a delivery challan for concrete dispatch',
        q1: 'When to use this?',
        a1: 'Use this whenever a loaded transit mixer is leaving the plant gate for a customer site.',
        q2: 'What information do I need?',
        a2: 'Vehicle number, driver name, customer name, delivery site, concrete grade (e.g. M25), and quantity in m³.',
        q3: 'What happens after I click Confirm?',
        a3: 'The trip starts immediately, status becomes "In Transit", and a computerized delivery challan gate pass is generated for printing.',
      },
      mr: {
        title: 'मदत: गाडी साइटवर पाठवा (चालान)',
        subtitle: 'काँक्रीट भरलेली गाडी पाठवण्यासाठी मार्गदर्शन',
        q1: 'हे कधी वापरायचे?',
        a1: 'प्लॅन्टमधून काँक्रीट भरलेली गाडी ग्राहकाच्या साइटवर निघताना हे पान वापरा.',
        q2: 'काय माहिती लागेल?',
        a2: 'गाडी नंबर, ड्रायव्हरचे नाव, ग्राहक व साइटचे नाव, काँक्रीटचा ग्रेड (उदा. M20, M25), आणि किती घनमीटर (m³) माल भरला आहे.',
        q3: 'सेव्ह केल्यावर काय होते?',
        a3: 'गाडी रस्त्यावर (In Transit) दिसेल आणि ड्रायव्हरला देण्यासाठी संगणकीकृत डिलिव्हरी चालान प्रिंट होईल.',
      }
    },
    receiveMaterials: {
      en: {
        title: 'Help: Receive Raw Materials',
        subtitle: 'Recording inward cement, aggregates, and sand',
        q1: 'When to use this?',
        a1: 'Use this whenever a bulk tanker of cement, fly ash, or truck of sand/aggregate arrives at the plant.',
        q2: 'What information do I need?',
        a2: 'Material type, supplier name, net quantity in Metric Tonnes (MT), and supplier vehicle/challan number.',
        q3: 'What happens after saving?',
        a3: 'The raw material silo inventory automatically increases, and the inward delivery is logged.',
      },
      mr: {
        title: 'मदत: आलेला कच्चा माल नोंदवा',
        subtitle: 'सिमेंट, वाळू, खडीची नोंद करण्यासाठी मार्गदर्शन',
        q1: 'हे कधी वापरायचे?',
        a1: 'प्लॅन्टवर सिमेंटचा टँकर, वाळू किंवा खडीची गाडी आली की लगेच येथे नोंद करा.',
        q2: 'काय माहिती लागेल?',
        a2: 'मालाचा प्रकार (सिमेंट, वाळू इ.), सप्लायरचे नाव, वजन (टनांमध्ये) आणि गाडी नंबर.',
        q3: 'सेव्ह केल्यावर काय होते?',
        a3: 'प्लॅन्टमधील साठ्याची (Silo Stock) संख्या लगेच वाढते आणि हिशोबात नोंद होते.',
      }
    },
    makeConcrete: {
      en: {
        title: 'Help: Make Concrete (Batching)',
        subtitle: 'Recording batching production runs',
        q1: 'When to use this?',
        a1: 'Use this when the pan mixer batches concrete according to an approved mix recipe.',
        q2: 'What information do I need?',
        a2: 'Concrete mix grade (M15, M20, M25, M30, M35, M40) and quantity in m³.',
        q3: 'What happens after saving?',
        a3: 'The batching sheet is saved with exact material quantities consumed from silos.',
      },
      mr: {
        title: 'मदत: काँक्रीट तयार करा (बॅचिंग)',
        subtitle: 'काँक्रीट उत्पादनाची नोंद करण्याचे मार्गदर्शन',
        q1: 'हे कधी वापरायचे?',
        a1: 'प्लॅन्टमध्ये काँक्रीट मिक्स तयार केले की बॅचिंग शीट नोंदवण्यासाठी हे वापरा.',
        q2: 'काय माहिती लागेल?',
        a2: 'काँक्रीटचा ग्रेड (M20, M25, M30 इ.) आणि एकूण किती m³ काँक्रीट बनवले ते टाका.',
        q3: 'सेव्ह केल्यावर काय होते?',
        a3: 'आजच्या उत्पादनात (Production) त्याची नोंद होते आणि वापरलेला माल सायलोमधून वजा होतो.',
      }
    },
    recordReturn: {
      en: {
        title: 'Help: Record Vehicle Return',
        subtitle: 'Closing active trips upon mixer arrival',
        q1: 'When to use this?',
        a1: 'Use this as soon as a transit mixer finishes pouring at the site and returns to the plant yard.',
        q2: 'What information do I need?',
        a2: 'Select the returning vehicle from the active trips list and confirm the return time.',
        q3: 'What happens after saving?',
        a3: 'The trip is marked as "Completed", and the truck becomes available for the next load.',
      },
      mr: {
        title: 'मदत: गाडी परत आली (वापसी नोंद)',
        subtitle: 'गाडी प्लॅन्टमध्ये परत आल्यावर करायची नोंद',
        q1: 'हे कधी वापरायचे?',
        a1: 'साइटवर काँक्रीट खाली करून गाडी प्लॅन्टमध्ये परत आल्यावर लगेच येथे नोंद करा.',
        q2: 'काय माहिती लागेल?',
        a2: 'रस्त्यावरील गाड्यांच्या यादीतून परत आलेली गाडी निवडा आणि येण्याची वेळ तपासा.',
        q3: 'सेव्ह केल्यावर काय होते?',
        a3: 'ट्रिप पूर्ण (Completed) होते आणि गाडी पुढच्या फेरीसाठी तयार म्हणून दिसेल.',
      }
    }
  };

  const content = (HELP_CONTENT[topic] && HELP_CONTENT[topic][language]) || HELP_CONTENT.general[language] || HELP_CONTENT.general.en;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">{content.title}</h3>
              <p className="text-[11px] text-blue-200">{content.subtitle}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Questions & Answers */}
        <div className="p-5 space-y-3.5 text-xs text-slate-800 max-h-[70vh] overflow-y-auto">
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200">
            <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs mb-1">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{content.q1}</span>
            </h4>
            <p className="text-slate-700 leading-relaxed text-[11px]">{content.a1}</p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs mb-1">
              <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{content.q2}</span>
            </h4>
            <p className="text-slate-700 leading-relaxed text-[11px]">{content.a2}</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{content.q3}</span>
            </h4>
            <p className="text-slate-700 leading-relaxed text-[11px]">{content.a3}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
          >
            {language === 'mr' ? 'समजले (Close)' : 'Got it (Close)'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
