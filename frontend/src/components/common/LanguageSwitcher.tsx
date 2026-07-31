import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18n_lang', lang);
  };

  return (
    <div className={`flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-1 ${className}`}>
      <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-1" />
      <button
        type="button"
        onClick={() => toggleLanguage('en')}
        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
          i18n.language === 'en'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage('kn')}
        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
          i18n.language === 'kn'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700'
        }`}
      >
        ಕನ್ನಡ
      </button>
    </div>
  );
};
