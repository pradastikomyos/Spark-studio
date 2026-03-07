import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentCustomerForm } from './PaymentCustomerForm';

describe('PaymentCustomerForm', () => {
  it('associates labels with the customer inputs', () => {
    render(
      <PaymentCustomerForm
        bookingDetails={{
          ticketId: 1,
          ticketName: 'Spark Entry',
          ticketType: 'entrance',
          price: 150000,
          bookingDate: '2026-03-08',
          timeSlot: '10:00',
          quantity: 1,
          total: 150000,
        }}
        loading={false}
        snapLoaded={true}
        customerName="Nadia"
        customerPhone="08123456789"
        customerEmail="nadia@example.com"
        onChangeCustomerName={vi.fn()}
        onChangeCustomerPhone={vi.fn()}
        onPay={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Your Name *')).toHaveValue('Nadia');
    expect(screen.getByLabelText('Phone Number (Optional)')).toHaveValue('08123456789');
    expect(screen.getByLabelText('Email')).toHaveValue('nadia@example.com');
  });
});
