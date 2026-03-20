import { CMS_FONT_OPTIONS, type SectionFontConfig } from '../../lib/cmsTypography';

type CmsSectionFontFieldsProps = {
  value: SectionFontConfig;
  onChange: (nextValue: SectionFontConfig) => void;
};

export default function CmsSectionFontFields({ value, onChange }: CmsSectionFontFieldsProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Heading font</label>
        <select
          value={value.heading}
          onChange={(event) => onChange({ ...value, heading: event.target.value as SectionFontConfig['heading'] })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none"
        >
          {CMS_FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Body font</label>
        <select
          value={value.body}
          onChange={(event) => onChange({ ...value, body: event.target.value as SectionFontConfig['body'] })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none"
        >
          {CMS_FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
