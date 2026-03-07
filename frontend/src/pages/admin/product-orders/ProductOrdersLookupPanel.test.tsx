import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductOrdersLookupPanel } from './ProductOrdersLookupPanel';

describe('ProductOrdersLookupPanel', () => {
  it('associates the lookup label with the code input', () => {
    render(
      <ProductOrdersLookupPanel
        inputRef={{ current: null }}
        lookupCode="PRX-123"
        lookupError={null}
        onChangeCode={vi.fn()}
        onLookup={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Cari kode')).toHaveValue('PRX-123');
  });
});
