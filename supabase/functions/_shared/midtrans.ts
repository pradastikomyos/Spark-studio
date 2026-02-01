export function getSnapUrl(isProduction: boolean) {
  return isProduction ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

export function getStatusBaseUrl(isProduction: boolean) {
  return isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
}

export function getMidtransBasicAuthHeader(serverKey: string) {
  return `Basic ${btoa(`${serverKey}:`)}`
}

export async function generateSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): Promise<string> {
  const data = orderId + statusCode + grossAmount + serverKey
  const msgBuffer = new TextEncoder().encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
