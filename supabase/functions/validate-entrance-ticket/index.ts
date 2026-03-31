import { serve } from '../_shared/deps.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { handleCors, json, jsonError } from '../_shared/http.ts'

type RequestBody = {
  ticketCode?: string
}

type ValidateEntranceResult = {
  ok?: boolean
  code?: string
  message?: string
  ticketId?: number
  ticketCode?: string
  ticketName?: string
  userId?: string | null
  validDate?: string
  usedAt?: string
}

function mapValidationStatus(code: string | undefined): number {
  if (!code) return 500
  if (code === 'missing_ticket_code') return 400
  if (code === 'ticket_not_found') return 404
  if (
    code === 'ticket_used' ||
    code === 'invalid_status' ||
    code === 'ticket_expired' ||
    code === 'ticket_not_yet_valid' ||
    code === 'session_not_started' ||
    code === 'session_ended'
  ) {
    return 409
  }
  return 500
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const adminResult = await requireAdminContext(req)
    if (adminResult.response) return adminResult.response

    const admin = adminResult.context
    if (!admin) return jsonError(req, 401, 'Unauthorized')

    const body = (await req.json()) as RequestBody
    const ticketCode = String(body.ticketCode ?? '').trim().toUpperCase()
    if (!ticketCode) {
      return jsonError(req, 400, 'Kode tiket kosong')
    }

    const { data, error } = await admin.supabaseService.rpc('validate_entrance_ticket_scan', {
      p_ticket_code: ticketCode,
    })

    if (error) {
      console.error('[validate-entrance-ticket] RPC failed:', error)
      return jsonError(req, 500, 'Gagal memvalidasi tiket')
    }

    const result = data && typeof data === 'object' ? (data as ValidateEntranceResult) : null
    if (!result) {
      return jsonError(req, 500, 'Hasil validasi tiket tidak valid')
    }

    if (!result.ok) {
      return jsonError(req, mapValidationStatus(result.code), result.message || 'Gagal memvalidasi tiket')
    }

    let userName = '-'
    if (result.userId) {
      const { data: profile } = await admin.supabaseService
        .from('profiles')
        .select('name')
        .eq('id', result.userId)
        .maybeSingle()

      userName = String((profile as { name?: string | null } | null)?.name || '-')
    }

    return json(req, {
      status: 'ok',
      ticket: {
        code: result.ticketCode ?? ticketCode,
        userName,
        ticketName: result.ticketName ?? '-',
        validDate: result.validDate ?? null,
      },
    })
  } catch (error) {
    console.error('[validate-entrance-ticket] Unexpected error:', error)
    return jsonError(req, 500, 'Internal server error')
  }
})
