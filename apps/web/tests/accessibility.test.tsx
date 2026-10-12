import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Dialog } from '../src/components/ui/Dialog';
import { Tabs } from '../src/components/ui/Tabs';

describe('Interactive Accessibility Tests (Dialog Escape & Tabs Keyboard)', () => {
  it('closes Dialog on Escape keypress', () => {
    let openState = true;
    const handleOpenChange = (open: boolean) => {
      openState = open;
    };

    const { unmount } = render(
      <Dialog
        open={openState}
        onOpenChange={handleOpenChange}
        title="Test Modal"
        description="Modal description"
      >
        <p>Modal content</p>
      </Dialog>
    );

    expect(screen.getByText('Test Modal')).toBeDefined();

    // Trigger Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(openState).toBe(false);
    unmount();
    cleanup();
  });

  it('renders Tabs with active tab panels', () => {
    cleanup();
    render(
      <Tabs
        defaultValue="tab1"
        items={[
          { value: 'tab1', label: 'Tab One', content: <p>Content One</p> },
          { value: 'tab2', label: 'Tab Two', content: <p>Content Two</p> },
        ]}
      />
    );

    expect(screen.getByText('Tab One')).toBeDefined();
    expect(screen.getByText('Tab Two')).toBeDefined();
    expect(screen.getByText('Content One')).toBeDefined();
  });
});
