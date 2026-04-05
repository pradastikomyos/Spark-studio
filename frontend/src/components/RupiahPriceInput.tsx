import { useState } from 'react';
import { formatRupiahInputValue } from '../utils/rupiahInput';

type RupiahPriceInputProps = {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * A shared Rupiah price input that stores raw digits while the user
 * is typing and only applies thousand-separator formatting on blur.
 *
 * This prevents the mid-typing reformat that clears the field when
 * formatRupiahInputValue injects a dot separator that the parser
 * then rejects on the next keystroke.
 *
 * Usage:
 *   <RupiahPriceInput value={form.price} onChange={(raw) => setPrice(raw)} />
 *
 * - `value` should be a raw digit string (e.g. "30000")
 * - `onChange` receives the raw digit string
 * - While focused: shows raw digits
 * - While blurred: shows formatted string (e.g. "30.000")
 */
export function RupiahPriceInput({
  value,
  onChange,
  placeholder = '50.000',
  className = '',
  disabled,
}: RupiahPriceInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const displayValue = focused ? localValue : formatRupiahInputValue(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      disabled={disabled}
      onFocus={() => {
        setFocused(true);
        setLocalValue(value);
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '');
        setLocalValue(digits);
        onChange(digits);
      }}
      onBlur={() => {
        setFocused(false);
      }}
      className={className}
      placeholder={placeholder}
    />
  );
}
