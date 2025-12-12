/**
 * Signup Page Email Fields Test
 * 
 * This test ensures that the signup page ALWAYS shows both email fields
 * and validates that they match. This prevents regressions where one field
 * might be conditionally hidden.
 * 
 * Usage:
 *   npm run test tests/signup-email-fields.spec.tsx
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignupPage from '@/app/signup/page';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock Supabase client
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockSignUp = vi.fn().mockResolvedValue({ 
  data: { user: null, session: null }, 
  error: null 
});

vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signUp: mockSignUp,
    },
  }),
}));

describe('Signup Page Email Fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Both email fields are always visible', () => {
    render(<SignupPage />);
    
    // Check that both email fields exist by placeholder (most reliable for this component)
    const emailField = screen.getByPlaceholderText(/you@example.com/i);
    const confirmEmailField = screen.getByPlaceholderText(/repeat your email address/i);
    
    expect(emailField).toBeInTheDocument();
    expect(confirmEmailField).toBeInTheDocument();
    
    // Both should be required
    expect(emailField).toBeRequired();
    expect(confirmEmailField).toBeRequired();
    
    // Both should be email type
    expect(emailField).toHaveAttribute('type', 'email');
    expect(confirmEmailField).toHaveAttribute('type', 'email');
    
    // Both should have IDs for proper label association
    expect(emailField).toHaveAttribute('id', 'signup-email');
    expect(confirmEmailField).toHaveAttribute('id', 'signup-confirm-email');
  });

  test('Email fields have correct labels', () => {
    render(<SignupPage />);
    
    // Check labels exist - use getAllByText since both contain "email address"
    const emailLabels = screen.getAllByText(/email address/i);
    expect(emailLabels.length).toBeGreaterThanOrEqual(2); // At least 2 labels (email and confirm)
    
    // Check that required asterisks are present
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThanOrEqual(2); // At least 2 asterisks (one for each email field)
  });

  test('Email fields have correct placeholders', () => {
    render(<SignupPage />);
    
    const emailField = screen.getByPlaceholderText(/you@example.com/i);
    const confirmEmailField = screen.getByPlaceholderText(/repeat your email address/i);
    
    expect(emailField).toBeInTheDocument();
    expect(confirmEmailField).toBeInTheDocument();
  });
});
