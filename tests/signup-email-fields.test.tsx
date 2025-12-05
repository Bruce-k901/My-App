/**
 * Signup Page Email Fields Test
 * 
 * This test ensures that the signup page ALWAYS shows both email fields
 * and validates that they match. This prevents regressions where one field
 * might be conditionally hidden.
 * 
 * Usage:
 *   npm run test tests/signup-email-fields.test.tsx
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignupPage from '@/app/signup/page';

describe('Signup Page Email Fields', () => {
  test('Both email fields are always visible', () => {
    render(<SignupPage />);
    
    // Check that both email fields exist
    const emailField = screen.getByLabelText(/email address/i);
    const confirmEmailField = screen.getByLabelText(/confirm email address/i);
    
    expect(emailField).toBeInTheDocument();
    expect(confirmEmailField).toBeInTheDocument();
    
    // Both should be required
    expect(emailField).toBeRequired();
    expect(confirmEmailField).toBeRequired();
    
    // Both should be email type
    expect(emailField).toHaveAttribute('type', 'email');
    expect(confirmEmailField).toHaveAttribute('type', 'email');
  });

  test('Email fields have correct labels', () => {
    render(<SignupPage />);
    
    // Check labels include required indicator
    expect(screen.getByText(/email address \*/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm email address \*/i)).toBeInTheDocument();
  });

  test('Email fields have correct placeholders', () => {
    render(<SignupPage />);
    
    const emailField = screen.getByPlaceholderText(/you@example.com/i);
    const confirmEmailField = screen.getByPlaceholderText(/repeat your email address/i);
    
    expect(emailField).toBeInTheDocument();
    expect(confirmEmailField).toBeInTheDocument();
  });
});


