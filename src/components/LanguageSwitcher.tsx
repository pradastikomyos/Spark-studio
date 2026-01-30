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

  return (
    <button
      type="button"
      onClick={onToggle}
      className="hover:text-primary transition-colors flex items-center gap-1"
      aria-label={t('language.switch')}
      title={`${t('language.switch')}: ${t(`language.${next}`)}`}
    >
      <span className="material-symbols-outlined text-[20px]">language</span>
      <span className="text-[12px] leading-none" aria-hidden>
        {flag}
      </span>
      <span className="text-[10px] font-bold tracking-wider" aria-hidden>
        {current.toUpperCase()}
      </span>
    </button>
  );
}

export default memo(LanguageSwitcher);

