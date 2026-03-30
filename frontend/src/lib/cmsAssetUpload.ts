import { supabase } from './supabase';
import { slugify } from '../utils/merchant';

export type CmsAssetKind = 'image' | 'video';

export async function uploadCmsAsset(params: {
  file: File;
  bucket: string;
  prefix: string;
  kind: CmsAssetKind;
  maxSizeMb?: number;
  folder?: string;
  onUploaded?: (publicUrl: string) => void;
  showToast?: (type: 'success' | 'error', message: string) => void;
}) {
  const { file, bucket, prefix, kind, onUploaded, showToast } = params;
  const maxSizeMb = params.maxSizeMb ?? (kind === 'image' ? 5 : 50);
  const folder = params.folder ?? 'settings';

  if (!file.type.startsWith(`${kind}/`)) {
    throw new Error(`Please upload a valid ${kind} file`);
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`${kind} size must be less than ${maxSizeMb}MB`);
  }

  const ext = file.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4');
  const baseName = slugify(file.name.replace(/\.[^.]+$/, '')) || `${kind}-asset`;
  const fileName = `${prefix}-${baseName}-${Date.now()}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  showToast?.('success', `Uploading ${kind}...`);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  onUploaded?.(publicUrl);
  showToast?.('success', `${kind === 'image' ? 'Image' : 'Video'} uploaded successfully`);

  return publicUrl;
}
