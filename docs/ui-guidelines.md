# PlayMatch UI Guidelines & Design System

## 1. Palette & Contrast Guarantees (WCAG AA >= 4.5:1)
PlayMatch uses **Option B (Electric Amber & Ink)** with light mode by default, adhering strictly to system preference and user toggle overrides.

- **Primary Action**: `#c2410c` (deep burnt amber) on light mode provides **5.18:1** contrast against white `#ffffff`. In dark mode, `#f97316` provides **6.83:1** against `#0b0f19`.
- **Text Primary**: `foreground` (`#0f172a` light / `#f8fafc` dark) $\ge 17:1$.
- **Text Muted**: `muted-foreground` (`#475569` light / `#94a3b8` dark) $\ge 7:1$.
- **Borders & UI Boundaries**: Input borders (`#64748b` light / `#6b7280` dark) and focus rings $\ge 3.0:1$.
- **Warning**: `#a16207` (distinct amber-yellow, distinguishable from brand orange).

## 2. Geometry & Radii
- Major Cards & Containers: `rounded-xl` (`12px` / `0.75rem`)
- Buttons, Inputs, Dialogs, Selects: `rounded-lg` (`8px` / `0.5rem`)
- Badges, Avatars, Pills: `rounded-full` (`9999px`)

## 3. Game Status Indicators (Color + Icon + Label)
Never rely on color alone. Always use `<StatusBadge status={status} />`:
1. `open`: Green chip (`#14532d` on `#dcfce7`) with `user-plus` icon.
2. `full`: Amber/yellow chip (`#713f12` on `#fef08a`) with `users` icon.
3. `confirmed`: Blue chip (`#1e3a8a` on `#dbeafe`) with `check-circle` icon.
4. `in_progress`: Orange-neutral chip (`#7c2d12` on `#ffedd5`) with `play-circle` icon.
5. `completed`: Slate chip (`#334155` on `#f1f5f9`) with `flag` icon.
6. `cancelled`: Red chip (`#7f1d1d` on `#fee2e2`) with `x-circle` icon.
7. `expired`: Grey chip (`#1f2937` on `#f3f4f6`) with `clock` icon.

## 4. Architectural Isolation Rules
1. **No Radix or Lucide outside `components/ui/`**: All icons must use `<Icon name="..." />` from `components/ui`.
2. **Replaced Colors**: The Tailwind configuration completely replaces default colors. Only semantic tokens (`bg-bg`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.) are permitted.
3. **No Raw Hex / Inline Styles**: Never write inline `style={{ ... }}` or arbitrary `bg-[#...]` classes in feature pages.
4. **Shared Formatters**: Use `formatDistance` (never invent `~`), `formatRating` (using the backend-supplied band label), and `formatDate` from `@playmatch/shared`.
