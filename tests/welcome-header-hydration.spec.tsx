/**
 * WelcomeHeader Hydration Test
 *
 * Ensures WelcomeHeader renders the same structure on server and client
 * to prevent hydration mismatches. Dynamic content (date, name) uses
 * suppressHydrationWarning.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WelcomeHeader from '@/components/dashboard/WelcomeHeader';

vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Monday, 1 January 2026'),
}));

const mockSession = {
  user: { id: 'test-user-id', email: 'test@example.com' },
};

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ session: mockSession }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { full_name: 'John Doe' },
            error: null,
          }),
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

    // Wrapper div exists
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();

    // Heading with "Welcome" text and correct classes
    const heading = screen.getByText(/welcome/i);
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
    expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'font-semibold');

    // Date paragraph always exists (may show nbsp on initial render)
    const dateParagraph = wrapper?.querySelector('p');
    expect(dateParagraph).toBeInTheDocument();
  });

  test('Structure remains consistent after mount', () => {
    const { container, rerender } = render(<WelcomeHeader />);

    const wrapperBefore = container.firstElementChild;
    const headingBefore = screen.getByText(/welcome/i);

    rerender(<WelcomeHeader />);

    const wrapperAfter = container.firstElementChild;
    const headingAfter = screen.getByText(/welcome/i);

    // Same structure after re-render
    expect(wrapperAfter?.tagName).toBe(wrapperBefore?.tagName);
    expect(headingAfter.tagName).toBe(headingBefore.tagName);
  });

  test('Does not conditionally render different HTML structures', () => {
    const { container } = render(<WelcomeHeader />);

    // Only one root wrapper
    expect(container.children.length).toBe(1);

    // No Suspense boundaries
    const suspenseElements = container.querySelectorAll('[data-suspense]');
    expect(suspenseElements.length).toBe(0);
  });

  test('Date paragraph exists for dynamic content', () => {
    const { container } = render(<WelcomeHeader />);

    const wrapper = container.firstElementChild;
    const dateParagraph = wrapper?.querySelector('p');
    expect(dateParagraph).toBeInTheDocument();

    // Consistent nesting
    expect(dateParagraph?.parentElement).toBeInTheDocument();
  });
});
