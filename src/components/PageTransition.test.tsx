import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageTransition } from './PageTransition';

// Mock matchMedia before any imports that might use it
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // Deprecated but needed for Framer Motion
      removeListener: vi.fn(), // Deprecated but needed for Framer Motion
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('PageTransition', () => {
  let matchMediaMock: any;

  beforeEach(() => {
    // Reset and reconfigure matchMedia for each test
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    window.matchMedia = vi.fn(() => matchMediaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply motion.div wrapper', () => {
    const { container } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    // The motion.div should be the parent of the content
    const motionDiv = container.firstChild;
    expect(motionDiv).toBeInTheDocument();
    expect(motionDiv?.firstChild).toHaveTextContent('Test Content');
  });

  it('should check for prefers-reduced-motion on mount', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should add event listener for motion preference changes', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    unmount();

    expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should use normal animation variants when prefers-reduced-motion is false', () => {
    matchMediaMock.matches = false;

    const { container } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    const motionDiv = container.firstChild as HTMLElement;
    
    // Framer Motion applies inline styles for animations
    // We can't directly test the variants, but we can verify the component renders
    expect(motionDiv).toBeInTheDocument();
  });

  it('should use reduced motion variants when prefers-reduced-motion is true', () => {
    matchMediaMock.matches = true;

    const { container } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    const motionDiv = container.firstChild as HTMLElement;
    
    // Framer Motion applies inline styles for animations
    // We can't directly test the variants, but we can verify the component renders
    expect(motionDiv).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <PageTransition>
        <div>First Child</div>
        <div>Second Child</div>
        <div>Third Child</div>
      </PageTransition>
    );

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
    expect(screen.getByText('Third Child')).toBeInTheDocument();
  });

  it('should handle complex nested content', () => {
    render(
      <PageTransition>
        <div>
          <header>Header</header>
          <main>
            <section>Section Content</section>
          </main>
          <footer>Footer</footer>
        </div>
      </PageTransition>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('should update motion preference when media query changes', async () => {
    matchMediaMock.matches = false;

    const { rerender } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    // Get the change handler that was registered
    const changeHandler = matchMediaMock.addEventListener.mock.calls[0][1];

    // Simulate media query change wrapped in act
    await vi.waitFor(() => {
      changeHandler({ matches: true } as MediaQueryListEvent);
    });

    // Force a re-render to see the effect
    rerender(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    // Component should still render correctly
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should handle empty children gracefully', () => {
    const { container } = render(
      <PageTransition>
        {null}
      </PageTransition>
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should work with React fragments', () => {
    render(
      <PageTransition>
        <>
          <div>Fragment Child 1</div>
          <div>Fragment Child 2</div>
        </>
      </PageTransition>
    );

    expect(screen.getByText('Fragment Child 1')).toBeInTheDocument();
    expect(screen.getByText('Fragment Child 2')).toBeInTheDocument();
  });
});
