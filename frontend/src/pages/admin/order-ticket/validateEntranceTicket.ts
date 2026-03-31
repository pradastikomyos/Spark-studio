import { ensureFreshToken } from '../../../utils/auth';
import { supabase } from '../../../lib/supabase';

export type EntranceValidationSuccess = {
  code: string;
  userName: string;
  ticketName: string;
  validDate: string | null;
};

export async function validateEntranceTicket(params: {
  ticketCode: string;
  session: Parameters<typeof ensureFreshToken>[0];
}): Promise<EntranceValidationSuccess> {
  const token = await ensureFreshToken(params.session);
  if (!token) {
    throw new Error('Sesi login tidak valid. Silakan login ulang.');
  }

  const normalizedTicketCode = params.ticketCode.trim().toUpperCase();
  const { data, error } = await supabase.functions.invoke('validate-entrance-ticket', {
    body: { ticketCode: normalizedTicketCode },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) {
      throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
    }

    const contextError =
      typeof (error as { context?: { error?: unknown } }).context?.error === 'string'
        ? String((error as { context?: { error?: unknown } }).context?.error)
        : null;

    throw new Error(contextError || error.message || 'Gagal memvalidasi tiket');
  }

  const ticket = (data as { ticket?: EntranceValidationSuccess } | null)?.ticket;
  if (!ticket) {
    throw new Error('Data tiket hasil validasi tidak lengkap');
  }

  return ticket;
}
