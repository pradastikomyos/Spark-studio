import type { ImagePreview } from '../ProductImageUpload';

const IMAGE_DB_NAME = 'admin-product-form';
const IMAGE_DB_STORE = 'imageDrafts';

type StoredImage = {
  name: string;
  type: string;
  order: number;
  buffer: ArrayBuffer;
};

const openImageDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_DB_STORE)) {
        db.createObjectStore(IMAGE_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export async function readStoredImages(key: string): Promise<StoredImage[] | null> {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_DB_STORE, 'readonly');
    const store = tx.objectStore(IMAGE_DB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as StoredImage[] | undefined) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function writeStoredImages(key: string, images: StoredImage[]): Promise<void> {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_DB_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_DB_STORE);
    const req = store.put(images, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function clearStoredImages(key: string): Promise<void> {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_DB_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_DB_STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export function restoreImagePreviews(stored: StoredImage[]): ImagePreview[] {
  return stored
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item, index) => {
      const file = new File([item.buffer], item.name, { type: item.type });
      return { file, preview: URL.createObjectURL(file), order: index };
    });
}

export async function serializeImagePreviews(images: ImagePreview[]): Promise<StoredImage[]> {
  return Promise.all(
    images.map(async (image) => ({
      name: image.file.name,
      type: image.file.type,
      order: image.order,
      buffer: await image.file.arrayBuffer(),
    }))
  );
}
