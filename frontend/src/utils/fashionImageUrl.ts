const FASHION_BUCKET = 'fashion-images';

const OBJECT_PUBLIC_PREFIX = `/storage/v1/object/public/${FASHION_BUCKET}/`;
const RENDER_PUBLIC_PREFIX = `/storage/v1/render/image/public/${FASHION_BUCKET}/`;

export function parseFashionStorageObjectPath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathname = url.pathname;

    if (pathname.startsWith(OBJECT_PUBLIC_PREFIX)) {
      return pathname.slice(OBJECT_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(RENDER_PUBLIC_PREFIX)) {
      return pathname.slice(RENDER_PUBLIC_PREFIX.length);
    }

    return null;
  } catch {
    return null;
  }
}

export function getOptimizedFashionModelUrl(
  inputUrl: string,
  opts: { height: number }
): string {
  const objectPath = parseFashionStorageObjectPath(inputUrl);
  if (!objectPath) return inputUrl;

  const height = Number.isFinite(opts.height) ? Math.max(1, Math.round(opts.height)) : 1;

  try {
    const url = new URL(inputUrl);
    url.pathname = `${RENDER_PUBLIC_PREFIX}${objectPath}`;
    url.searchParams.set('height', String(height));
    return url.toString();
  } catch {
    return inputUrl;
  }
}

