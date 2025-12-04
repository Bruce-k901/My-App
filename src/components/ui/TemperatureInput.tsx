'use client';

import { useState, useRef, useEffect } from 'react';
import { NumericKeyboard } from './NumericKeyboard';

interface TemperatureInputProps {
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

/**
 * Temperature input component with custom numeric keyboard
 * Includes minus button for negative temperatures
 * Only shows custom keyboard on mobile/touch devices
 */
export function TemperatureInput({
  value,
  onChange,
  placeholder = 'Temperature (°C)',
  className = '',
  onBlur,
  onFocus,
  onSubmit,
  disabled = false,
  id,
  name,
}: TemperatureInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Convert value to string for display
  const displayValue = value === undefined || value === null ? '' : String(value);

  const handleFocus = () => {
    setIsFocused(true);
    if (isMobile) {
      setShowKeyboard(true);
    }
    onFocus?.();
  };

  const handleBlur = () => {
    // Delay hiding keyboard to allow button clicks to register
    setTimeout(() => {
      setIsFocused(false);
      setShowKeyboard(false);
    }, 200);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow negative numbers, decimals, and empty string
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleKeyPress = (key: string) => {
    const currentValue = displayValue;
    let newValue = '';

    if (key === '-') {
      // Toggle minus sign at the start
      if (currentValue.startsWith('-')) {
        newValue = currentValue.slice(1);
      } else {
        newValue = '-' + currentValue;
      }
    } else if (key === '.') {
      // Only allow one decimal point
      if (!currentValue.includes('.')) {
        newValue = currentValue + '.';
      } else {
        newValue = currentValue; // Don't add if already exists
      }
    } else {
      // Regular number
      newValue = currentValue + key;
    }

    // Validate the new value
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
      // Keep focus on input
      inputRef.current?.focus();
    }
  };

  const handleBackspace = () => {
    const currentValue = displayValue;
    if (currentValue.length > 0) {
      const newValue = currentValue.slice(0, -1);
      onChange(newValue);
      // Keep focus on input
      inputRef.current?.focus();
    }
  };

  const handleEnter = () => {
    if (onSubmit) {
      onSubmit();
    }
    // Blur the input to hide keyboard
    inputRef.current?.blur();
  };

  // Prevent default keyboard on mobile when using custom keyboard
  useEffect(() => {
    if (isMobile && showKeyboard && inputRef.current) {
      // Set inputMode to 'none' to prevent default keyboard
      inputRef.current.setAttribute('inputmode', 'none');
    } else if (inputRef.current) {
      // Restore decimal input mode when keyboard is hidden
      inputRef.current.setAttribute('inputmode', 'decimal');
    }
  }, [showKeyboard, isMobile]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        inputMode={isMobile && showKeyboard ? 'none' : 'decimal'}
        pattern="-?[0-9]*\.?[0-9]*"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        id={id}
        name={name}
        className={className}
        // Prevent zoom on iOS when focusing
        style={{ fontSize: '16px' }}
      />
      {isMobile && (
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={onSubmit ? handleEnter : undefined}
          isVisible={showKeyboard}
        />
      )}
    </>
  );
}



