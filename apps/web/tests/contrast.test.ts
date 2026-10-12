import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function luminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  const rgb = [
    parseInt(clean.substring(0, 2), 16) / 255,
    parseInt(clean.substring(2, 4), 16) / 255,
    parseInt(clean.substring(4, 6), 16) / 255,
  ];
  const a = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseBlock(blockText: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const stripped = blockText.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const statement of stripped.split(';')) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (key.startsWith('--')) {
        vars[key] = val;
      }
    }
  }
  return vars;
}

function parseCssVariables(cssContent: string): { root: Record<string, string>; dark: Record<string, string> } {
  const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
  const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);

  return {
    root: rootMatch ? parseBlock(rootMatch[1]) : {},
    dark: darkMatch ? parseBlock(darkMatch[1]) : {},
  };
}

describe('Automated Real CSS Variable Contrast Verification (WCAG AA)', () => {
  const cssPath = path.resolve(__dirname, '../src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const { root, dark } = parseCssVariables(cssContent);

  it('verifies light theme (:root) text and UI boundaries meet WCAG AA', () => {
    // 1. Text Primary (foreground) on card & bg (>=4.5:1)
    expect(contrastRatio(root['--color-foreground'], root['--color-card'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(root['--color-foreground'], root['--color-bg'])).toBeGreaterThanOrEqual(4.5);

    // 2. Muted foreground on card & bg (>=4.5:1)
    expect(contrastRatio(root['--color-muted-foreground'], root['--color-card'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(root['--color-muted-foreground'], root['--color-bg'])).toBeGreaterThanOrEqual(4.5);

    // 3. Text on muted surface (>=4.5:1)
    expect(contrastRatio(root['--color-foreground'], root['--color-muted'])).toBeGreaterThanOrEqual(4.5);

    // 4. Primary button (white text on primary) (>=4.5:1)
    expect(contrastRatio(root['--color-primary-foreground'], root['--color-primary'])).toBeGreaterThanOrEqual(4.5);
    // Primary hover (white text on primary hover) (>=4.5:1)
    expect(contrastRatio(root['--color-primary-foreground'], root['--color-primary-hover'])).toBeGreaterThanOrEqual(4.5);

    // 5. Filled Danger & Success button contrast (>=4.5:1)
    expect(contrastRatio(root['--color-danger-foreground'], root['--color-danger'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(root['--color-danger-foreground'], root['--color-danger-hover'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(root['--color-success-foreground'], root['--color-success'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(root['--color-success-foreground'], root['--color-success-hover'])).toBeGreaterThanOrEqual(4.5);

    // 6. UI Boundary: Input border and Focus ring (>=3.0:1)
    expect(contrastRatio(root['--color-border'], root['--color-card'])).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(root['--color-ring'], root['--color-card'])).toBeGreaterThanOrEqual(3.0);

    // 7. Status Chips (Text on Chip Background) (>=4.5:1)
    const statuses = ['open', 'full', 'confirmed', 'in-progress', 'completed', 'cancelled', 'expired'];
    for (const st of statuses) {
      const fg = root[`--status-${st}-fg`];
      const bg = root[`--status-${st}-bg`];
      expect(fg, `Status ${st} fg missing`).toBeDefined();
      expect(bg, `Status ${st} bg missing`).toBeDefined();
      expect(contrastRatio(fg, bg), `Status ${st} light contrast`).toBeGreaterThanOrEqual(4.5);
    }

    // 8. AI Confidence Chips (>=4.5:1)
    for (const conf of ['high', 'medium', 'low']) {
      const fg = root[`--confidence-${conf}-fg`];
      const bg = root[`--confidence-${conf}-bg`];
      expect(contrastRatio(fg, bg), `Confidence ${conf} light contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('verifies dark theme (.dark) text and UI boundaries meet WCAG AA', () => {
    // 1. Text Primary (foreground) on card & bg (>=4.5:1)
    expect(contrastRatio(dark['--color-foreground'], dark['--color-card'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark['--color-foreground'], dark['--color-bg'])).toBeGreaterThanOrEqual(4.5);

    // 2. Muted foreground on card & bg (>=4.5:1)
    expect(contrastRatio(dark['--color-muted-foreground'], dark['--color-card'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark['--color-muted-foreground'], dark['--color-bg'])).toBeGreaterThanOrEqual(4.5);

    // 3. Text on muted surface (>=4.5:1)
    expect(contrastRatio(dark['--color-foreground'], dark['--color-muted'])).toBeGreaterThanOrEqual(4.5);

    // 4. Primary button (ink text on primary) (>=4.5:1)
    expect(contrastRatio(dark['--color-primary-foreground'], dark['--color-primary'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark['--color-primary-foreground'], dark['--color-primary-hover'])).toBeGreaterThanOrEqual(4.5);

    // 5. Filled Danger & Success button contrast (>=4.5:1)
    expect(contrastRatio(dark['--color-danger-foreground'], dark['--color-danger'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark['--color-danger-foreground'], dark['--color-danger-hover'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark['--color-success-foreground'], dark['--color-success'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark['--color-success-foreground'], dark['--color-success-hover'])).toBeGreaterThanOrEqual(4.5);

    // 6. UI Boundary: Input border and Focus ring (>=3.0:1)
    expect(contrastRatio(dark['--color-border'], dark['--color-card'])).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(dark['--color-ring'], dark['--color-card'])).toBeGreaterThanOrEqual(3.0);

    // 7. Status Chips (Text on Chip Background) (>=4.5:1)
    const statuses = ['open', 'full', 'confirmed', 'in-progress', 'completed', 'cancelled', 'expired'];
    for (const st of statuses) {
      const fg = dark[`--status-${st}-fg`];
      const bg = dark[`--status-${st}-bg`];
      expect(contrastRatio(fg, bg), `Status ${st} dark contrast`).toBeGreaterThanOrEqual(4.5);
    }

    // 8. AI Confidence Chips (>=4.5:1)
    for (const conf of ['high', 'medium', 'low']) {
      const fg = dark[`--confidence-${conf}-fg`];
      const bg = dark[`--confidence-${conf}-bg`];
      expect(contrastRatio(fg, bg), `Confidence ${conf} dark contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
