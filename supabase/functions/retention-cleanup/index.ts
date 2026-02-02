import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getEnvNumber(key: string, fallback: number) {
  const raw = Deno.env.get(key)
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const webhookRetentionDays = getEnvNumber('RETENTION_WEBHOOK_LOGS_DAYS', 90)
  const pendingReservationRetentionDays = getEnvNumber('RETENTION_RESERVATIONS_PENDING_DAYS', 7)
  const staleReservationRetentionDays = getEnvNumber('RETENTION_RESERVATIONS_STALE_DAYS', 30)
  const stockReservationRetentionDays = getEnvNumber('RETENTION_STOCK_RESERVATIONS_DAYS', 7)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const nowIso = new Date().toISOString()
  const webhookCutoff = daysAgoIso(webhookRetentionDays)
  const pendingReservationCutoff = daysAgoIso(pendingReservationRetentionDays)
  const staleReservationCutoff = daysAgoIso(staleReservationRetentionDays)
  const stockReservationCutoff = daysAgoIso(stockReservationRetentionDays)

  const results: Record<string, unknown> = {
    now: nowIso,
    cutoffs: {
      webhook_logs_processed_at_lt: webhookCutoff,
      reservations_pending_expires_at_lt: pendingReservationCutoff,
      reservations_stale_updated_at_lt: staleReservationCutoff,
      stock_reservations_reserved_until_lt: stockReservationCutoff,
    },
  }

  const webhookDelete = await supabase
    .from('webhook_logs')
    .delete()
    .lt('processed_at', webhookCutoff)
    .select('id', { count: 'exact' })

  results.webhook_logs = {
    deleted: webhookDelete.count ?? 0,
    error: webhookDelete.error ? String((webhookDelete.error as { message?: unknown }).message ?? webhookDelete.error) : null,
  }

  const reservationsPendingDelete = await supabase
    .from('reservations')
    .delete()
    .eq('status', 'pending')
    .lt('expires_at', pendingReservationCutoff)
    .select('id', { count: 'exact' })

  const reservationsStaleDelete = await supabase
    .from('reservations')
    .delete()
    .in('status', ['expired', 'cancelled'])
    .lt('updated_at', staleReservationCutoff)
    .select('id', { count: 'exact' })

  results.reservations = {
    deleted_pending: reservationsPendingDelete.count ?? 0,
    deleted_stale: reservationsStaleDelete.count ?? 0,
    error:
      reservationsPendingDelete.error || reservationsStaleDelete.error
        ? {
            pending: reservationsPendingDelete.error
              ? String((reservationsPendingDelete.error as { message?: unknown }).message ?? reservationsPendingDelete.error)
              : null,
            stale: reservationsStaleDelete.error
              ? String((reservationsStaleDelete.error as { message?: unknown }).message ?? reservationsStaleDelete.error)
              : null,
          }
        : null,
  }

  const stockReservationsDelete = await supabase
    .from('stock_reservations')
    .delete()
    .lt('reserved_until', stockReservationCutoff)
    .select('id', { count: 'exact' })

  results.stock_reservations = {
    deleted: stockReservationsDelete.count ?? 0,
    error: stockReservationsDelete.error
      ? String((stockReservationsDelete.error as { message?: unknown }).message ?? stockReservationsDelete.error)
      : null,
  }

  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
