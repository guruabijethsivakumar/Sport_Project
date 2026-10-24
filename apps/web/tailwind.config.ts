import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Completely REPLACES default colors so off-palette classes cannot exist
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      bg: 'var(--color-bg)',
      card: 'var(--color-card)',
      muted: 'var(--color-muted)',
      border: 'var(--color-border)',
      'border-subtle': 'var(--color-border-subtle)',
      foreground: 'var(--color-foreground)',
      'muted-foreground': 'var(--color-muted-foreground)',
      placeholder: 'var(--color-placeholder)',

      // Primary / Brand
      primary: 'var(--color-primary)',
      'primary-hover': 'var(--color-primary-hover)',
      'primary-accent': 'var(--color-primary-accent)',
      'primary-foreground': 'var(--color-primary-foreground)',
      ring: 'var(--color-ring)',

      // Semantics
      success: 'var(--color-success)',
      'success-hover': 'var(--color-success-hover)',
      'success-foreground': 'var(--color-success-foreground)',
      danger: 'var(--color-danger)',
      'danger-hover': 'var(--color-danger-hover)',
      'danger-foreground': 'var(--color-danger-foreground)',
      warning: 'var(--color-warning)',
      'warning-hover': 'var(--color-warning-hover)',
      'warning-foreground': 'var(--color-warning-foreground)',
      info: 'var(--color-info)',
      'info-hover': 'var(--color-info-hover)',
      'info-foreground': 'var(--color-info-foreground)',

      // Status Chips
      status: {
        'open-fg': 'var(--status-open-fg)',
        'open-bg': 'var(--status-open-bg)',
        'full-fg': 'var(--status-full-fg)',
        'full-bg': 'var(--status-full-bg)',
        'confirmed-fg': 'var(--status-confirmed-fg)',
        'confirmed-bg': 'var(--status-confirmed-bg)',
        'in-progress-fg': 'var(--status-in-progress-fg)',
        'in-progress-bg': 'var(--status-in-progress-bg)',
        'completed-fg': 'var(--status-completed-fg)',
        'completed-bg': 'var(--status-completed-bg)',
        'cancelled-fg': 'var(--status-cancelled-fg)',
        'cancelled-bg': 'var(--status-cancelled-bg)',
        'expired-fg': 'var(--status-expired-fg)',
        'expired-bg': 'var(--status-expired-bg)',
      },

      // AI Confidence Chips
      confidence: {
        'high-fg': 'var(--confidence-high-fg)',
        'high-bg': 'var(--confidence-high-bg)',
        'medium-fg': 'var(--confidence-medium-fg)',
        'medium-bg': 'var(--confidence-medium-bg)',
        'low-fg': 'var(--confidence-low-fg)',
        'low-bg': 'var(--confidence-low-bg)',
      },
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      DEFAULT: '0.375rem',
      md: '0.375rem',
      lg: '0.5rem',      // 8px - buttons, inputs, selects, dialogs
      xl: '0.75rem',     // 12px - cards, sheets, containers
      '2xl': '1rem',
      full: '9999px',    // pills, avatars, badges
    },
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
