import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useTicketCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const fetchTicketCount = async () => {
      if (!user?.email) {
        setCount(0);
        setLoading(false);
        return;
      }

      try {
        // First get the user_id from public.users table based on email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userError || !userData) {
          setCount(0);
          setLoading(false);
          return;
        }

        // Then count purchased tickets with status 'active' and valid_date >= today
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

        const { count: ticketCount, error: ticketError } = await supabase
          .from('purchased_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id)
          .eq('status', 'active')
          .gte('valid_date', todayStr);

        if (ticketError) {
          console.error('Error fetching ticket count:', ticketError);
          setCount(0);
        } else {
          setCount(ticketCount || 0);
        }
      } catch (error) {
        console.error('Error in useTicketCount:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketCount();

    // Subscribe to changes in purchased_tickets
    const subscription = supabase
      .channel('purchased_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchased_tickets' }, () => {
        fetchTicketCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, user?.email, authLoading]);

  return { count, loading };
};
