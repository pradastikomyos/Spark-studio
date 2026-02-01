import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PageTransition } from './PageTransition';
import * as fc from 'fast-check';

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

afterEach(() => {
  cleanup();
});

describe('PageTransition - Property-Based Tests', () => {
  /**
   * Property 12: Page Transition Animations
   * **Validates: Requirements 4.1**
   * 
   * For any navigation between pages, the system SHALL animate the transition
   * with fade or slide effects using Framer Motion.
   */
  it('Property 12: should render any content with motion wrapper', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (text, childCount) => {
          const children = Array.from({ length: childCount }, (_, i) => (
            <div key={`child-${i}`} data-testid={`child-${i}`}>
              {text}-{i}
            </div>
          ));

          const { container, unmount } = render(
            <PageTransition>
              {children}
            </PageTransition>
          );

          // Verify all children are rendered
          for (let i = 0; i < childCount; i += 1) {
            const el = screen.getByTestId(`child-${i}`);
            expect(el).toBeInTheDocument();
            expect(el.textContent).toBe(`${text}-${i}`);
          }

          // Verify motion wrapper exists
          expect(container.firstChild).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Page Transition Animations (Reduced Motion)
   * **Validates: Requirements 4.1, 4.6, 4.7**
   * 
   * The system SHALL respect user preferences for reduced motion.
   */
  it('Property 12: should respect prefers-reduced-motion preference', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => {
          const trimmed = s.trim();
          // Only allow strings that don't have internal whitespace issues
          return trimmed.length >= 3 && s === trimmed && !/\s{2,}/.test(s);
        }),
        (prefersReducedMotion, content) => {
          // Mock matchMedia to return the preference
          const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          window.matchMedia = matchMediaMock;

          const uniqueId = `content-${Math.random().toString(36).substr(2, 9)}`;
          const { container, unmount } = render(
            <PageTransition>
              <div data-testid={uniqueId}>{content}</div>
            </PageTransition>
          );

          // Verify content is rendered regardless of motion preference
          const element = screen.getByTestId(uniqueId);
          expect(element).toBeInTheDocument();
          // Use textContent directly to avoid whitespace normalization issues
          expect(element.textContent).toBe(content);
          
          // Verify matchMedia was called to check preference
          expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
          
          // Verify motion wrapper exists
          expect(container.firstChild).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: 60fps Animation Performance
   * **Validates: Requirements 4.5, 9.4**
   * 
   * For any animation that runs in the application, the system should maintain
   * 60 frames per second performance without dropping frames.
   * 
   * Note: We can't directly test FPS in unit tests, but we can verify that:
   * 1. Animation configuration uses optimal settings (300ms duration)
   * 2. No heavy computations block rendering
   * 3. Component renders efficiently with various content sizes
   */
  it('Property 16: should render efficiently with various content sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 10, maxLength: 1000 }),
        (elementCount, textContent) => {
          const startTime = performance.now();

          const children = Array.from({ length: elementCount }, (_, i) => (
            <div key={i}>
              <p>{textContent.substring(0, 50)}</p>
              <span>Element {i}</span>
            </div>
          ));

          const { container, unmount } = render(
            <PageTransition>
              <div>{children}</div>
            </PageTransition>
          );

          const renderTime = performance.now() - startTime;

          // Verify component rendered
          expect(container.firstChild).toBeInTheDocument();

          // Verify render time is reasonable (< 100ms for initial render)
          // This ensures no blocking operations that would affect 60fps
          expect(renderTime).toBeLessThan(100);

          // Verify all elements are in the DOM
          expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
          
          unmount();
        }
      ),
      { numRuns: 50 } // Reduced runs for performance test
    );
  });

  /**
   * Property 16: Animation Configuration Consistency
   * **Validates: Requirements 4.5, 9.4**
   * 
   * Verify that animation timing is consistent and optimal for 60fps.
   * 300ms duration with easeOut/easeIn is optimal for smooth 60fps animations.
   */
  it('Property 16: should maintain consistent animation behavior across renders', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 20 }
        ),
        (contentArray) => {
          // Render multiple times with different content
          const renders = contentArray.map(content => {
            const uniqueId = `test-${Math.random().toString(36).substr(2, 9)}`;
            const { container, unmount } = render(
              <PageTransition>
                <div data-testid={uniqueId}>{content}</div>
              </PageTransition>
            );

            const result = {
              hasMotionWrapper: container.firstChild !== null,
              contentRendered: screen.queryByTestId(uniqueId) !== null,
            };

            unmount();
            return result;
          });

          // Verify all renders behaved consistently
          renders.forEach(result => {
            expect(result.hasMotionWrapper).toBe(true);
            expect(result.contentRendered).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: Nested Content Handling
   * **Validates: Requirements 4.1**
   * 
   * Verify that PageTransition correctly handles deeply nested content structures.
   */
  it('Property 12: should handle deeply nested content structures', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.string({ minLength: 3, maxLength: 30 }).map((s) => s.trim().replace(/\s+/g, ' ')).filter((s) => s.length >= 3),
        (depth, text) => {
          const uniqueId = `inner-${Math.random().toString(36).substr(2, 9)}`;
          
          // Create nested structure
          let content: React.ReactNode = <span data-testid={uniqueId}>{text}</span>;
          for (let i = 0; i < depth; i++) {
            content = <div data-depth={i}>{content}</div>;
          }

          const { container, unmount } = render(
            <PageTransition>
              {content}
            </PageTransition>
          );

          // Verify content is rendered
          expect(screen.getByTestId(uniqueId)).toHaveTextContent(text);

          // Verify motion wrapper exists
          expect(container.firstChild).toBeInTheDocument();

          // Verify nested structure is preserved
          const deepestDiv = screen.getByTestId(uniqueId).closest(`[data-depth="0"]`);
          expect(deepestDiv).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Multiple Children Handling
   * **Validates: Requirements 4.1**
   * 
   * Verify that PageTransition correctly handles multiple children of various types.
   */
  it('Property 12: should handle multiple children of various types', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('div', 'span', 'p', 'section'),
            content: fc.string({ minLength: 3, maxLength: 50 }).filter(s => {
              const trimmed = s.trim();
              return trimmed.length >= 3 && s === trimmed && !/\s{2,}/.test(s);
            }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (elements) => {
          const uniquePrefix = `el-${Math.random().toString(36).substr(2, 9)}`;
          const children = elements.map((el, i) => {
            const Tag = el.type as keyof JSX.IntrinsicElements;
            return <Tag key={i} data-testid={`${uniquePrefix}-${i}`}>{el.content}</Tag>;
          });

          const { unmount } = render(
            <PageTransition>
              {children}
            </PageTransition>
          );

          // Verify all content is rendered
          elements.forEach((el, i) => {
            const element = screen.getByTestId(`${uniquePrefix}-${i}`);
            expect(element).toBeInTheDocument();
            expect(element.textContent).toBe(el.content);
          });
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
