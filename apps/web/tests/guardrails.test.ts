import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, fileList);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('Architectural Boundary Guardrail Test', () => {
  it('strictly forbids importing @radix-ui/* or lucide-react outside apps/web/src/components/ui/', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const allFiles = walk(srcDir);

    const violations: string[] = [];

    for (const file of allFiles) {
      const normalized = file.replace(/\\/g, '/');
      // Allowed inside components/ui/, or existing legacy feature components pending migration
      if (
        normalized.includes('/src/components/ui/') ||
        normalized.includes('/src/components/explain/') ||
        normalized.includes('/src/components/notifications/') ||
        normalized.includes('/src/components/results/') ||
        normalized.includes('/src/components/teams/') ||
        normalized.includes('/src/pages/games/')
      ) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('@radix-ui/') || (content.includes('from \'lucide-react\'') || content.includes('from "lucide-react"'))) {
        violations.push(normalized);
      }
    }

    expect(
      violations,
      `Found direct Radix UI or lucide-react imports outside components/ui/:\n${violations.join('\n')}`
    ).toEqual([]);
  });
});
