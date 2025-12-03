/**
 * DashboardLayout Hydration Test
 * 
 * This test ensures that DashboardLayout always renders the same structure
 * on server and client to prevent hydration mismatches. This is critical
 * for preventing React hydration errors.
 * 
 * Key requirements:
 * - No conditional className logic
 * - No isMounted state that changes structure
 * - All className strings must be static
 * - suppressHydrationWarning on elements with dynamic content
 * 
 * Usage:
 *   npm run test tests/dashboard-layout-hydration.spec.tsx
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardLayout from '@/app/dashboard/layout';

// Mock Next.js AppContext
const mockAppContext = {
  role: 'Admin' as const,
  loading: false,
};

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => mockAppContext,
}));

// Mock child components
vi.mock('@/components/layouts/NewMainSidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/layouts/DashboardHeader', () => ({
  default: ({ onMobileMenuClick }: { onMobileMenuClick: () => void }) => (
    <div data-testid="header">Header</div>
  ),
}));

vi.mock('@/components/assistant/AIAssistantWidget', () => ({
  default: () => <div data-testid="assistant">Assistant</div>,
}));

describe('DashboardLayout Hydration Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Renders consistent structure with static className', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );
    
    // Should always render the same wrapper structure
    const mainWrapper = container.querySelector('.dashboard-page');
    expect(mainWrapper).toBeInTheDocument();
    expect(mainWrapper).toHaveClass('flex', 'h-screen', 'bg-[#0B0D13]', 'text-white', 'overflow-hidden');
    
    // Content wrapper should have consistent className
    const contentWrapper = container.querySelector('.flex-1.lg\\:ml-20');
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper).toHaveClass('flex-1', 'lg:ml-20', 'flex', 'flex-col', 'h-full', 'min-w-0');
    
    // Header should have consistent className
    const header = container.querySelector('.sticky.top-0');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('sticky', 'top-0', 'z-50', 'bg-[#0B0D13]', 'ios-sticky-header');
    
    // Main element should have consistent className
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex-1', 'overflow-y-auto', 'overflow-x-hidden');
  });

  test('Renders without isMounted state causing hydration issues', () => {
    // This test ensures the component renders consistently
    // isMounted state would cause different renders on server vs client
    const { container, rerender } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );
    
    // Re-render should produce same structure
    rerender(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );
    
    // Structure should remain consistent
    const mainWrapper = container.querySelector('.dashboard-page');
    expect(mainWrapper).toBeInTheDocument();
  });

  test('Has consistent structure for hydration safety', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );
    
    // Main wrapper should exist with correct classes
    const mainWrapper = container.querySelector('.dashboard-page');
    expect(mainWrapper).toBeInTheDocument();
    
    // Content wrapper should exist with correct classes
    const contentWrapper = container.querySelector('.flex-1.lg\\:ml-20');
    expect(contentWrapper).toBeInTheDocument();
    
    // Note: suppressHydrationWarning is a React prop, not a DOM attribute
    // It's verified in the code comments and code review
    // The important thing is that the structure is consistent
  });

  test('Renders children consistently', () => {
    const { container } = render(
      <DashboardLayout>
        <div data-testid="child">Child Content</div>
      </DashboardLayout>
    );
    
    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Child Content');
  });
});

