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

export async function incrementSoldCapacityOptimistic(
  supabase: any,
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

    const currentSold = typeof (row as any).sold_capacity === 'number' ? (row as any).sold_capacity : Number((row as any).sold_capacity ?? 0)
    const currentVersion = typeof (row as any).version === 'number' ? (row as any).version : Number((row as any).version ?? 0)
    const nextSold = currentSold + delta
    const nextVersion = currentVersion + 1

    const { data: updated, error: updateError } = await supabase
      .from('ticket_availabilities')
      .update({
        sold_capacity: nextSold,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (row as any).id)
      .eq('version', (row as any).version)
      .select('id')

    if (!updateError && updated && updated.length > 0) return
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
