import React from 'react';
import { useLanguage } from '@/Contexts/LanguageContext';

interface Props {
    show: boolean;
    onClose: () => void;
}

export default function PrivacyPolicyModal({ show, onClose }: Props) {
    const { language } = useLanguage();
    const isMm = language === 'mm';

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
            <div
                className="w-full max-w-2xl my-8 rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-left animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-500/20">
                            🛡️
                        </span>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {isMm ? 'ReconGuard ၏ ကိုယ်ရေးအချက်အလက်နှင့် လုံခြုံရေး မူဝါဒ' : 'ReconGuard Privacy Policy & Data Compliance'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                {isMm ? 'ဘဏ္ဍာရေး စည်းမျဉ်းလိုက်နာမှု • လျှို့ဝှက်ချက် ထိန်းသိမ်းရေး' : 'FinTech Security Standard • AML & Bank Data Protection'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg text-sm transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Content Area */}
                <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 overflow-y-auto pr-1 leading-relaxed">
                    {/* Section 1 */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                            <span>🔐</span>
                            {isMm ? '၁။ ဘဏ်အဆင့် လျှို့ဝှက်ကုဒ်စနစ်နှင့် ဒေတာလုံခြုံရေး' : '1. Bank-Grade Encryption & Data Storage'}
                        </div>
                        <p>
                            {isMm
                                ? 'ReconGuard စနစ်အတွင်း သိမ်းဆည်းထားသော ငွေစာရင်းများ၊ ဘဏ် Statement CSV ဖိုင်များနှင့် ငွေပေးချေမှုမှတ်တမ်းအားလုံးကို AES-256 Encryption ဖြင့် လုံခြုံစွာ သိမ်းဆည်းပြီး TLS 1.3 လုံခြုံရေးလမ်းကြောင်းမှတစ်ဆင့်သာ လွှဲပြောင်းပေးပါသည်။'
                                : 'All ledger records, bank statement CSVs, and transaction metadata ingested into ReconGuard are encrypted at rest with AES-256 and transmitted exclusively over secure TLS 1.3 channels.'}
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                            <span>🚫</span>
                            {isMm ? '၂။ ပြင်ပအဖွဲ့အစည်းများနှင့် မည်သည့်ဒေတာမျှ မျှဝေခြင်းမပြုခြင်း' : '2. Zero Third-Party Commercial Data Sharing'}
                        </div>
                        <p>
                            {isMm
                                ? 'အသုံးပြုသူများနှင့် ကုန်သည်များ၏ ဘဏ္ဍာရေးစာရင်းအချက်အလက်များကို မည်သည့် ကြော်ငြာကုမ္ပဏီ သို့မဟုတ် ပြင်ပပွဲစားများထံသို့မျှ ရောင်းချခြင်း၊ လွှဲပြောင်းပေးခြင်း လုံးဝ မပြုလုပ်ပါ။ ဒေတာများကို စာရင်းတိုက်ဆိုင်စစ်ဆေးခြင်း ရည်ရွယ်ချက်တစ်ခုတည်းအတွက်သာ အသုံးပြုပါသည်။'
                                : 'ReconGuard does not sell, lease, or broker customer financial data, bank statements, or transaction identifiers to third-party ad networks, data brokers, or marketing intermediaries under any circumstance.'}
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                            <span>📸</span>
                            {isMm ? '၃။ ပြေစာပုံရိပ် လက်ဗွေစနစ် (SHA-256) နှင့် စစ်ဆေးရေးနည်းပညာ' : '3. Cryptographic Receipt Fingerprinting & Forensics'}
                        </div>
                        <p>
                            {isMm
                                ? 'ငွေလွှဲပြေစာ ဓာတ်ပုံများကို တင်သွင်းရာတွင် SHA-256 Cryptographic Hash ဖြင့် လက်ဗွေရယူပြီး ပြေစာအဟောင်း ပြန်လည်အသုံးပြုခြင်းနှင့် Photoshop ပြင်ဆင်ထားသော EXIF အချက်အလက်များကို စာရင်းလိမ်လည်မှုမှ ကာကွယ်ရန်သာ စစ်ဆေးအသုံးပြုပါသည်။'
                                : 'Receipt uploads generate SHA-256 cryptographic fingerprints and inspect EXIF/binary metadata strictly to intercept duplicate recycled receipts, transaction replay attacks, and image alteration.'}
                        </p>
                    </div>

                    {/* Section 4 */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                            <span>⚖️</span>
                            {isMm ? '၄။ Four-Eyes Maker-Checker စာရင်းစစ် အုပ်ချုပ်မှု' : '4. Four-Eyes Maker-Checker Governance & Audit Retention'}
                        </div>
                        <p>
                            {isMm
                                ? 'ငွေကြေးစာရင်း ပြင်ဆင်ခြင်း၊ စာရင်းပယ်ဖျက်ခြင်းနှင့် အမည်ပျက်စာရင်းသွင်းခြင်းများကို ဘဏ္ဍာရေးအရာရှိ (Accountant) နှင့် စာရင်းစစ်မှူး (Chief Auditor) နှစ်ဦး အဆင့်ဆင့်စိစစ်ခွင့်ပြုချက်ဖြင့်သာ ဆောင်ရွက်ပြီး ဥပဒေနှင့်အညီ တရားဝင်စာရင်းစစ်မှတ်တမ်းအဖြစ် ထိန်းသိမ်းထားရှိပါသည်။'
                                : 'All sensitive actions—including statement rollbacks, fuzzy match settlements, and fraud blacklisting—mandate dual authorization (Maker-Checker). Audit logs are immutably archived for regulatory compliance.'}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono">
                        {isMm ? 'ဗားရှင်း ၂၀၂၆.၁ • ဘဏ္ဍာရေးလုံခြုံမှု စံနှုန်း' : 'Version 2026.1 • FinTech Compliance'}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                    >
                        {isMm ? 'နားလည်သဘောတူပါသည်' : 'Acknowledge & Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
