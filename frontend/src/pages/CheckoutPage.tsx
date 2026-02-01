import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/checkout/product', { replace: true });
  }, [navigate]);

  return null;
}
