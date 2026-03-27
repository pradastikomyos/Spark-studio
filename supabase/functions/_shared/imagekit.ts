import { getImageKitEnv } from './env.ts'

const textEncoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export function getProductImageFolder(productId: number): string {
  const { productImagesBasePath } = getImageKitEnv()
  return `${productImagesBasePath}/${productId}`
}

export async function createImageKitUploadAuthPayload(productId: number) {
  const { publicKey, privateKey, urlEndpoint } = getImageKitEnv()
  const token = crypto.randomUUID()
  const expire = Math.floor(Date.now() / 1000) + 15 * 60
  const signingKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(privateKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', signingKey, textEncoder.encode(`${token}${expire}`))
  return {
    publicKey,
    urlEndpoint,
    token,
    expire,
    signature: toHex(signatureBuffer),
    folder: getProductImageFolder(productId),
  }
}

export async function deleteImageKitFileById(fileId: string): Promise<void> {
  const { privateKey } = getImageKitEnv()
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${privateKey}:`)}`,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ImageKit delete failed (${response.status}): ${body || response.statusText}`)
  }
}
