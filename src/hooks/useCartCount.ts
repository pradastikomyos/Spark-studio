import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useCartCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const fetchCartCount = async () => {
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

        // Count reservations with status 'pending' (items in cart)
        const { count: cartCount, error: cartError } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id)
          .eq('status', 'pending');

        if (cartError) {
          console.error('Error fetching cart count:', cartError);
          setCount(0);
        } else {
          setCount(cartCount || 0);
        }
      } catch (error) {
        console.error('Error in useCartCount:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCartCount();

    // Subscribe to changes in reservations
    const subscription = supabase
      .channel('reservations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchCartCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, authLoading]);

  return { count, loading };
};
