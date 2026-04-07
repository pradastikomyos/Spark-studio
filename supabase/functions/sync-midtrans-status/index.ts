import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { getMidtransEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import { logWebhookEvent } from '../_shared/payment-effects.ts'
import { processTicketOrderTransition } from '../_shared/payment-processors.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

    // Use service role key for database operations
    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)

    const body = await req.json().catch(() => ({}))
    const orderNumber = String(body?.order_number || '')
    if (!orderNumber) {
      return jsonError(req, 400, 'Missing order_number')
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, expires_at, tickets_issued_at, capacity_released_at')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      return jsonError(req, 404, 'Order not found')
    }

    if (order.user_id !== auth.user.id) {
      return jsonError(req, 403, 'Forbidden')
    }

    const baseUrl = getStatusBaseUrl(midtransIsProduction)
    const authString = getMidtransBasicAuthHeader(midtransServerKey)
    const statusResponse = await fetch(`${baseUrl}/v2/${encodeURIComponent(orderNumber)}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authString,
      },
    })

    const statusData = await statusResponse.json().catch(() => null)
    if (!statusResponse.ok) {
      console.error('[sync-midtrans-status] Midtrans status error:', statusData)
      return jsonErrorWithDetails(req, 502, {
        error: 'Failed to fetch Midtrans status',
        code: 'MIDTRANS_STATUS_FETCH_FAILED',
        details: statusData,
      })
    }

    const newStatus = mapMidtransStatus(statusData?.transaction_status, statusData?.fraud_status)
    const nowIso = new Date().toISOString()

    const result = await processTicketOrderTransition({
      supabase,
      order: order as {
        id: number
        order_number: string
        user_id: string | null
        status?: string | null
        tickets_issued_at?: string | null
        capacity_released_at?: string | null
      },
      nextStatus: newStatus,
      paymentData: statusData,
      nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber,
      eventType: 'ticket_sync_processed',
      payload: {
        next_status: newStatus,
        applied: result.applied,
        skipped_reason: result.skippedReason,
      },
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    if (result.updateError || result.effectError) {
      console.error('[sync-midtrans-status] Failed to apply transition:', {
        updateError: result.updateError,
        effectError: result.effectError,
      })
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to sync ticket payment status',
        code: 'TICKET_STATUS_SYNC_FAILED',
        details: result.updateError ?? result.effectError,
      })
    }

    return json(req, { status: 'ok', order: result.order })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
