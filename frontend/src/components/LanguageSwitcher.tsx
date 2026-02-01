import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedLanguage } from '../i18n';

function normalizeLanguage(raw: string | undefined): SupportedLanguage {
  const value = (raw ?? '').toLowerCase();
  return value.startsWith('id') ? 'id' : 'en';
}

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const current = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const next: SupportedLanguage = current === 'en' ? 'id' : 'en';

  const onToggle = useCallback(() => {
    void i18n.changeLanguage(next);
  }, [i18n, next]);

  const flag = current === 'en' ? '🇺🇸' : '🇮🇩';
  const langLabel = current === 'en' ? 'English' : 'Bahasa Indonesia';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-main-600 hover:bg-main-50 active:bg-main-100 transition-all group"
      aria-label={t('language.switch')}
      title={`${t('language.switch')}: ${t(`language.${next}`)}`}
    >
      <span className="text-lg leading-none" aria-hidden>
        {flag}
      </span>
      <span className="text-sm font-medium text-gray-700 group-hover:text-main-600 transition-colors">
        {langLabel}
      </span>
      <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-main-600 transition-colors">
        expand_more
      </span>
    </button>
  );
}

export default memo(LanguageSwitcher);

