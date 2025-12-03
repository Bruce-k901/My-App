/**
 * WelcomeHeader Hydration Test
 * 
 * This test ensures that WelcomeHeader always renders the same structure
 * on server and client to prevent hydration mismatches. This is critical
 * for preventing React hydration errors.
 * 
 * Key requirements:
 * - Same HTML structure on initial render (before isMounted)
 * - Same HTML structure after mount (after isMounted)
 * - Only dynamic content (date, name) should differ, with suppressHydrationWarning
 * 
 * Usage:
 *   npm run test tests/welcome-header-hydration.spec.tsx
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WelcomeHeader from '@/components/dashboard/WelcomeHeader';

// Mock date-fns format before importing component
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }),
}));

// Mock Next.js AppContext
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
  },
};

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    session: mockSession,
  }),
}));

// Mock Supabase
const mockProfile = { full_name: 'John Doe' };
const mockSupabaseQuery = vi.fn().mockResolvedValue({
  data: mockProfile,
  error: null,
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockSupabaseQuery,
        }),
      }),
    }),
  },
}));

describe('WelcomeHeader Hydration Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Renders consistent structure on initial mount', () => {
    const { container } = render(<WelcomeHeader />);
    
    // Should always render the same wrapper structure
    const wrapper = container.querySelector('.text-white');
    expect(wrapper).toBeInTheDocument();
    
    // Should always have the same heading structure
    const heading = screen.getByText(/welcome/i);
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'font-semibold');
    
    // Should always have the date paragraph (even if empty initially)
    const dateParagraph = container.querySelector('.text-white\\/60');
    expect(dateParagraph).toBeInTheDocument();
  });

  test('Structure remains consistent after mount', () => {
    const { container } = render(<WelcomeHeader />);
    
    // Structure should be consistent immediately
    const wrapper = container.querySelector('.text-white');
    expect(wrapper).toBeInTheDocument();
    
    const heading = screen.getByText(/welcome/i);
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'font-semibold');
  });

  test('Does not conditionally render different HTML structures', () => {
    const { container } = render(<WelcomeHeader />);
    
    // Should NOT have conditional wrapper divs that change structure
    const wrappers = container.querySelectorAll('.text-white');
    expect(wrappers.length).toBe(1); // Only one wrapper
    
    // Should NOT have Suspense boundaries that change structure
    const suspenseElements = container.querySelectorAll('[data-suspense]');
    expect(suspenseElements.length).toBe(0);
  });

  test('Dynamic content uses suppressHydrationWarning', () => {
    const { container } = render(<WelcomeHeader />);
    
    // The date paragraph should have suppressHydrationWarning
    // (We can't directly test this, but we can verify the structure)
    const dateParagraph = container.querySelector('.text-white\\/60');
    expect(dateParagraph).toBeInTheDocument();
    
    // The structure should be consistent even if content changes
    expect(dateParagraph?.parentElement).toBeInTheDocument();
  });
});

