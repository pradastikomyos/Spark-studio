import { ensureFreshToken } from '../../../utils/auth';
import { getSupabaseFunctionStatus } from '../../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../../lib/supabaseFunctionInvoke';

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
  try {
    const data = await invokeSupabaseFunction<{ ticket?: EntranceValidationSuccess }>({
      functionName: 'validate-entrance-ticket',
      body: { ticketCode: normalizedTicketCode },
      headers: { Authorization: `Bearer ${token}` },
      fallbackMessage: 'Gagal memvalidasi tiket',
    });

    const ticket = (data as { ticket?: EntranceValidationSuccess } | null)?.ticket;
    if (!ticket) {
      throw new Error('Data tiket hasil validasi tidak lengkap');
    }

    return ticket;
  } catch (error) {
    if (getSupabaseFunctionStatus(error) === 401) {
      throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
    }
    throw error;
  }
}
