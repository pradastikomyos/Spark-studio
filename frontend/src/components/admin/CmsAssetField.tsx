type CmsAssetFieldProps = {
  label: string;
  value: string;
  kind?: 'image' | 'video';
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
  uploadLabel?: string;
  placeholder?: string;
  previewClassName?: string;
};

export default function CmsAssetField({
  label,
  value,
  kind = 'image',
  onChange,
  onUpload,
  uploadLabel,
  placeholder,
  previewClassName,
}: CmsAssetFieldProps) {
  const accept = kind === 'image' ? 'image/*' : 'video/*';
  const effectiveUploadLabel = uploadLabel ?? `Pilih ${kind === 'image' ? 'File' : 'Video'} untuk Diupload`;
  const effectivePlaceholder =
    placeholder ?? `Atau masukkan ${kind === 'image' ? 'Image' : 'Video'} URL di sini...`;
  const previewClasses =
    previewClassName ??
    (kind === 'image'
      ? 'h-16 w-16 object-cover rounded shadow shrink-0'
      : 'h-20 w-20 rounded shadow shrink-0 border border-gray-200 bg-black object-cover');

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <div className="flex gap-4 items-start">
        {value ? (
          kind === 'image' ? (
            <img src={value} alt="Preview" className={previewClasses} />
          ) : (
            <video src={value} controls muted className={previewClasses} />
          )
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded shadow bg-gray-100 text-gray-400">
            <span className="material-symbols-outlined">{kind === 'image' ? 'image' : 'movie'}</span>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="relative">
            <input
              type="file"
              accept={accept}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = '';
              }}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {effectiveUploadLabel}
            </button>
          </div>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder={effectivePlaceholder}
          />
        </div>
      </div>
    </div>
  );
}
