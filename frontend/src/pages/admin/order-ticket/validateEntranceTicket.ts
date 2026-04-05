import { ensureFreshToken } from '../../../utils/auth';
import { createSupabaseFunctionError } from '../../../lib/supabaseFunctionError';
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
  const { data, error, response } = await supabase.functions.invoke('validate-entrance-ticket', {
    body: { ticketCode: normalizedTicketCode },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    const parsedError = await createSupabaseFunctionError({
      error,
      response,
      fallbackMessage: 'Gagal memvalidasi tiket',
    });
    const status = parsedError.status;
    if (status === 401) {
      throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
    }
    throw parsedError;
  }

  const ticket = (data as { ticket?: EntranceValidationSuccess } | null)?.ticket;
  if (!ticket) {
    throw new Error('Data tiket hasil validasi tidak lengkap');
  }

  return ticket;
}
