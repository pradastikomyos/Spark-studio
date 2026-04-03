export function normalizeSelectedTimeSlots(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return [value]
    }
  }
  return []
}

export function normalizeAvailabilityTimeSlot(value: string): string | null {
  if (!value) return null
  if (value === 'all-day') return null
  return value
}

export function normalizeBookingTimeSlot(value: unknown): string {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  if (normalized === 'all-day') return normalized

  const match = normalized.match(/^(\d{2}):(\d{2})(?::\d{2})?$/)
  if (match) {
    return `${match[1]}:${match[2]}`
  }

  return normalized
}

export function normalizeTicketTimeSlots(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((slot) => String(slot).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((slot) => String(slot).trim()).filter(Boolean)
      }
    } catch {
      return [value.trim()].filter(Boolean)
    }
  }

  return []
}

type PostgrestSelectBuilder = {
  eq: (column: string, value: unknown) => PostgrestSelectBuilder
  single: () => Promise<{ data: unknown; error: unknown }>
}

type PostgrestUpdateBuilder = {
  eq: (column: string, value: unknown) => PostgrestUpdateBuilder
  select: (columns?: string) => Promise<{ data: unknown[] | null; error: unknown }>
}

type PostgrestQueryBuilder = {
  select: (columns: string) => PostgrestSelectBuilder
  update: (values: Record<string, unknown>) => PostgrestUpdateBuilder
}

type SupabaseLikeClient = {
  from: (table: string) => PostgrestQueryBuilder
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null
  return value as Record<string, unknown>
}

export async function incrementSoldCapacityOptimistic(
  supabase: SupabaseLikeClient,
  params: { ticketId: number; date: string; timeSlot: string | null; delta: number }
) {
  const { ticketId, date, timeSlot, delta } = params
  if (delta <= 0) return

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error: readError } = await supabase
      .from('ticket_availabilities')
      .select('id, sold_capacity, version')
      .eq('ticket_id', ticketId)
      .eq('date', date)
      .eq('time_slot', timeSlot as unknown)
      .single()

    if (readError || !row) return
    const rowRecord = asRecord(row)
    if (!rowRecord) return

    const soldValue = rowRecord.sold_capacity
    const versionValue = rowRecord.version
    const idValue = rowRecord.id
    const currentSold = typeof soldValue === 'number' ? soldValue : Number(soldValue ?? 0)
    const currentVersion = typeof versionValue === 'number' ? versionValue : Number(versionValue ?? 0)
    const nextSold = currentSold + delta
    const nextVersion = currentVersion + 1

    const { data: updated, error: updateError } = await supabase
      .from('ticket_availabilities')
      .update({
        sold_capacity: nextSold,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idValue)
      .eq('version', versionValue)
      .select('id')

    if (!updateError && Array.isArray(updated) && updated.length > 0) return
  }
}

export function mapMidtransStatus(transactionStatus: unknown, fraudStatus: unknown): string {
  const tx = String(transactionStatus || '').toLowerCase()
  const fraud = fraudStatus == null ? null : String(fraudStatus).toLowerCase()

  if (tx === 'capture') {
    if (fraud === 'accept' || fraud == null) return 'paid'
    return 'pending'
  }

  if (tx === 'settlement') return 'paid'
  if (tx === 'pending') return 'pending'
  if (tx === 'expire' || tx === 'expired') return 'expired'
  if (tx === 'refund' || tx === 'refunded' || tx === 'partial_refund') return 'refunded'
  if (tx === 'deny' || tx === 'cancel' || tx === 'failure') return 'failed'

  return 'pending'
}
