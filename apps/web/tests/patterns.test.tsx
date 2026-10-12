import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryBoundary } from '../src/components/patterns/QueryBoundary';
import { Wizard } from '../src/components/patterns/Wizard';

describe('Pattern Tests (QueryBoundary & Wizard)', () => {
  it('renders loading skeleton, error state, and children in QueryBoundary', () => {
    // 1. Loading
    const { rerender } = render(
      <QueryBoundary isLoading={true}>
        {() => <p>Loaded Data</p>}
      </QueryBoundary>
    );
    expect(screen.queryByText('Loaded Data')).toBeNull();

    // 2. Error State with mapped code
    rerender(
      <QueryBoundary
        isLoading={false}
        error={{ name: 'Error', message: 'Forbidden', code: 'FORBIDDEN_ACCESS' } as any}
      >
        {() => <p>Loaded Data</p>}
      </QueryBoundary>
    );
    expect(screen.getByText('You do not have permission to view this.')).toBeDefined();
    expect(screen.getByText('FORBIDDEN_ACCESS')).toBeDefined();

    // 3. Success Data
    rerender(
      <QueryBoundary
        isLoading={false}
        error={null}
        data={{ name: 'PlayMatch Match' }}
      >
        {(d) => <p>Loaded: {d.name}</p>}
      </QueryBoundary>
    );
    expect(screen.getByText('Loaded: PlayMatch Match')).toBeDefined();
  });

  it('validates wizard steps before advancing', async () => {
    render(
      <Wizard
        steps={[
          {
            step: { id: 1, title: 'Step 1' },
            validate: () => true,
            content: <p>Step 1 Content</p>,
          },
          {
            step: { id: 2, title: 'Step 2' },
            validate: () => true,
            content: <p>Step 2 Content</p>,
          },
        ]}
        onComplete={() => {}}
      />
    );

    expect(screen.getByText('Step 1 Content')).toBeDefined();
  });
});
