type FunctionInvokeErrorLike = {
  message?: unknown;
  status?: unknown;
  context?: unknown;
};

type FunctionErrorPayload = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

export type ParsedSupabaseFunctionError = {
  message: string;
  status?: number;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export type SupabaseFunctionError = Error &
  ParsedSupabaseFunctionError & {
    name: 'SupabaseFunctionError';
  };

const GENERIC_FUNCTION_HTTP_ERROR = 'Edge Function returned a non-2xx status code';
const GENERIC_FUNCTION_FETCH_ERROR = 'Failed to send a request to the Edge Function';

const asTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const isResponse = (value: unknown): value is Response =>
  typeof Response !== 'undefined' && value instanceof Response;

const getContextResponse = (context: unknown): Response | null => {
  if (isResponse(context)) return context;
  if (context && typeof context === 'object' && 'response' in context) {
    const response = (context as { response?: unknown }).response;
    if (isResponse(response)) return response;
  }
  return null;
};

const applyPayload = (
  payload: unknown,
  current: { message: string | null; code?: string; details?: string | null; hint?: string | null }
) => {
  if (!payload || typeof payload !== 'object') return current;

  const raw = payload as FunctionErrorPayload;
  const nested =
    raw.error && typeof raw.error === 'object'
      ? (raw.error as FunctionErrorPayload)
      : null;

  const message =
    asTrimmedString(raw.error) ??
    asTrimmedString(raw.message) ??
    asTrimmedString(nested?.message) ??
    asTrimmedString(nested?.error) ??
    current.message;

  const details = asTrimmedString(raw.details) ?? asTrimmedString(nested?.details) ?? current.details ?? null;
  const hint = asTrimmedString(raw.hint) ?? asTrimmedString(nested?.hint) ?? current.hint ?? null;
  const code = asTrimmedString(raw.code) ?? asTrimmedString(nested?.code) ?? current.code;

  return { message, code: code ?? undefined, details, hint };
};

const parseResponsePayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType === 'application/json') {
    return response.clone().json();
  }

  const text = await response.clone().text();
  return asTrimmedString(text) ?? text;
};

export function getSupabaseFunctionResponse(error: unknown, response?: Response): Response | null {
  if (isResponse(response)) return response;
  const context = (error as FunctionInvokeErrorLike | null | undefined)?.context;
  return getContextResponse(context);
}

export function getSupabaseFunctionStatus(error: unknown, response?: Response): number | undefined {
  const invokeError = error as FunctionInvokeErrorLike | null | undefined;
  const directStatus = typeof invokeError?.status === 'number' ? invokeError.status : undefined;
  if (directStatus != null) return directStatus;

  const context = invokeError?.context;
  if (context && typeof context === 'object') {
    const contextStatus = (context as { status?: unknown; statusCode?: unknown }).status;
    if (typeof contextStatus === 'number') return contextStatus;

    const contextStatusCode = (context as { statusCode?: unknown }).statusCode;
    if (typeof contextStatusCode === 'number') return contextStatusCode;
  }

  return getSupabaseFunctionResponse(error, response)?.status;
}

export async function parseSupabaseFunctionError(params: {
  error: unknown;
  response?: Response;
  fallbackMessage: string;
}): Promise<ParsedSupabaseFunctionError> {
  const { error, response, fallbackMessage } = params;
  const invokeError = error as FunctionInvokeErrorLike | null | undefined;
  const parsed = applyPayload(invokeError?.context, {
    message: null,
    details: null,
    hint: null,
  });

  const resolvedResponse = getSupabaseFunctionResponse(error, response);
  const messageFromError = asTrimmedString(invokeError?.message);

  let next = parsed;

  if (
    (!next.message || next.message === GENERIC_FUNCTION_HTTP_ERROR || next.message === GENERIC_FUNCTION_FETCH_ERROR) &&
    resolvedResponse
  ) {
    try {
      next = applyPayload(await parseResponsePayload(resolvedResponse), next);
    } catch {
      // Ignore body parsing failures and keep the best information available.
    }
  }

  const resolvedMessage =
    next.message && next.message !== GENERIC_FUNCTION_HTTP_ERROR && next.message !== GENERIC_FUNCTION_FETCH_ERROR
      ? next.message
      : messageFromError && messageFromError !== GENERIC_FUNCTION_HTTP_ERROR && messageFromError !== GENERIC_FUNCTION_FETCH_ERROR
        ? messageFromError
        : fallbackMessage;

  return {
    message: resolvedMessage,
    status: getSupabaseFunctionStatus(error, response),
    code: next.code,
    details: next.details ?? null,
    hint: next.hint ?? null,
  };
}

export async function createSupabaseFunctionError(params: {
  error: unknown;
  response?: Response;
  fallbackMessage: string;
}): Promise<SupabaseFunctionError> {
  const parsed = await parseSupabaseFunctionError(params);
  const nextError = new Error(parsed.message) as SupabaseFunctionError;
  nextError.name = 'SupabaseFunctionError';
  nextError.status = parsed.status;
  nextError.code = parsed.code;
  nextError.details = parsed.details;
  nextError.hint = parsed.hint;
  return nextError;
}
