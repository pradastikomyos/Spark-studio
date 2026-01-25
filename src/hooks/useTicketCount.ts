import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useTicketCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, initialized } = useAuth();

  useEffect(() => {
    // Wait for auth to be initialized
    if (!initialized) {
      return;
    }

    const userId = user?.id ?? null;

    const fetchTicketCount = async () => {
      if (!userId) {
        setCount(0);
        setLoading(false);
        return;
      }

      try {
        // Count purchased tickets with status 'active' and valid_date >= today
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

        const { count: ticketCount, error: ticketError } = await supabase
          .from('purchased_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('valid_date', todayStr);

        if (ticketError) {
          setCount(0);
        } else {
          setCount(ticketCount || 0);
        }
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketCount();

    // Subscribe to changes in purchased_tickets
    if (!userId) return;

    const subscription = supabase
      .channel('purchased_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchased_tickets', filter: `user_id=eq.${userId}` }, () => {
        fetchTicketCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, initialized]);

  return { count, loading };
};
