import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'mm';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.invoices': 'Invoices & Slips',
        'nav.statements': 'Bank Statements',
        'nav.reconciliation': '3-Way Reconciliation',
        'nav.governance': 'Auditor Governance',
        'nav.governance_dashboard': 'Governance Dashboard',
        'nav.invoices_master': 'Invoices Master',
        'nav.bank_ledger': 'Bank Ledger',
        'nav.audit_workbench': '3-Way Audit Workbench',
        'nav.fraud_blacklist': 'Fraud & Blacklist',
        'nav.official_audit_report': 'Official Audit Report',
        'nav.audit_report': 'Audit Report',
        'nav.simulation': 'Simulation Studio',
        'nav.simulation_lab': '🧪 Demo Simulation Lab',
        'nav.profile': 'Profile Settings',
        'nav.public_portal': 'Public Portal',
        'nav.logout': 'Log Out',
        'nav.signed_in_as': 'Signed in as',

        // Roles
        'role.admin': 'Chief Auditor',
        'role.accountant': 'Finance Officer',
        'role.customer': 'Merchant Payer',

        // Match Types & Statuses
        'status.exact_match': 'Exact Match',
        'status.fee_adjusted_match': 'Fee Adjusted',
        'status.fuzzy_match': 'Fuzzy Match',
        'status.tampered_fraud': 'Tampered Fraud',
        'status.duplicate_id_fraud': 'Duplicate ID Fraud',
        'status.amount_mismatch_fraud': 'Amount Mismatch Fraud',
        'status.suspense': 'Suspense Ledger',
        'status.auto_approved': 'Auto Approved',
        'status.pending_review': 'Pending Review',
        'status.rejected_fraud': 'Rejected Fraud',
        'status.resolved': 'Resolved',
        'status.unpaid': 'Unpaid',
        'status.paid': 'Paid',
        'status.pending_verification': 'Pending Verification',
        'status.reconciled': 'Reconciled',

        // Core Actions
        'action.run_reconciliation': 'Run Reconciliation Engine',
        'action.upload_csv': 'Upload Bank Statement CSV',
        'action.scan_slip': 'Scan & Analyze Slip',
        'action.approve': 'Approve Match',
        'action.reject': 'Reject Discrepancy',
        'action.clear_unblock': 'Clear & Unblock',
        'action.submit_appeal': 'Submit Appeal to Compliance',
        'action.export_pdf': 'Official PDF Audit Report',
        'action.mark_all_read': 'Mark all as read',
        'action.search': 'Search',
        'action.filter': 'Filter',
        'action.reset': 'Reset',
        'action.back': 'Back',
        'action.cancel': 'Cancel',
        'action.save': 'Save',
        'action.view_details': 'View Details',
        'action.download': 'Download',

        // Compliance Banner
        'banner.account_restricted': 'Account Restricted by Compliance & Fraud Prevention',
        'banner.slip_blocked': 'SLIP UPLOADS BLOCKED',
        'banner.contact_support': 'Contact Customer Service / Submit Appeal →',
        'banner.hotline': 'Hotline',
        'banner.email': 'Email',

        // Notification & General
        'general.notifications': 'Account Notifications',
        'general.no_notifications': 'No notifications yet.',
    },
    mm: {
        // Navigation (Crisp & Single-line)
        'nav.dashboard': 'ဒက်ရှ်ဘုတ်',
        'nav.invoices': 'ငွေတောင်းခံလွှာ',
        'nav.statements': 'ဘဏ်စာရင်း',
        'nav.reconciliation': 'စာရင်းတိုက်စစ်',
        'nav.governance': 'စာရင်းစစ်စီမံခန့်ခွဲမှု',
        'nav.governance_dashboard': 'ကြီးကြပ်မှု ဒက်ရှ်ဘုတ်',
        'nav.invoices_master': 'ငွေတောင်းခံလွှာအားလုံး',
        'nav.bank_ledger': 'ဘဏ်စာရင်းချုပ်',
        'nav.audit_workbench': 'စာရင်းတိုက်စစ်',
        'nav.fraud_blacklist': 'လိမ်လည်မှုစောင့်ကြည့်ရေး',
        'nav.official_audit_report': 'တရားဝင်အစီရင်ခံစာ',
        'nav.audit_report': 'အစီရင်ခံစာ',
        'nav.simulation': 'စမ်းသပ်ထုတ်လုပ်ရေး',
        'nav.simulation_lab': '🧪 စမ်းသပ်ထုတ်လုပ်ရေး ဓာတ်ခွဲခန်း',
        'nav.profile': 'ပရိုဖိုင်ဆက်တင်များ',
        'nav.public_portal': 'ပင်မစာမျက်နှာသို့',
        'nav.logout': 'အကောင့်ထွက်မည်',
        'nav.signed_in_as': 'အကောင့်ဝင်ထားသူ',

        // Roles
        'role.admin': 'အကြီးတန်း စာရင်းစစ်မှူး',
        'role.accountant': 'ဘဏ္ဍာရေး အရာရှိ',
        'role.customer': 'ငွေပေးချေသူ မိတ်ဖက်',

        // Match Types & Statuses
        'status.exact_match': 'အတိအကျကိုက်ညီ',
        'status.fee_adjusted_match': 'ဝန်ဆောင်ခ ညှိနှိုင်းကိုက်ညီ',
        'status.fuzzy_match': 'အနီးစပ်ဆုံးကိုက်ညီ',
        'status.tampered_fraud': 'လိမ်လည်ပြင်ဆင်ထားသော ပြေစာအတု',
        'status.duplicate_id_fraud': 'ထပ်ခါတလဲလဲသုံးထားသော ပြေစာအတု',
        'status.amount_mismatch_fraud': 'ငွေပမာဏကွဲလွဲမှု လိမ်လည်မှု',
        'status.suspense': 'မစစ်ဆေးရသေးသော စာရင်း',
        'status.auto_approved': 'အလိုအလျောက် အတည်ပြုပြီး',
        'status.pending_review': 'ပြန်လည်စစ်ဆေးရန် ဆိုင်းငံ့',
        'status.rejected_fraud': 'လိမ်လည်မှုအဖြစ် ပယ်ချပြီး',
        'status.resolved': 'ဖြေရှင်းပြီး',
        'status.unpaid': 'ငွေမချေရသေး',
        'status.paid': 'ငွေချေပြီး',
        'status.pending_verification': 'စစ်ဆေးရန် ဆိုင်းငံ့',
        'status.reconciled': 'စာရင်းတိုက်ဆိုင်ပြီး',

        // Core Actions
        'action.run_reconciliation': 'စာရင်းတိုက်ဆိုင်စစ်ဆေးမည်',
        'action.upload_csv': 'ဘဏ် CSV ဖိုင်တင်မည်',
        'action.scan_slip': 'ပြေစာ စကန်ဖတ်စစ်ဆေးမည်',
        'action.approve': 'အတည်ပြုမည်',
        'action.reject': 'ပယ်ချမည်',
        'action.clear_unblock': 'ပိတ်ပင်မှု ပယ်ဖျက်မည်',
        'action.submit_appeal': 'အယူခံလွှာတင်မည်',
        'action.export_pdf': 'တရားဝင် စာရင်းစစ် PDF ထုတ်ယူမည်',
        'action.mark_all_read': 'အားလုံးဖတ်ပြီးမှတ်မည်',
        'action.search': 'ရှာဖွေမည်',
        'action.filter': 'စစ်ထုတ်မည်',
        'action.reset': 'မူလအတိုင်းထားမည်',
        'action.back': 'နောက်သို့',
        'action.cancel': 'မလုပ်တော့ပါ',
        'action.save': 'သိမ်းဆည်းမည်',
        'action.view_details': 'အသေးစိတ်ကြည့်မည်',
        'action.download': 'ဒေါင်းလုဒ်ရယူမည်',

        // Compliance Banner
        'banner.account_restricted': 'စည်းမျဉ်းလိုက်နာမှုနှင့် လိမ်လည်မှုကာကွယ်ရေးအရ အကောင့်ကို ကန့်သတ်ထားပါသည်',
        'banner.slip_blocked': 'ပြေစာတင်ခွင့် ပိတ်ထားသည်',
        'banner.contact_support': 'ဖောက်သည်ဝန်ဆောင်မှုသို့ ဆက်သွယ်ရန် / အယူခံတင်ရန် →',
        'banner.hotline': 'ဖုန်းလိုင်း',
        'banner.email': 'အီးမေးလ်',

        // Notification & General
        'general.notifications': 'အကောင့် အသိပေးချက်များ',
        'general.no_notifications': 'အသိပေးချက် မရှိသေးပါ။',
    },
};

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    toggleLanguage: () => {},
    t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        try {
            const saved = localStorage.getItem('reconguard_lang') as Language;
            if (saved === 'mm' || saved === 'en') {
                setLanguageState(saved);
            }
        } catch (e) {
            // fallback
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('reconguard_lang', lang);
        } catch (e) {
            // ignore
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'mm' : 'en');
    };

    const t = (key: string, fallback?: string): string => {
        const langMap = translations[language] || translations.en;
        return langMap[key] || translations.en[key] || fallback || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
