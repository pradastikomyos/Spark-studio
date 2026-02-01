/**
 * Expire Tickets Edge Function
 * 
 * Automatically expires tickets that have passed their valid_date.
 * Scheduled to run daily at 00:05 WIB (17:05 UTC).
 * 
 * Updates purchased_tickets:
 * - WHERE valid_date < CURRENT_DATE AND status = 'active'
 * - SET status = 'expired'
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Expire Tickets] Starting auto-expiry process...');

    // Get current date in WIB timezone (UTC+7)
    // Supabase stores dates in UTC, so we need to compare properly
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
    const nowWIB = new Date(now.getTime() + wibOffset);
    const todayWIB = nowWIB.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`[Expire Tickets] Current date (WIB): ${todayWIB}`);

    // Update expired tickets
    // Note: valid_date is stored as DATE type (no timezone)
    // We compare it with today's date in WIB timezone
    const { data, error, count } = await supabase
      .from('purchased_tickets')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('valid_date', todayWIB)
      .select('id, ticket_code, valid_date', { count: 'exact' });

    if (error) {
      console.error('[Expire Tickets] Error updating tickets:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const expiredCount = count || 0;
    console.log(`[Expire Tickets] Successfully expired ${expiredCount} ticket(s)`);

    if (data && data.length > 0) {
      console.log('[Expire Tickets] Expired ticket codes:', data.map(t => t.ticket_code).join(', '));
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        expired_tickets: data || [],
        current_date_wib: todayWIB,
        timestamp: new Date().toISOString(),
        message: `Successfully expired ${expiredCount} ticket(s)`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('[Expire Tickets] Unexpected error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
