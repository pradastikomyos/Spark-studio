import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

type CancelProductOrderResult = {
  ok?: boolean
  code?: string
  message?: string
  result?: string
  reason?: string
  order_number?: string
  order_id?: number
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const body = await req.json().catch(() => ({}))
    const orderNumber = String(body?.order_number || '').trim()
    if (!orderNumber) {
      return json(req, { error: 'Missing order_number' }, { status: 400 })
    }

    const trace = {
      action: 'cancel_product_order',
      order_number: orderNumber,
      user_id: auth.user.id,
    }
    console.log('[cancel-product-order] start', trace)

    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)
    const { data, error } = await supabase.rpc('cancel_product_order_atomic', {
      p_order_number: orderNumber,
      p_user_id: auth.user.id,
    })

    if (error) {
      console.error('[cancel-product-order] rpc_error', {
        ...trace,
        error: error.message,
      })
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to cancel order',
        code: 'CANCEL_ORDER_FAILED',
        details: error.message,
      })
    }

    const result =
      data && typeof data === 'object' ? (data as CancelProductOrderResult) : ({ ok: false } satisfies CancelProductOrderResult)

    console.log('[cancel-product-order] end', {
      ...trace,
      ok: Boolean(result.ok),
      result: result.result ?? null,
      reason: result.reason ?? null,
      code: result.code ?? null,
      order_id: result.order_id ?? null,
    })

    if (result.ok) {
      return json(
        req,
        {
          status: 'ok',
          result: result.result ?? 'noop',
          reason: result.reason ?? null,
          order: {
            order_number: result.order_number ?? orderNumber,
            order_id: result.order_id ?? null,
          },
        },
        { status: 200 },
      )
    }

    if (result.code === 'missing_order_number' || result.code === 'missing_user_id') {
      return jsonError(req, 400, result.message || 'Invalid request')
    }

    if (result.code === 'forbidden') {
      return jsonError(req, 403, result.message || 'Forbidden')
    }

    if (result.code === 'order_not_found') {
      return jsonError(req, 404, result.message || 'Order not found')
    }

    return jsonError(req, 409, result.message || 'Failed to cancel order')
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error('[cancel-product-order] Unhandled error:', errorMessage)
    return jsonErrorWithDetails(req, 500, {
      error: 'Internal server error',
      code: 'UNHANDLED_EXCEPTION',
      details: errorMessage,
    })
  }
})
