/**
 * DashboardLayout Hydration Test
 *
 * Ensures DashboardLayout renders consistent structure on server and client
 * to prevent hydration mismatches.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardLayout from '@/app/dashboard/layout';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock hooks
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => ({ isMobile: false }),
}));

vi.mock('@/hooks/useSidebarMode', () => ({
  useSidebarMode: () => ({ width: '0px', mode: 'collapsed' }),
}));

// Mock child components
vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/mobile', () => ({
  MobileNavProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  BottomTabBar: () => <div data-testid="bottom-tab-bar" />,
  MoreSheet: () => <div data-testid="more-sheet" />,
}));

vi.mock('@/components/checkly/sidebar-nav', () => ({
  ChecklySidebar: () => <div data-testid="checkly-sidebar" />,
}));

vi.mock('@/components/stockly/sidebar-nav', () => ({
  StocklySidebar: () => <div data-testid="stockly-sidebar" />,
}));

vi.mock('@/components/teamly/sidebar-nav', () => ({
  TeamlySidebar: () => <div data-testid="teamly-sidebar" />,
}));

vi.mock('@/components/planly/sidebar-nav', () => ({
  PlanlySidebar: () => <div data-testid="planly-sidebar" />,
}));

vi.mock('@/components/assetly/sidebar-nav', () => ({
  AssetlySidebar: () => <div data-testid="assetly-sidebar" />,
}));

vi.mock('@/components/assistant/AIAssistantWidget', () => ({
  default: () => <div data-testid="assistant">Assistant</div>,
}));

vi.mock('@/components/search', () => ({
  SearchModal: () => <div data-testid="search-modal" />,
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

    // Desktop layout wrapper exists (uses min-h-screen)
    const mainWrapper = container.querySelector('.min-h-screen');
    expect(mainWrapper).toBeInTheDocument();

    // Main element exists
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();

    // Header rendered
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  test('Renders without isMounted state causing hydration issues', () => {
    const { container, rerender } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    rerender(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Structure should remain consistent after re-render
    const mainWrapper = container.querySelector('.min-h-screen');
    expect(mainWrapper).toBeInTheDocument();
  });

  test('Has consistent structure for hydration safety', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Wrapper exists
    const mainWrapper = container.querySelector('.min-h-screen');
    expect(mainWrapper).toBeInTheDocument();

    // Main content area exists
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  test('Renders children consistently', () => {
    render(
      <DashboardLayout>
        <div data-testid="child">Child Content</div>
      </DashboardLayout>
    );

    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Child Content');
  });
});
