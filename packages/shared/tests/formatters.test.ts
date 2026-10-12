import { describe, it, expect } from 'vitest';
import {
  formatDistance,
  formatRating,
  formatDate,
  formatGameStatus,
  formatConfidence,
} from '../src/utils/formatters.js';

describe('Shared Formatters Unit Tests', () => {
  it('formatDistance renders distanceKm exactly as returned without invented "~"', () => {
    expect(formatDistance(1.5)).toBe('1.5 km');
    expect(formatDistance(0)).toBe('0 km');
    expect(formatDistance(25)).toBe('25 km');
    expect(formatDistance(null)).toBe('');
  });

  it('formatRating takes bandLabel from API response and does not derive ranges', () => {
    expect(formatRating(1240.25, 'Intermediate')).toBe('1240.3 (Intermediate)');
    expect(formatRating(1557.1, 'Advanced')).toBe('1557.1 (Advanced)');
    expect(formatRating(1000)).toBe('1000');
    expect(formatRating(null)).toBe('');
  });

  it('formatDate formats date with given timezone', () => {
    const iso = '2026-10-15T12:00:00.000Z';
    const formatted = formatDate(iso, { timeZone: 'UTC' });
    expect(formatted).toBe('Oct 15, 2026');
  });

  it('formatGameStatus resolves status keys to human strings', () => {
    expect(formatGameStatus('open')).toBe('Open');
    expect(formatGameStatus('full')).toBe('Full / Waitlist');
    expect(formatGameStatus('confirmed')).toBe('Confirmed');
    expect(formatGameStatus('in_progress')).toBe('In Progress');
  });

  it('formatConfidence resolves confidence keys to human strings', () => {
    expect(formatConfidence('high')).toBe('High Confidence');
    expect(formatConfidence('medium')).toBe('Moderate Fit');
    expect(formatConfidence('low')).toBe('Tentative Match');
  });
});
