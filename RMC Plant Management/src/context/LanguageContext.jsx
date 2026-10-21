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
  // Navigation, Sidebar & Portals
  'Navigation': 'मुख्य मेन्यू',
  'Dashboard': 'डॅशबोर्ड',
  'Plant Dashboard': 'प्लॅन्ट डॅशबोर्ड',
  'Plant Operations': 'प्लॅन्ट कामे',
  'Material Inward': 'आलेला कच्चा माल',
  'Weighbridge': 'वजन काटा (काटा पावती)',
  'Mix Design': 'मिक्स डिझाइन (रेसिपी)',
  'Batching Sheets': 'काँक्रीट बॅचिंग शीट्स',
  'Delivery Challans': 'डिलिव्हरी चालान',
  'Vehicle Management': 'गाड्यांचे व्यवस्थापन',
  'Vehicle Fleet': 'प्लॅन्ट वाहने',
  'Vehicles': 'गाड्या',
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
  'Inactive': 'निष्क्रिय',
  'Active Session:': 'चालू सत्र:',
  'Sign Out Session': 'लॉगआउट करा',
  'Sign Out': 'बाहेर पडा',
  'Logout': 'बाहेर पडा',
  'Expand Sidebar': 'मेन्यू उघडा',
  'Collapse Sidebar': 'मेन्यू संकुचित करा',

  // Portals & Roles
  'System Admin Console': 'सिस्टम अ‍ॅडमिन कन्सोल',
  'Plant Manager Portal': 'प्लॅन्ट मॅनेजर पोर्टल',
  'Accounts & Billing': 'अकाउंट्स व बिलिंग',
  'Dispatch Operations': 'गाड्यांचे डिस्पॅच',
  'Quality Control': 'क्वालिटी कंट्रोल (QC)',
  'Site Supervisor': 'साइट सुपरवायझर',
  'Driver Portal': 'ड्रायव्हर पोर्टल',
  'Driver Personal Portal': 'ड्रायव्हर वैयक्तिक पोर्टल',
  'Owner / Director': 'मालक / संचालक',
  'Plant Manager': 'प्लॅन्ट मॅनेजर',
  'Plant Incharge': 'प्लॅन्ट इन्चार्ज',
  'Operator': 'ऑपरेटर',
  'Accountant': 'अकाउंटंट',
  'Dispatcher': 'डिस्पॅचर',
  'Driver': 'ड्रायव्हर',
  'Mixer Driver': 'मिक्सर ड्रायव्हर',
  'QC Engineer': 'क्वालिटी इंजिनिअर',
  'Admin': 'अ‍ॅडमिन',
  'System Admin': 'सिस्टम अ‍ॅडमिन',
  'System Administrator': 'सिस्टम अ‍ॅडमिनिस्ट्रेटर',
  'PLANT OPS': 'प्लॅन्ट कामे',
  'MAIN PLANT #01': 'मुख्य प्लॅन्ट #०१',
  'Main Plant Unit #01': 'मुख्य प्लॅन्ट युनिट #०१',

  // Table Column Headers Across System
  'Order ID': 'ऑर्डर आयडी',
  'Client': 'ग्राहक / पक्ष',
  'Customer': 'ग्राहक',
  'Project': 'प्रकल्प',
  'Client / Project': 'ग्राहक / प्रकल्प',
  'Customer & Project': 'ग्राहक व प्रकल्प',
  'Concrete Grade': 'काँक्रीट ग्रेड',
  'Mix Grade': 'मिक्स ग्रेड',
  'Grade': 'काँक्रीट ग्रेड',
  'Volume': 'प्रमाण (m³)',
  'Qty': 'प्रमाण (m³)',
  'Batch Qty': 'बॅच प्रमाण',
  'Batched Qty': 'तयार प्रमाण (m³)',
  'Target Volume': 'अपेक्षित प्रमाण (m³)',
  'Pour Location': 'ओतण्याचे ठिकाण (साइट)',
  'Site Pour Location': 'साइटचे ठिकाण',
  'Site': 'साइट ठिकाण',
  'Time Window': 'वेळ',
  'Time Slot': 'वेळेचा स्लॉट',
  'Priority': 'प्राधान्यता',
  'Status': 'स्थिती',
  'Actions': 'कृती / पर्याय',
  'Action': 'कृती',
  'Challan No': 'चालान नंबर',
  'Challan Number': 'चालान नंबर',
  'Date & Time': 'दिनांक व वेळ',
  'Transit Mixer & Driver': 'मिक्सर गाडी व ड्रायव्हर',
  'Vehicle & Driver': 'गाडी व ड्रायव्हर',
  'Vehicle No': 'गाडी नंबर',
  'Vehicle Number': 'गाडी नंबर',
  'Vehicle': 'गाडी',
  'Assigned Driver': 'नियुक्त ड्रायव्हर',
  'Driver Name': 'ड्रायव्हरचे नाव',
  'Trip ID': 'फेरी आयडी',
  'Customer & Site': 'ग्राहक व साइट',
  'Grade & Qty': 'ग्रेड व प्रमाण',
  'Current Milestone': 'सध्याची पायरी',
  'Departure / ETA': 'रवानगी / पोहोच वेळ',
  'Inward No': 'आवक क्रमांक',
  'Material Category': 'कच्चा माल',
  'Material': 'कच्चा माल',
  'Supplier / Vendor': 'सप्लायर / पुरवठादार',
  'Supplier': 'पुरवठादार',
  'Vehicle No & Challan': 'गाडी नंबर व चालान',
  'Gross Wt': 'एकूण वजन (Gross)',
  'Gross Weight': 'एकूण वजन (Gross)',
  'Tare Wt': 'रिकामे वजन (Tare)',
  'Tare Weight': 'रिकामे वजन (Tare)',
  'Net Wt': 'निव्वळ वजन (Net)',
  'Net Weight': 'निव्वळ वजन (Net)',
  'Net Quantity': 'निव्वळ प्रमाण (Net)',
  'Storage Silo': 'साठवणूक सायलो',
  'Silo': 'सायलो',
  'Slip No': 'पावती क्र.',
  'Slip Number': 'पावती क्र.',
  'Batch ID': 'बॅच आयडी',
  'Recipe / Grade': 'रेसिपी / ग्रेड',
  'Recipe Code': 'रेसिपी कोड',
  'Water-Cement Ratio': 'पाणी-सिमेंट गुणोत्तर',
  'Target Strength': 'अपेक्षित ताकद',
  'Target Strength (MPa)': 'अपेक्षित ताकद (MPa)',
  'Slump (mm)': 'स्लम्प (मि.मी.)',
  'Slump': 'स्लम्प',
  'Cement': 'सिमेंट',
  'Water': 'पाणी',
  'Sand': 'वाळू',
  'Fly Ash': 'फ्लाय अ‍ॅश',
  'Admixture': 'अ‍ॅडमिक्सर',
  'Log ID': 'नोंद आयडी',
  'Litres Filled': 'भरलेले लिटर',
  'Rate (₹/L)': 'दर (₹/L)',
  'Total Amount (₹)': 'एकूण रक्कम (₹)',
  'Amount': 'रक्कम (₹)',
  'Fuel Station / Tank': 'इंधन पंप / टाकी',
  'Odometer Reading': 'ओडोमीटर रीडिंग',
  'Date': 'दिनांक',
  'Time': 'वेळ',
  'Shift Name': 'शिफ्ट नाव',
  'Timing': 'वेळ',
  'Working Hours': 'कामाचे तास',
  'Grace Period': 'सवलत वेळ',
  'Staff Assigned': 'नियुक्त कर्मचारी',
  'Check In': 'चेक इन',
  'Check Out': 'चेक आउट',
  'Working Time': 'कामाचा वेळ',
  'Overtime': 'ओव्हरटाईम',
  'Document Type': 'कागदपत्र प्रकार',
  'File Name': 'फाईल नाव',
  'Uploaded Date': 'अपलोड दिनांक',
  'Verified': 'पडताळणी झाली',
  'Party Name': 'पक्षाचे नाव',
  'Emp ID': 'कर्मचारी आयडी',
  'Full Name': 'पूर्ण नाव',
  'Name': 'नाव',
  'Salary': 'पगार',
  'Monthly Salary': 'मासिक पगार (₹)',
  'Monthly Basic Salary': 'मासिक मूळ पगार',
  'Shift': 'शिफ्ट',
  'Phone': 'फोन नंबर',
  'Mobile': 'मोबाईल',
  'Work Email': 'ईमेल',
  'Email': 'ईमेल',
  'Address': 'पत्ता',
  'Plant': 'प्लॅन्ट',
  'Employment Type': 'कामाचे स्वरूप',
  'Make/Model': 'मेक / मॉडेल',
  'Chassis / Model': 'चेसिस / मॉडेल',
  'Drum Capacity': 'ड्रम क्षमता',
  'Vehicle Type': 'गाडी प्रकार',

  // Buttons & Interactive Action Controls
  'Add Employee': 'नवीन कर्मचारी जोडा',
  '+ Add Employee': '+ नवीन कर्मचारी जोडा',
  'Add Vehicle': 'गाडी जोडा',
  '+ Add Vehicle': '+ नवीन गाडी जोडा',
  '+ Register First Vehicle': '+ पहिली गाडी नोंदवा',
  'Save Vehicle': 'गाडी सेव्ह करा',
  'Delete Vehicle': 'गाडी काढा',
  'Create Challan': 'चालान बनवा',
  '+ Create Challan': '+ नवीन चालान बनवा',
  '+ New Challan': '+ नवीन चालान बनवा',
  'Print Challan': 'चालान प्रिंट करा',
  'Record Inward': 'कच्चा माल नोंदवा',
  '+ Record Inward': '+ कच्चा माल नोंदवा',
  '+ New Inward': '+ नवीन आवक नोंद',
  'New Weighment': 'नवीन वजन नोंद',
  '+ New Weighment': '+ नवीन वजन नोंदवा',
  'Save Weighment': 'वजन सेव्ह करा',
  'Record 2nd Tare Weight': 'दुसरे रिकामे वजन नोंदवा',
  'Print Weigh Slip': 'काटा पावती प्रिंट करा',
  'New Batch': 'नवीन काँक्रीट बॅच',
  '+ New Batch': '+ नवीन बॅच तयार करा',
  'Start Batching': 'बॅचिंग सुरू करा',
  'New Trip': 'नवीन फेरी',
  '+ New Trip': '+ नवीन फेरी सुरू करा',
  'Start Trip': 'गाडी रवाना करा',
  '+ New Mix Design': '+ नवीन मिक्स रेसिपी',
  'New Mix Design': 'नवीन मिक्स डिझाईन',
  '+ New Order': '+ नवीन ऑर्डर नोंदवा',
  'New Order': 'नवीन ऑर्डर',
  '+ Add Plant / Branch': '+ नवीन प्लॅन्ट / शाखा जोडा',
  'Add Plant / Branch': 'प्लॅन्ट / शाखा जोडा',
  'Edit Profile': 'प्रोफाईल बदला',
  'View Dossier': 'माहिती पहा',
  'Permanently Delete Employee': 'कर्मचारी कायमचा काढा',
  'Delete Employee': 'कर्मचारी काढा',
  'Copy Credentials': 'लॉगिन माहिती कॉपी करा',
  'Auto Generate': 'आपोआप तयार करा',
  'Reveal': 'दाखवा',
  'Hide': 'लपवा',
  'Save': 'सेव्ह करा',
  'Save Details': 'माहिती सेव्ह करा',
  'Update': 'अपडेट करा',
  'Submit': 'सादर करा',
  'Confirm': 'खात्री करा',
  'Confirm & Save': 'तपासा आणि सेव्ह करा',
  'Cancel': 'रद्द करा',
  'Close': 'बंद करा',
  'Done': 'झाले (Done)',
  'Next': 'पुढे',
  'Next Step': 'पुढील पायरी',
  'Back': 'मागे',
  'Go Back': 'मागे जा',
  'Previous': 'मागे',
  'Help': 'मदत',
  'Search': 'शोधा',
  'Search...': 'शोधा...',
  'Search records...': 'नोंदी शोधा...',
  'Filter': 'फिल्टर',
  'Clear': 'पुसा',
  'Clear All': 'सर्व पुसा',
  'Clear Search': 'शोध रद्द करा',
  'Refresh': 'रिफ्रेश करा',
  'Download': 'डाउनलोड',
  'Export CSV': 'CSV डाउनलोड करा',
  'Export PDF': 'PDF डाउनलोड करा',
  'Print': 'प्रिंट करा',
  'View Details': 'तपशील पहा',
  'Details': 'तपशील',
  'Approve': 'मंजूर करा',
  'Reject': 'नाकारले',
  'Mark all read': 'सर्व वाचल्याचे नोंदवा',
  'Mark all as read': 'सर्व वाचल्याचे नोंदवा',
  'Fullscreen': 'फुलस्क्रीन',
  'Exit Fullscreen': 'फुलस्क्रीन बंद करा',

  // Pagination & DataTable
  'Showing': 'दाखवत आहे',
  'to': 'ते',
  'of': 'पैकी',
  'records': 'नोंदी',
  'Per page:': 'प्रति पान:',
  'No records located': 'कोणतीही नोंद सापडली नाही',
  'No matching records found.': 'जुळणारी कोणतीही नोंद सापडली नाही.',
  'Try clearing or refining search terms': 'शोध शब्द तपासा किंवा बदला',
  'No Employee Records Registered': 'कोणताही कर्मचारी नोंदवलेला नाही',
  'No Fleet Vehicles Found': 'कोणतीही गाडी उपलब्ध नाही',

  // Dropdown & Filter Options
  'All': 'सर्व',
  'All Plants': 'सर्व प्लॅन्ट',
  'All Roles': 'सर्व भूमिका',
  'All Departments': 'सर्व विभाग',
  'All Statuses': 'सर्व स्थिती',
  'All Shifts': 'सर्व शिफ्ट',
  'Filter by Plant': 'प्लॅन्टनुसार फिल्टर',
  'Filter by Role': 'भूमिकेनुसार फिल्टर',
  'Filter by Department': 'विभागानुसार फिल्टर',
  'Filter by Status': 'स्थितीनुसार फिल्टर',
  'Full Time Permanent': 'पूर्ण वेळ कायमस्वरूपी',
  'Contract Basis': 'कंत्राटी पद्धत',
  'Trainee': 'प्रशिक्षणार्थी',
  'General Shift': 'जनरल शिफ्ट',
  'Morning Shift': 'सकाळची शिफ्ट',
  'Evening Shift': 'दुपारची शिफ्ट',
  'Night Shift': 'रात्र शिफ्ट',
  '-- Select from workforce --': '-- कर्मचाऱ्यांमधून निवडा --',
  '-- Select Vehicle --': '-- गाडी निवडा --',
  '-- Select Driver --': '-- ड्रायव्हर निवडा --',
  '-- Select Mix Grade --': '-- काँक्रीट ग्रेड निवडा --',
  '-- Select Customer --': '-- ग्राहक निवडा --',

  // Statuses & Badges
  'Ready': 'तयार',
  'Scheduled': 'नियोजित',
  'Batching': 'बॅचिंग चालू',
  'Batched': 'बॅचिंग पूर्ण',
  'Loading': 'गाडी भरणे चालू',
  'En Route': 'रस्त्यावर',
  'In Transit': 'रस्त्यावर',
  'On Road': 'रस्त्यावर',
  'Departed': 'रवाना झाली',
  'At Site': 'साइटवर पोहोचली',
  'Pouring': 'काँक्रीट ओतणे चालू',
  'Returning': 'परत येत आहे',
  'Completed': 'पूर्ण झाले',
  'Delivered': 'पोहोचवले',
  'Pending': 'प्रलंबित',
  'Pending Approval': 'मंजुरी प्रलंबित',
  'Pending Registration': 'नोंदणी प्रलंबित',
  'Approved': 'मंजूर',
  'Rejected': 'नाकारले',
  'Online': 'ऑनलाइन',
  'Offline': 'ऑफलाइन',
  'Normal': 'सामान्य',
  'High': 'उच्च',
  'Urgent': 'तातडीचे',
  'Low': 'कमी',
  'Present': 'हजर',
  'Absent': 'गैरहजर',
  'Half Day': 'अर्धा दिवस',
  'Leave': 'सुट्टी',
  'Paid': 'भरले',
  'Unpaid': 'शिल्लक',
  'Overdue': 'थकबाकी',
  'Success': 'यशस्वी',
  'Error': 'त्रुटी',
  'Warning': 'चेतावणी',
  'Required': 'आवश्यक',
  'Loading...': 'माहिती लोड होत आहे...',
  'Unassigned': 'अनियुक्त',

  // Header, Company Picker & Session Controls
  'Select Active Plant / Business': 'चालू प्लॅन्ट / शाखा निवडा',
  'Switch active business node or manage plant locations': 'प्लॅन्ट शाखा निवडा किंवा व्यवस्थापित करा',
  'Enterprise Master Node': 'मुख्य प्रशासकीय केंद्र',
  'Active Plant Unit': 'सक्रिय प्लॅन्ट युनिट',
  'Edit Plant Details': 'प्लॅन्ट माहिती बदला',
  'Delete Plant Node': 'प्लॅन्ट शाखा काढा',
  'Add New Plant or Node': 'नवीन प्लॅन्ट शाखा जोडा',
  'Notifications': 'सूचना',
  'No notifications': 'कोणत्याही नवीन सूचना नाहीत',
  'new': 'नवीन',
  'Return to Admin Console': 'अ‍ॅडमिन कन्सोलवर परत जा',
  'User login successfully': 'यशस्वीपणे लॉगिन झाले',
  'Welcome back': 'पुन्हा स्वागत आहे',
  'Daily Login Credentials': 'दैनंदिन लॉगिन माहिती',
  'Assigned Username': 'नियुक्त युझरनेम',
  'Assigned Password': 'नियुक्त पासवर्ड',
  'Password': 'पासवर्ड',
  'Username': 'युझरनेम',

  // 8 Primary Action Cards (Simple Mode)
  'Receive Materials': 'आलेला कच्चा माल नोंदवा',
  'Make Concrete': 'काँक्रीट तयार करा (बॅचिंग)',
  'Send Vehicle to Site': 'गाडी साइटवर पाठवा (चालान)',
  'Record Vehicle Return': 'गाडी परत आली (वापसी नोंद)',
  'Driver Attendance': 'ड्रायव्हर / कामगार हजेरी',
  'Check Vehicle Status': 'गाड्यांची स्थिती पहा',
  'Record Quality Test': 'काँक्रीट क्वालिटी टेस्ट',
  "View Today's Work": 'आजचे एकूण काम पहा',
  'Primary Plant Actions:': 'दैनंदिन मुख्य कामे:',
  'Click any action to start': 'कामावर दाबा आणि सुरुवात करा',
  '4 Steps': '४ पायऱ्या',
  '3 Steps': '३ पायऱ्या',
  '5 Steps': '५ पायऱ्या',
  '1-Click': '१-क्लिक',
  'Roll Call': 'हजेरी',
  'Live Status': 'लाईव्ह स्थिती',
  'QC Slump': 'क्वालिटी टेस्ट',
  'Summary': 'आजचा आढावा',

  // KPI & Dashboard Metrics
  "Today's Operational Summary": 'आजचे एकूण कामकाज',
  "Today's Live Plant Activity:": 'आजचे लाईव्ह कामकाज:',
  'Active Mixers': 'रस्त्यावरील गाड्या',
  'Mixers Away on Road': 'साइटवर गेलेल्या गाड्या',
  'Mixers Returning': 'परत येत असलेल्या गाड्या',
  'Trips Completed': 'पूर्ण झालेल्या फेऱ्या',
  'Today’s Concrete': 'आजचे एकूण काँक्रीट',
  'Concrete Dispatched': 'काँक्रीट पाठवले',
  'Materials Inward': 'कच्चा माल आला',
  'Raw Materials Received Today': 'आज आलेला कच्चा माल',
  'Live Vehicle Dispatch Status': 'गाड्यांची सद्यस्थिती',
  'Total batched & dispatched': 'एकूण उत्पादन व डिस्पॅच',
  'Delivered safely': 'यशस्वीपणे पोहोचवले',
  'En route to plant yard': 'प्लॅन्टमध्ये परत येत आहे',
  'View Full Summary': 'पूर्ण तपशील पहा',
  'Full Summary': 'पूर्ण तपशील',
  'Advanced View': 'तांत्रिक डॅशबोर्ड',
  'Simple Mode': 'सोपा मोड',
  'Switch to Simple Guided Mode': 'सोप्या मोडवर जा',
  'Switch to Advanced Technical View': 'तांत्रिक डॅशबोर्ड पहा',

  // Vehicle Management Form & Details
  'Transit Mixer & Concrete Pump Fleet': 'काँक्रीट मिक्सर व पंप वाहने',
  'Fleet management, drum capacity, assigned drivers, and live status': 'वाहन व्यवस्थापन, ड्रम क्षमता, ड्रायव्हर आणि लाईव्ह स्थिती',
  'Search vehicle, driver...': 'गाडी, ड्रायव्हर शोधा...',
  'Register New Vehicle': 'नवीन गाडी नोंदवा',
  'Add a new transit mixer to plant fleet': 'प्लॅन्टसाठी नवीन काँक्रीट मिक्सर गाडी जोडा',
  'Vehicle Number (RTO) *': 'गाडी नंबर (RTO) *',
  'Vehicle Type:': 'गाडीचा प्रकार:',
  'Drum Capacity (m3) *': 'ड्रम क्षमता (m³) *',
  'Or custom m3:': 'किंवा इतर m³:',
  'Assigned Driver:': 'नियुक्त ड्रायव्हर:',
  'Chassis / Model (Optional):': 'मॉडेल / चेसिस (पर्यायी):',
  'Make/Model:': 'मेक / मॉडेल:',
  'Drum Capacity:': 'ड्रम क्षमता:',
  'Driver:': 'ड्रायव्हर:',

  // Company Workspaces & Navigation
  'Company Workspaces': 'कंपनी कार्यक्षेत्रे',
  'Company': 'कंपनी',
  'Companies': 'कंपन्या',
  'Add New Company Workspace': 'नवीन कंपनी कार्यक्षेत्र जोडा',
  'Register New Company Workspace': 'नवीन कंपनी कार्यक्षेत्र नोंदवा',
  'Create an independent enterprise company entity with its own branding, plants, and workforce.': 'स्वतंत्र कंपनी, ब्रँडिंग, प्लॅन्ट आणि कर्मचारी युनिट तयार करा.',
  'Company Name': 'कंपनी नाव',
  'Company Name *': 'कंपनीचे नाव *',
  'Company Short Code': 'कंपनी संक्षिप्त कोड',
  'Company Short Code (optional)': 'कंपनी संक्षिप्त कोड (पर्यायी)',
  'Business Type': 'व्यवसाय प्रकार',
  'Headquarters / Location': 'मुख्यालय / पत्ता',
  'Production Capacity': 'उत्पादन क्षमता',
  'Company Logo Icon (Optional)': 'कंपनी लोगो चिन्ह (पर्यायी)',
  'Upload Logo': 'लोगो अपलोड करा',
  'Company Brand Logo': 'कंपनी ब्रँड लोगो',
  'Save Company Changes': 'बदल सेव्ह करा',
  'Confirm Company Deletion': 'कंपनी काढण्याची खात्री करा',
  'Are you sure you want to delete this company?': 'आपल्याला ही कंपनी खरोखर काढायची आहे का?',
  'Yes, Delete Company': 'होय, कंपनी काढा',
  'Company Settings': 'कंपनी सेटिंग्ज',
  'Manage company profile and brand logo icon': 'कंपनी प्रोफाइल आणि ब्रँड लोगो व्यवस्थापित करा',
  'Sign Out': 'लॉग आउट',
  'Sign Out of active session': 'चालू सेशनमधून बाहेर पडा',
  'Search name, ID, phone, email...': 'नाव, आयडी, फोन, ईमेल शोधा...',
  'Search by vehicle, challan, customer...': 'गाडी, चालान, ग्राहक शोधा...',
  'Search vehicle, driver, challan...': 'गाडी, ड्रायव्हर, चालान शोधा...',
  'Search challan no, customer, vehicle...': 'चालान क्र., ग्राहक, गाडी शोधा...',
  'Search material, supplier, vehicle...': 'कच्चा माल, पुरवठादार, गाडी शोधा...',
  'Search order no, customer, grade...': 'ऑर्डर क्र., ग्राहक, ग्रेड शोधा...',

  // Telemetry & Metrics Modal
  'Detailed Metrics & Telemetry': 'तपशीलवार मेट्रिक्स आणि टेलिमेट्री',
  'Real-time KPI breakdown and SCADA synchronized parameters': 'रिअल-टाइम मेट्रिक्स आणि स्काडा सिंक्रोनाइझेशन',
  'Current Metric Value': 'सध्याचे मूल्य',
  'Trend Status': 'कल स्थिती',
  'Active Telemetry': 'सक्रिय टेलिमेट्री',
  'SCADA Sync Time': 'स्काडा सिंक वेळ',
  'Sub-system Breakdown': 'उप-प्रणाली विश्लेषण',
  'Close Pop-Up': 'पॉप-अप बंद करा',

  // Workforce Management View
  'Workforce Roster': 'कर्मचारी यादी',
  'Manage employees, staff credentials, roles, shifts, and salary details': 'कर्मचारी, लॉगिन तपशील, भूमिका, शिफ्ट आणि पगार व्यवस्थापन',
  'Total Employees': 'एकूण कर्मचारी',
  'Active on Duty': 'कामावर उपस्थित',
  'Drivers & Operators': 'ड्रायव्हर व ऑपरेटर',
  'Monthly Payroll': 'मासिक पगार खर्च',
  'Add New Employee': 'नवीन कर्मचारी नोंदवा',
  'Register plant staff, drivers, operators & system users': 'प्लॅन्ट कर्मचारी, ड्रायव्हर, ऑपरेटर व युझर्स नोंदवा',
  'Employee Dossier': 'कर्मचारी संपूर्ण तपशील',
  'Detailed profile, contact information, credentials, and employment records': 'सविस्तर प्रोफाइल, संपर्क माहिती, क्रेडेंशियल्स आणि रोजगार नोंदी',
  'Edit Employee': 'कर्मचारी माहिती बदला',
  'Update employee profile, shift allocation, contact details and salary': 'कर्मचारी प्रोफाइल, शिफ्ट, संपर्क आणि पगार अपडेट करा',
  'Delete Employee Confirmation': 'कर्मचारी काढण्याची खात्री',
  'Are you sure you want to permanently delete this employee record?': 'आपण खरोखर हा कर्मचारी रेकॉर्ड कायमचा काढू इच्छिता?',
  'This action cannot be undone. All shift assignments, login credentials, and attendance records associated with this employee will be lost.': 'ही क्रिया पूर्ववत करता येणार नाही. या कर्मचाऱ्याशी संबंधित सर्व शिफ्ट, लॉगिन आणि हजेरी नोंदी हटवल्या जातील.',
  'Plant Facility': 'प्लॅन्ट युनिट',
  'Workforce Designation': 'पद / भूमिका',
  'Assigned Shift': 'नेमून दिलेली शिफ्ट',
  'Employee ID (Auto-Generated)': 'कर्मचारी आयडी (स्वयंचलित)',
  'Employment Basis': 'कामाचे स्वरूप',
  'Contact Number (Phone)': 'संपर्क क्रमांक (फोन)',
  'Active Work Email': 'ईमेल पत्ता',
  'Residential Address': 'राहण्याचा पत्ता',
  'Monthly Basic Salary (INR)': 'मासिक मूळ पगार (₹)',
  'Save Employee Details': 'कर्मचारी तपशील सेव्ह करा',
  'Register Employee': 'कर्मचारी नोंदणी करा',
  'Save Changes': 'बदल सेव्ह करा',
  'View Live Fleet': 'वाहने पहा',
  'Fleet Status': 'वाहनांची स्थिती',
  'Create New Challan': 'नवीन चालान बनवा',
  'Record Inward Material': 'आलेला कच्चा माल नोंदवा',
  'Dispatch Mixer': 'गाडी रवाना करा',
  'Dispatched Mixers': 'रवाना झालेल्या गाड्या',
  'Available Fleet': 'प्लॅन्टमधील उपलब्ध गाड्या',
  'Maintenance / Workshop': 'दुरुस्ती / गॅरेज',
  'Total Fleet Size': 'एकूण वाहने',
};

// Precomputed lowercase map for ultra-fast, case-insensitive translation lookups
const LOWER_MARATHI_MAP = Object.keys(DIRECT_MARATHI_MAP).reduce((acc, k) => {
  acc[k.toLowerCase().trim()] = DIRECT_MARATHI_MAP[k];
  return acc;
}, {});

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

  /**
   * Universal translation resolver:
   * Handles direct keys, camelCase keys, exact strings, trimmed strings,
   * case-insensitive variations, prefixes ('+ ', '• '), and colons.
   */
  const t = (key, fallback = '') => {
    if (!key && key !== 0) return fallback || '';
    if (typeof key !== 'string') return key;

    // If language is English, return English cleanly
    if (language === 'en') {
      const langDict = TRANSLATIONS.en;
      if (langDict && langDict[key] !== undefined) {
        return langDict[key];
      }
      return fallback || key;
    }

    // Language is Marathi ('mr'):
    // 1. Direct key from TRANSLATIONS.mr
    if (TRANSLATIONS.mr && TRANSLATIONS.mr[key] !== undefined) {
      return TRANSLATIONS.mr[key];
    }

    // 2. Exact match in DIRECT_MARATHI_MAP
    if (DIRECT_MARATHI_MAP[key]) {
      return DIRECT_MARATHI_MAP[key];
    }

    // 3. Trimmed match
    const trimmed = key.trim();
    if (DIRECT_MARATHI_MAP[trimmed]) {
      return DIRECT_MARATHI_MAP[trimmed];
    }

    // 4. Case-insensitive lookup
    const lowerKey = trimmed.toLowerCase();
    if (LOWER_MARATHI_MAP[lowerKey]) {
      return LOWER_MARATHI_MAP[lowerKey];
    }

    // 5. Handling '+ ' prefix (e.g. '+ Add Employee' -> '+ नवीन कर्मचारी जोडा')
    if (trimmed.startsWith('+ ')) {
      const core = trimmed.slice(2).trim();
      const translatedCore = DIRECT_MARATHI_MAP[core] || LOWER_MARATHI_MAP[core.toLowerCase()];
      if (translatedCore) {
        return `+ ${translatedCore}`;
      }
    }

    // 6. Handling trailing colon ':' (e.g. 'Status:' -> 'स्थिती:')
    if (trimmed.endsWith(':')) {
      const core = trimmed.slice(0, -1).trim();
      const translatedCore = DIRECT_MARATHI_MAP[core] || LOWER_MARATHI_MAP[core.toLowerCase()];
      if (translatedCore) {
        return `${translatedCore}:`;
      }
    }

    // 7. Check fallback string
    if (fallback) {
      const trimmedFb = fallback.trim();
      if (DIRECT_MARATHI_MAP[trimmedFb]) {
        return DIRECT_MARATHI_MAP[trimmedFb];
      }
      if (LOWER_MARATHI_MAP[trimmedFb.toLowerCase()]) {
        return LOWER_MARATHI_MAP[trimmedFb.toLowerCase()];
      }
    }

    // 8. If key exists in TRANSLATIONS.en, see if its English value has a Marathi mapping
    if (TRANSLATIONS.en && TRANSLATIONS.en[key] !== undefined) {
      const enVal = TRANSLATIONS.en[key];
      if (DIRECT_MARATHI_MAP[enVal]) {
        return DIRECT_MARATHI_MAP[enVal];
      }
      if (LOWER_MARATHI_MAP[enVal.trim().toLowerCase()]) {
        return LOWER_MARATHI_MAP[enVal.trim().toLowerCase()];
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

