# Color Scheme Configuration

This app uses a centralized color configuration for easy experimentation.

## Configuration File

Edit `/app/lib/colors.ts` to change the entire app's color scheme.

## Current Colors

```typescript
{
  bg: {
    primary: '#ffffff',    // Main background (white)
    secondary: '#fafafa',  // Secondary background (light gray)
  },
  text: {
    primary: '#171717',    // Main text (near black)
    secondary: '#737373',  // Muted text (gray)
  },
  border: '#e5e5e5',       // All borders
  accent: {
    primary: '#0070f3',    // Primary buttons, links, active states (Vercel blue)
    hover: '#0761d1',      // Hover state for accent
  },
  status: {
    success: '#16a34a',    // Success states (green)
    error: '#dc2626',      // Error states (red)
    warning: '#f59e0b',    // Warning states (orange)
  }
}
```

## Quick Color Scheme Presets

### Vercel Style (Current)
- Accent: `#0070f3` (blue)

### Linear Style
- Accent: `#5E6AD2` (purple-blue)
- Update `colors.accent.primary` to `#5E6AD2`
- Update `colors.accent.hover` to `#4F5CC0`

### GitHub Style
- Accent: `#2DA44E` (green)
- Update `colors.accent.primary` to `#2DA44E`
- Update `colors.accent.hover` to `#238636`

### Minimal Black
- Accent: `#171717` (black)
- Update `colors.accent.primary` to `#171717`
- Update `colors.accent.hover` to `#404040`

## How to Change

1. Open `/app/lib/colors.ts`
2. Modify the color values
3. Save the file
4. Refresh your browser

That's it! All components use these centralized values.
