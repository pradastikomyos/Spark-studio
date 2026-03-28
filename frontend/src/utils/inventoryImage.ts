import { buildImageKitThumbUrl, isImageKitUrl } from '../lib/imagekit';

export function toInventoryThumbUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  if (isImageKitUrl(imageUrl)) {
    return buildImageKitThumbUrl(imageUrl, { width: 640, quality: 75 });
  }
  return imageUrl;
}
