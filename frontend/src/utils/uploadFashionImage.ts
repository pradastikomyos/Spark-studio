import { supabase } from '../lib/supabase';

const FASHION_BUCKET = 'fashion-images';

export async function uploadFashionImage(
    file: File,
    collectionId: number | string,
    lookId?: number | string
): Promise<string> {
    // Only allow PNG for transparent cutouts
    const fileName = file.name.toLowerCase();
    const hasValidExt = /\.png$/i.test(fileName);
    const hasValidMime = file.type === 'image/png' || file.type === '';

    if (!hasValidMime && !hasValidExt) {
        throw new Error('Hanya file PNG yang diperbolehkan. Upload foto model dengan background transparan (PNG).');
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error('Ukuran file maks 10MB.');
    }

    const uuid =
        globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const folder = lookId ? `${collectionId}/${lookId}` : `${collectionId}`;
    const objectPath = `${folder}/${uuid}.png`;

    const { error: uploadError } = await supabase.storage
        .from(FASHION_BUCKET)
        .upload(objectPath, file, {
            contentType: 'image/png',
            cacheControl: '31536000',
            upsert: false,
        });

    if (uploadError) {
        const msg = uploadError.message || 'Gagal upload gambar';
        if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
            throw new Error('Storage bucket "fashion-images" belum ada. Buat dulu di Supabase Storage.');
        }
        throw new Error(msg);
    }

    const { data } = supabase.storage.from(FASHION_BUCKET).getPublicUrl(objectPath);
    if (!data?.publicUrl) {
        throw new Error('Gagal mendapatkan public URL.');
    }

    return data.publicUrl;
}

export async function deleteFashionImage(imageUrl: string): Promise<void> {
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/fashion-images\/(.+)$/);
    if (!pathMatch) return;

    const objectPath = pathMatch[1];
    await supabase.storage.from(FASHION_BUCKET).remove([objectPath]);
}
