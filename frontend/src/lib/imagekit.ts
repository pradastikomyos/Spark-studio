import { buildSrc, upload } from '@imagekit/javascript';
import type { UploadResponse } from '@imagekit/javascript';
import { invokeSupabaseFunction } from './supabaseFunctionInvoke';

export type ProductImageProvider = 'supabase' | 'imagekit';

export type ProductImageRecordInput = {
  image_url: string;
  image_provider: ProductImageProvider;
  provider_file_id: string | null;
  provider_file_path: string | null;
  provider_original_url: string | null;
};

type ImageKitUploadAuthResponse = {
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
  folder: string;
};

type UploadFileToImageKitParams = {
  accessToken: string;
  file: File;
  fileName: string;
  productId: number | string;
  providerOriginalUrl?: string | null;
};

type DeleteImageKitFileParams = {
  accessToken: string;
  fileId: string;
  productImageId?: number | null;
};

export function isImageKitUrl(imageUrl: string): boolean {
  if (!imageUrl) return false;
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return host === 'ik.imagekit.io' || host.endsWith('.imagekit.io');
  } catch {
    return false;
  }
}

export function buildImageKitThumbUrl(imageUrl: string, options?: { width?: number; quality?: number }): string {
  if (!isImageKitUrl(imageUrl)) return imageUrl;
  const width = options?.width ?? 640;
  const quality = options?.quality ?? 75;
  const urlEndpoint = new URL(imageUrl).origin;
  return buildSrc({
    src: imageUrl,
    urlEndpoint,
    transformation: [{ width, quality }],
  });
}

async function getImageKitUploadAuth(accessToken: string, productId: number | string): Promise<ImageKitUploadAuthResponse> {
  const data = await invokeSupabaseFunction<ImageKitUploadAuthResponse>({
    functionName: 'imagekit-auth',
    body: { productId },
    headers: { Authorization: `Bearer ${accessToken}` },
    fallbackMessage: 'Failed to fetch ImageKit upload auth',
  });

  const payload = data as Partial<ImageKitUploadAuthResponse> | null;
  if (
    !payload ||
    !payload.publicKey ||
    !payload.signature ||
    !payload.token ||
    !payload.expire ||
    !payload.folder ||
    !payload.urlEndpoint
  ) {
    throw new Error('ImageKit upload auth response was incomplete')
  }

  return payload as ImageKitUploadAuthResponse;
}

function mapUploadResponseToRecord(uploadResponse: UploadResponse, providerOriginalUrl?: string | null): ProductImageRecordInput {
  if (!uploadResponse.url) {
    throw new Error('ImageKit upload response did not include a public URL')
  }

  return {
    image_url: uploadResponse.url,
    image_provider: 'imagekit',
    provider_file_id: uploadResponse.fileId ?? null,
    provider_file_path: uploadResponse.filePath ?? null,
    provider_original_url: providerOriginalUrl ?? null,
  };
}

export async function uploadFileToImageKit(params: UploadFileToImageKitParams): Promise<ProductImageRecordInput> {
  const auth = await getImageKitUploadAuth(params.accessToken, params.productId);
  const uploadResponse = await upload({
    file: params.file,
    fileName: params.fileName,
    publicKey: auth.publicKey,
    token: auth.token,
    signature: auth.signature,
    expire: auth.expire,
    folder: auth.folder,
    useUniqueFileName: false,
    overwriteFile: false,
  });

  return mapUploadResponseToRecord(uploadResponse, params.providerOriginalUrl);
}

export async function deleteImageKitFile(params: DeleteImageKitFileParams): Promise<void> {
  await invokeSupabaseFunction({
    functionName: 'imagekit-delete',
    body: { fileId: params.fileId, productImageId: params.productImageId ?? null },
    headers: { Authorization: `Bearer ${params.accessToken}` },
    fallbackMessage: 'Failed to delete ImageKit file',
  });
}
