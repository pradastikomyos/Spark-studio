import { supabase } from './supabase';
import { createSupabaseFunctionError } from './supabaseFunctionError';

type SupabaseFunctionInvokeOptions = NonNullable<Parameters<typeof supabase.functions.invoke>[1]>;

type InvokeSupabaseFunctionParams = {
  functionName: string;
  body?: SupabaseFunctionInvokeOptions['body'];
  headers?: SupabaseFunctionInvokeOptions['headers'];
  fallbackMessage: string;
};

export async function invokeSupabaseFunction<TResponse>(params: InvokeSupabaseFunctionParams): Promise<TResponse> {
  const { data, error, response } = await supabase.functions.invoke(params.functionName, {
    body: params.body,
    headers: params.headers,
  });

  if (error) {
    throw await createSupabaseFunctionError({
      error,
      response,
      fallbackMessage: params.fallbackMessage,
    });
  }

  return data as TResponse;
}
