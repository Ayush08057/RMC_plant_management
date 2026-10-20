import React, { createContext, useContext, useState, useEffect } from 'react';

const LANGUAGE_STORAGE_KEY = 'rmc_language_pref';

export const TRANSLATIONS = {
  en: {
    // General
    languageName: 'English',
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    whatToDoToday: 'What would you like to do today?',
    whatToDoSubtitle: 'Click any action below to complete your work step by step.',
    switchToAdvanced: 'Switch to Advanced Technical View',
    switchToSimple: 'Switch to Simple Guided Mode',
    help: 'Help',
    cancel: 'Cancel',
    save: 'Save Details',
    next: 'Next Step',
    back: 'Go Back',
    confirm: 'Confirm & Save',
    close: 'Close',
    done: 'Done',
    viewDetails: 'View Details',
    loading: 'Loading...',
    required: 'Required',
    success: 'Success',
    error: 'Error',
    search: 'Search...',
    all: 'All',

    // 8 Primary Actions
    receiveMaterialsTitle: 'Receive Materials',
    receiveMaterialsDesc: 'Record cement, sand, 20mm/10mm aggregate arriving at the plant.',
    makeConcreteTitle: 'Make Concrete',
    makeConcreteDesc: 'Select an approved mix recipe and record concrete produced at plant.',
    sendVehicleTitle: 'Send Vehicle to Site',
    sendVehicleDesc: 'Select a driver, mixer truck, customer site, and quantity to dispatch.',
    recordReturnTitle: 'Record Vehicle Return',
    recordReturnDesc: 'Record when a transit mixer returns safely to the plant.',
    driverAttendanceTitle: 'Driver Attendance',
    driverAttendanceDesc: 'Mark today’s attendance for drivers, operators, and plant helpers.',
    checkVehicleTitle: 'Check Vehicle Status',
    checkVehicleDesc: 'See where trucks are: on road, pouring at site, or waiting in yard.',
    recordQualityTestTitle: 'Record Quality Test',
    recordQualityTestDesc: 'Enter slump test, cube strength, or moisture inspection results.',
    viewTodaysWorkTitle: "View Today's Work",
    viewTodaysWorkDesc: 'See total concrete dispatched, materials received, and completed trips.',

    // Step-by-Step Questions
    step1Vehicle: 'STEP 1: SELECT VEHICLE',
    qWhichVehicle: 'Which vehicle are you sending?',
    step2Driver: 'STEP 2: SELECT DRIVER',
    qWhoIsDriving: 'Who is driving this vehicle?',
    step3Destination: 'STEP 3: SELECT CUSTOMER & SITE',
    qWhereIsGoing: 'Where is the concrete going?',
    step4Quantity: 'STEP 4: ENTER CONCRETE QUANTITY',
    qHowMuchConcrete: 'How much concrete are you sending?',
    step5Confirm: 'STEP 5: CHECK AND CONFIRM',
    qCheckSummary: 'Please verify the dispatch details before starting the trip:',

    // Return Step-by-step
    qWhichVehicleReturned: 'Which vehicle has returned to the plant?',
    qReturnTime: 'What time did the vehicle return?',
    qReturnedConcrete: 'Is there any leftover returned concrete in the drum?',

    // Material Inward Step-by-step
    qWhatMaterialArrived: 'What material arrived at the plant?',
    qWhoIsSupplier: 'Who is the supplier / vendor?',
    qHowMuchMaterial: 'How much quantity arrived (Metric Tonnes)?',
    qVehicleChallan: 'Vehicle Number & Inward Challan Number',

    // Confirmations
    tripStartedSuccess: 'Trip started successfully! Delivery Challan issued.',
    materialReceivedSuccess: 'Material received and silo inventory updated successfully.',
    concreteMadeSuccess: 'Concrete production recorded successfully.',
    returnRecordedSuccess: 'Vehicle return recorded successfully.',
    attendanceRecordedSuccess: 'Attendance recorded successfully.',
    qualityTestSavedSuccess: 'Quality test result saved successfully.',

    // Top instruction banners
    instructionReceiveMaterials: 'Use this page when cement, sand, or aggregate arrives at the plant.',
    instructionMakeConcrete: 'Use this page to record concrete production at the batching plant.',
    instructionSendVehicle: 'Use this page when a loaded transit mixer leaves for a customer site.',
    instructionRecordReturn: 'Use this page when a transit mixer comes back to the plant.',
    instructionDriverAttendance: 'Use this page to record which drivers and workers are present today.',
    instructionQualityTest: 'Use this page to record slump tests and cube compressive strength tests.',
    instructionTodaysWork: 'Here is the summary of all concrete dispatched and materials received today.',
  },

  mr: {
    // General
    languageName: 'मराठी',
    goodMorning: 'शुभ प्रभात',
    goodAfternoon: 'शुभ दुपार',
    goodEvening: 'शुभ संध्याकाळ',
    whatToDoToday: 'आज काय काम करायचे आहे?',
    whatToDoSubtitle: 'खालीलपैकी एका बटनावर दाबा आणि सोप्या पायऱ्यांत काम पूर्ण करा.',
    switchToAdvanced: 'तांत्रिक डॅशबोर्डवर जा (Advanced)',
    switchToSimple: 'सोप्या मोडवर या (Simple Mode)',
    help: 'मदत',
    cancel: 'रद्द करा',
    save: 'माहिती सेव्ह करा',
    next: 'पुढील पायरी',
    back: 'मागे जा',
    confirm: 'तपासा आणि सेव्ह करा',
    close: 'बंद करा',
    done: 'झाले (Done)',
    viewDetails: 'तपशील पहा',
    loading: 'माहिती लोड होत आहे...',
    required: 'आवश्यक',
    success: 'यशस्वी',
    error: 'त्रुटी',
    search: 'शोधा...',
    all: 'सर्व',

    // 8 Primary Actions
    receiveMaterialsTitle: 'आलेला कच्चा माल नोंदवा',
    receiveMaterialsDesc: 'प्लॅन्टवर आलेले सिमेंट, वाळू, गिट्टी (खडी) आणि केमिकलची नोंद करा.',
    makeConcreteTitle: 'काँक्रीट तयार करा (बॅचिंग)',
    makeConcreteDesc: 'ठरवून दिलेल्या ग्रेडनुसार प्लॅन्टमध्ये तयार केलेल्या काँक्रीटची नोंद करा.',
    sendVehicleTitle: 'गाडी साइटवर पाठवा (चालान)',
    sendVehicleDesc: 'गाडी, ड्रायव्हर, ग्राहकाची साइट आणि काँक्रीटचे प्रमाण निवडून गाडी रवाना करा.',
    recordReturnTitle: 'गाडी परत आली (वापसी नोंद)',
    recordReturnDesc: 'काँक्रीट टाकून गाडी प्लॅन्टमध्ये परत आल्याची वेळ नोंदवा.',
    driverAttendanceTitle: 'ड्रायव्हर / कामगार हजेरी',
    driverAttendanceDesc: 'आज कामावर हजर असलेल्या ड्रायव्हर आणि प्लॅन्ट कामगारांची हजेरी लावा.',
    checkVehicleTitle: 'गाड्या कुठे आहेत? (गाड्यांची स्थिती)',
    checkVehicleDesc: 'कोणती गाडी रस्त्यावर आहे, साइटवर आहे की प्लॅन्टमध्ये उभी आहे ते पहा.',
    recordQualityTestTitle: 'काँक्रीट क्वालिटी टेस्ट (स्लम्प / क्युब)',
    recordQualityTestDesc: 'काँक्रीटची स्लम्प टेस्ट आणि क्युब स्ट्रेंथ टेस्टचे मोजमाप नोंदवा.',
    viewTodaysWorkTitle: 'आजचे एकूण काम पहा',
    viewTodaysWorkDesc: 'आज किती काँक्रीट पाठवले आणि किती कच्चा माल आला त्याचा सोपा आढावा पहा.',

    // Step-by-Step Questions
    step1Vehicle: 'पायरी १: गाडी निवडा',
    qWhichVehicle: 'कोणती गाडी पाठवायची आहे?',
    step2Driver: 'पायरी २: ड्रायव्हर निवडा',
    qWhoIsDriving: 'गाडी कोण चालवणार आहे?',
    step3Destination: 'पायरी ३: ग्राहक व साइट निवडा',
    qWhereIsGoing: 'काँक्रीट कोणत्या साइटवर चालले आहे?',
    step4Quantity: 'पायरी ४: काँक्रीटचे प्रमाण टाका',
    qHowMuchConcrete: 'गाडीत किती घनमीटर (m³) काँक्रीट भरले आहे?',
    step5Confirm: 'पायरी ५: माहिती तपासा आणि खात्री करा',
    qCheckSummary: 'गाडी रवाना करण्यापूर्वी खालील माहिती तपासून घ्या:',

    // Return Step-by-step
    qWhichVehicleReturned: 'कोणती गाडी प्लॅन्टमध्ये परत आली आहे?',
    qReturnTime: 'गाडी किती वाजता परत आली?',
    qReturnedConcrete: 'ड्रममध्ये काही शिल्लक काँक्रीट परत आले आहे का?',

    // Material Inward Step-by-step
    qWhatMaterialArrived: 'प्लॅन्टवर कोणता कच्चा माल आला आहे?',
    qWhoIsSupplier: 'माल पाठवणारा सप्लायर कोण आहे?',
    qHowMuchMaterial: 'गाडीत किती माल आला आहे (टनांमध्ये)?',
    qVehicleChallan: 'गाडी नंबर आणि सप्लायर चालान नंबर',

    // Confirmations
    tripStartedSuccess: 'गाडी यशस्वीपणे रवाना झाली! डिलिव्हरी चालान तयार झाले.',
    materialReceivedSuccess: 'आलेल्या मालाची नोंद झाली आणि सायलो स्टॉक अपडेट झाला.',
    concreteMadeSuccess: 'काँक्रीट बॅचिंगची नोंद यशस्वीपणे झाली.',
    returnRecordedSuccess: 'गाडी परत आल्याची नोंद यशस्वीपणे झाली.',
    attendanceRecordedSuccess: 'आजची हजेरी यशस्वीपणे सेव्ह झाली.',
    qualityTestSavedSuccess: 'क्वालिटी टेस्टचे रिझल्ट सेव्ह झाले.',

    // Top instruction banners
    instructionReceiveMaterials: 'प्लॅन्टवर सिमेंट, वाळू किंवा खडीची गाडी आली की या पानावर नोंद करा.',
    instructionMakeConcrete: 'प्लॅन्टमध्ये काँक्रीट मिक्स तयार केले की या पानावर नोंद करा.',
    instructionSendVehicle: 'काँक्रीट भरलेली गाडी ग्राहकाच्या साइटवर पाठवताना या पानावर चालान बनवा.',
    instructionRecordReturn: 'गाडी माल टाकून प्लॅन्टमध्ये परत आली की येथे नोंद करा.',
    instructionDriverAttendance: 'आज कोणते ड्रायव्हर आणि कामगार कामावर हजर आहेत त्यांची नोंद येथे करा.',
    instructionQualityTest: 'काँक्रीटचा स्लम्प किंवा क्युब टेस्टचे रिझल्ट येथे नोंदवा.',
    instructionTodaysWork: 'आज दिवसभरात पाठवलेले काँक्रीट आणि आलेल्या मालाचा हा सोपा हिशोब आहे.',
  }
};

export const DIRECT_MARATHI_MAP = {
  // Navigation & Sidebar
  'Navigation': 'मुख्य मेन्यू',
  'Dashboard': 'डॅशबोर्ड',
  'Plant Dashboard': 'प्लॅन्ट डॅशबोर्ड',
  'Plant Operations': 'प्लॅन्ट कामे',
  'Material Inward': 'आलेला कच्चा माल',
  'Weighbridge': 'वजन काटा (काटा पावती)',
  'Mix Design': 'मिक्स डिझाइन (ग्रेड)',
  'Batching Sheets': 'काँक्रीट बॅचिंग शीट्स',
  'Delivery Challans': 'डिलिव्हरी चालान',
  'Vehicle Management': 'गाड्यांचे व्यवस्थापन',
  'Driver Trips': 'ड्रायव्हर फेऱ्या (ट्रिप्स)',
  'Diesel Management': 'डिझेल नोंद व स्टॉक',
  'Plant Reports': 'प्लॅन्ट अहवाल',
  'Employees': 'कर्मचारी वर्ग',
  'Plant Crew': 'प्लॅन्ट कामगार',
  'Attendance': 'हजेरी',
  'Daily Attendance': 'दैनंदिन हजेरी',
  'Shift Roster': 'शिफ्ट नियोजन',
  'Shifts & Roster': 'शिफ्ट नियोजन',
  'Daily Work': 'आजचे काम',
  'Leave Reviews': 'सुट्टी अर्ज',
  'Leaves': 'सुट्ट्या',
  'Shifts': 'शिफ्ट',
  'Shift Plan': 'शिफ्ट प्लॅन',
  'Silo Stock': 'सायलो स्टॉक',
  'Reports': 'अहवाल (रिपोर्ट्स)',
  'Payroll Reports': 'पगार अहवाल',
  'Payroll Preparation': 'पगार पत्रक',
  'Directory Records': 'कर्मचारी यादी',
  'Attendance System': 'हजेरी सिस्टीम',
  'Cash Memos & Billing': 'बिलिंग आणि पावत्या',
  'Approvals Hub': 'मंजुरी केंद्र',
  'HR Reports': 'एचआर अहवाल',
  'Documents Vault': 'कागदपत्रे',
  'Audit Logs': 'ऑडिट लॉग्स',
  'Settings': 'सेटिंग्ज',
  'System Administration': 'सिस्टम अ‍ॅडमिन',
  'Admin Portals': 'प्रशासकीय पोर्टल्स',
  'ALL ACCESS': 'सर्व अधिकार',
  'Active': 'सक्रिय',
  'Active Session:': 'चालू सत्र:',
  'Sign Out Session': 'लॉगआउट करा',
  'Sign Out': 'बाहेर पडा',

  // Portals & Roles
  'System Admin Console': 'सिस्टम अ‍ॅडमिन कन्सोल',
  'Plant Manager Portal': 'प्लॅन्ट मॅनेजर पोर्टल',
  'Accounts & Billing': 'अकाउंट्स व बिलिंग',
  'Dispatch Operations': 'गाड्यांचे डिस्पॅच',
  'Quality Control': 'क्वालिटी कंट्रोल (QC)',
  'Site Supervisor': 'साइट सुपरवायझर',
  'Driver Portal': 'ड्रायव्हर पोर्टल',
  'Owner / Director': 'मालक / संचालक',
  'Plant Manager': 'प्लॅन्ट मॅनेजर',
  'Plant Incharge': 'प्लॅन्ट इन्चार्ज',
  'Operator': 'ऑपरेटर',
  'Accountant': 'अकाउंटंट',
  'Dispatcher': 'डिस्पॅचर',
  'Driver': 'ड्रायव्हर',
  'QC Engineer': 'क्वालिटी इंजिनिअर',
  'Admin': 'अ‍ॅडमिन',
  'PLANT OPS': 'प्लॅन्ट कामे',
  'MAIN PLANT #01': 'मुख्य प्लॅन्ट #०१',

  // Common UI Actions & Badges
  'Help': 'मदत',
  'Cancel': 'रद्द करा',
  'Save Details': 'माहिती सेव्ह करा',
  'Next Step': 'पुढील पायरी',
  'Go Back': 'मागे जा',
  'Confirm & Save': 'तपासा आणि सेव्ह करा',
  'Close': 'बंद करा',
  'Done': 'झाले',
  'View Details': 'तपशील पहा',
  'Loading...': 'लोड होत आहे...',
  'Required': 'आवश्यक',
  'Success': 'यशस्वी',
  'Error': 'त्रुटी',
  'Search...': 'शोधा...',
  'All': 'सर्व',
  'Advanced View': 'तांत्रिक डॅशबोर्ड',
  'Simple Mode': 'सोपा मोड',
  'Switch to Simple Guided Mode': 'सोप्या मोडवर जा',
  'Switch to Advanced Technical View': 'तांत्रिक डॅशबोर्ड पहा',
  'Notifications': 'सूचना',
  'Mark all as read': 'सर्व वाचल्याचे चिन्हांकित करा',
  'No notifications': 'कोणत्याही नवीन सूचना नाहीत',
  'User login successfully': 'यशस्वीपणे लॉगिन झाले',
  'Return to Admin Console': 'अ‍ॅडमिन कन्सोलवर परत जा',

  // Step counts & Badges
  '4 Steps': '४ पायऱ्या',
  '3 Steps': '३ पायऱ्या',
  '5 Steps': '५ पायऱ्या',
  '1-Click': '१-क्लिक',
  'Roll Call': 'हजेरी',
  'Live Status': 'लाईव्ह स्थिती',
  'QC Slump': 'क्वालिटी टेस्ट',
  'Summary': 'आजचा आढावा',
  'Primary Plant Actions:': 'दैनंदिन मुख्य कामे:',
  'Click any action to start': 'कामावर दाबा आणि सुरुवात करा',

  // Operational Summaries & Metric terms
  "Today's Operational Summary": 'आजचे एकूण काम',
  'Mixers Away on Road': 'साइटवर गेलेल्या गाड्या',
  'Mixers Returning': 'परत येत असलेल्या गाड्या',
  'Trips Completed': 'पूर्ण झालेल्या फेऱ्या',
  'Today’s Concrete': 'आजचे एकूण काँक्रीट',
  'Live Vehicle Dispatch Status': 'गाड्यांची सद्यस्थिती',
  'Raw Materials Received Today': 'आज आलेला कच्चा माल',
  'Total batched & dispatched': 'एकूण उत्पादन व डिस्पॅच',
  'Delivered safely': 'यशस्वीपणे पोहोचवले',
  'En route to plant yard': 'प्लॅन्टमध्ये परत येत आहे',

  // Statuses
  'Ready': 'तयार',
  'Scheduled': 'नियोजित',
  'Batching': 'बॅचिंग चालू',
  'Batched': 'बॅचिंग पूर्ण',
  'Loading': 'गाडी भरणे चालू',
  'En Route': 'रस्त्यावर',
  'In Transit': 'रस्त्यावर',
  'Departed': 'रवाना झाली',
  'At Site': 'साइटवर',
  'Pouring': 'काँक्रीट ओतणे चालू',
  'Returning': 'परत येत आहे',
  'Completed': 'पूर्ण झाले',
  'Delivered': 'पोहोचवले',
  'Pending': 'प्रलंबित',
  'Approved': 'मंजूर',
  'Rejected': 'नाकारले',
  'Online': 'ऑनलाइन',
  'Offline': 'ऑफलाइन',
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'mr' || saved === 'en') return saved;
    } catch {
      // fallback
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'mr' : 'en'));
  };

  const t = (key, fallback = '') => {
    if (!key) return fallback || '';

    // If language is English, preserve English cleanly
    if (language === 'en') {
      const langDict = TRANSLATIONS.en;
      if (langDict && langDict[key] !== undefined) {
        return langDict[key];
      }
      return fallback || key;
    }

    // If language is Marathi ('mr'):
    // 1. Direct camelCase key from TRANSLATIONS.mr
    if (TRANSLATIONS.mr && TRANSLATIONS.mr[key] !== undefined) {
      return TRANSLATIONS.mr[key];
    }
    // 2. Direct string match in DIRECT_MARATHI_MAP
    if (DIRECT_MARATHI_MAP[key]) {
      return DIRECT_MARATHI_MAP[key];
    }
    // 3. Trimmed string match
    const trimmed = String(key).trim();
    if (DIRECT_MARATHI_MAP[trimmed]) {
      return DIRECT_MARATHI_MAP[trimmed];
    }
    // 4. Fallback in DIRECT_MARATHI_MAP
    if (fallback && DIRECT_MARATHI_MAP[fallback]) {
      return DIRECT_MARATHI_MAP[fallback];
    }
    // 5. If key exists in TRANSLATIONS.en, see if its English value has a Marathi mapping
    if (TRANSLATIONS.en && TRANSLATIONS.en[key] !== undefined) {
      const enVal = TRANSLATIONS.en[key];
      if (DIRECT_MARATHI_MAP[enVal]) {
        return DIRECT_MARATHI_MAP[enVal];
      }
    }

    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key, fallback = '') => fallback || key,
    };
  }
  return ctx;
}

