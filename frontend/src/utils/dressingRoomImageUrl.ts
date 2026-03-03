const DRESSING_ROOM_BUCKET = 'dressing-room-images';
const LEGACY_BUCKET = 'fashion-images';

const OBJECT_PUBLIC_PREFIX = `/storage/v1/object/public/${DRESSING_ROOM_BUCKET}/`;
const RENDER_PUBLIC_PREFIX = `/storage/v1/render/image/public/${DRESSING_ROOM_BUCKET}/`;
const LEGACY_OBJECT_PUBLIC_PREFIX = `/storage/v1/object/public/${LEGACY_BUCKET}/`;
const LEGACY_RENDER_PUBLIC_PREFIX = `/storage/v1/render/image/public/${LEGACY_BUCKET}/`;

export function parseDressingRoomStorageObjectPath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathname = url.pathname;

    if (pathname.startsWith(OBJECT_PUBLIC_PREFIX)) {
      return pathname.slice(OBJECT_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(RENDER_PUBLIC_PREFIX)) {
      return pathname.slice(RENDER_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(LEGACY_OBJECT_PUBLIC_PREFIX)) {
      return pathname.slice(LEGACY_OBJECT_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(LEGACY_RENDER_PUBLIC_PREFIX)) {
      return pathname.slice(LEGACY_RENDER_PUBLIC_PREFIX.length);
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeDressingRoomImageUrl(inputUrl: string): string {
  return inputUrl.replace(`/${LEGACY_BUCKET}/`, `/${DRESSING_ROOM_BUCKET}/`);
}

export function getOptimizedDressingRoomImageUrl(
  inputUrl: string,
  opts: { height: number }
): string {
  const objectPath = parseDressingRoomStorageObjectPath(inputUrl);
  if (!objectPath) return inputUrl;

  const height = Number.isFinite(opts.height) ? Math.max(1, Math.round(opts.height)) : 1;

  try {
    const url = new URL(normalizeDressingRoomImageUrl(inputUrl));
    url.pathname = `${RENDER_PUBLIC_PREFIX}${objectPath}`;
    url.searchParams.set('height', String(height));
    return url.toString();
  } catch {
    return inputUrl;
  }
}
