# Vercel/shadcn Design System Aesthetics

A comprehensive guide to reproducing the minimalist, modern design aesthetic inspired by Vercel and shadcn/ui.

## Philosophy

**Minimalism First**: Every element serves a purpose. No decorative flourishes, no unnecessary effects. The design is invisible until it needs to be visible.

**Subtle Interactions**: Transitions are quick (0.15-0.2s) and purposeful. Hover states provide immediate feedback without being distracting.

**Hierarchy Through Restraint**: Visual hierarchy comes from careful use of weight, spacing, and subtle color variations—not bold colors or heavy effects.

---

## Color Palette

### Core Colors

**Light Mode**
```
Backgrounds:
- Primary:   #ffffff (pure white)
- Secondary: #fafafa (barely-there gray)

Text:
- Primary:   #171717 (near-black, not pure black)
- Secondary: #737373 (muted gray for less important text)

Borders:
- Standard: #e5e5e5 (very light gray, barely visible)

Accent:
- Primary: #171717 (same as text primary—unified system)
- Hover:   #404040 (slightly lighter on hover)
```

**Dark Mode**
```
Backgrounds:
- Primary:   #000000 (pure black)
- Secondary: #0a0a0a (barely-there lighter)

Text:
- Primary:   #ededed (off-white)
- Secondary: #a1a1a1 (muted gray)

Borders:
- Standard: #262626 (subtle dark gray)
```

### Semantic Colors

Used sparingly for status and feedback:
```
Success: #16a34a (green-600)
Error:   #dc2626 (red-600)
Warning: #f59e0b (amber-500)
```

### Color Usage Rules

1. **Never use pure black (#000) for text** in light mode—use #171717 instead
2. **Borders should be barely visible**—#e5e5e5 is the standard
3. **Background variations are subtle**—primary (#fff) vs secondary (#fafafa)
4. **Accent colors match text colors**—creates unified, cohesive system
5. **Status colors only appear when needed**—success/error states

---

## Typography

### Font Stack
- **Sans-serif**: System font stack or Geist Sans (Vercel's font)
- **Monospace**: Geist Mono for code

### Text Sizing
```
Extra Small:  10px (badges, labels)
Small:        12px (secondary UI, submenus)
Base:         14px (primary UI, body text)
Medium:       16px (headings, emphasized text)
Large:        20px+ (page titles, hero text)
```

### Font Weights
```
Regular: 400 (default text)
Medium:  500 (interactive elements, subheadings)
Semibold: 600 (active states, emphasis)
```

### Typography Rules

1. **Use font weight for hierarchy**, not size differences
2. **Active/selected states use weight 500-600**
3. **Secondary text uses lighter weight AND color**
4. **Letter spacing**: -0.01em for headings (tight tracking)
5. **Line height**: Tight for UI (1.2-1.4), comfortable for body (1.5-1.6)

---

## Spacing System

### Scale (based on 4px grid)
```
0.5 → 2px   (tight gaps)
1   → 4px   (minimal spacing)
1.5 → 6px   (small gaps)
2   → 8px   (standard small)
2.5 → 10px  (compact spacing)
3   → 12px  (standard medium)
4   → 16px  (comfortable spacing)
5   → 20px  (generous spacing)
6   → 24px  (section spacing)
```

### Padding Patterns
```
Buttons:     px-3 py-2 (12px × 8px)
Inputs:      px-3 py-2 (12px × 8px)
Cards:       p-4 to p-6 (16px-24px)
Containers:  px-6 py-6 (24px all sides)
Sections:    py-8 to py-12 (32px-48px vertical)
```

### Margin Patterns
```
Between elements: 8-12px (space-y-2 to space-y-3)
Between sections: 24-32px (my-6 to my-8)
Page margins:     24px minimum (px-6)
```

---

## Components

### Buttons

**Primary Button**
```
Background:  #171717
Text:        #ffffff
Padding:     12px 16px
Border:      none
Radius:      6px
Font:        14px, weight 500
Transition:  all 0.2s ease

Hover:
- Background: #404040
- No scale/shadow effects

Disabled:
- Background: #e5e5e5
- Text: #a1a1a1
- Cursor: not-allowed
```

**Secondary Button**
```
Background:  transparent
Text:        #171717
Border:      1px solid #e5e5e5
Padding:     12px 16px
Radius:      6px
Font:        14px, weight 500

Hover:
- Background: #fafafa
- Border: #d4d4d4
```

**Ghost Button**
```
Background:  transparent
Text:        #737373
Border:      none
Padding:     8px 12px

Hover:
- Text: #171717
- Background: #fafafa
```

### Input Fields

```
Background:  #ffffff
Border:      1px solid #e5e5e5
Padding:     12px
Radius:      6px
Font:        14px
Text:        #171717

Focus:
- Border: #171717
- No glow/shadow
- Outline: none (use border instead)

Placeholder:
- Color: #a1a1a1
- Font style: normal (not italic)
```

### Cards

```
Background:  #ffffff
Border:      1px solid #e5e5e5
Radius:      8px
Padding:     16-24px
Shadow:      none (or very subtle: 0 1px 2px rgba(0,0,0,0.05))

Hover (if interactive):
- Border: #d4d4d4
- No shadow increase
```

### Navigation Items

**Sidebar Item**
```
Default:
- Background: transparent
- Text: #737373
- Font weight: 400-500
- Padding: 8px 12px
- Radius: 6px

Hover:
- Background: #ffffff (or primary bg)
- Text: #171717

Active:
- Background: #ffffff
- Text: #171717
- Font weight: 600
- Border: 1px solid #e5e5e5
```

**Tab Navigation**
```
Default:
- Border bottom: 2px transparent
- Text: #737373
- Font weight: 400
- Padding: 12px 16px

Active:
- Border bottom: 2px #171717
- Text: #171717
- Font weight: 500
```

### Badges/Pills

```
Background:  #fafafa
Text:        #171717
Padding:     4px 8px
Radius:      4px (fully rounded: 999px)
Font:        11-12px
Font weight: 500

Status Variants:
- Success: bg #dcfce7, text #15803d
- Error:   bg #fee2e2, text #dc2626
- Warning: bg #fef3c7, text #92400e
```

### Modals/Dialogs

```
Backdrop:
- Background: rgba(0, 0, 0, 0.4)
- Animation: fade in 0.2s

Container:
- Background: #ffffff
- Border: 1px solid #e5e5e5
- Radius: 12px
- Padding: 24px
- Max width: 500px
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Animation: fade + scale (0.95 → 1.0) 0.3s

Close button:
- Position: top-right
- Size: 32px
- Icon: X mark
- Color: #737373
- Hover: #171717
```

### Tables

```
Container:
- Border: 1px solid #e5e5e5
- Radius: 8px
- Overflow: hidden

Header:
- Background: #fafafa
- Text: #171717
- Font weight: 600
- Padding: 12px 16px
- Border bottom: 1px solid #e5e5e5

Row:
- Background: #ffffff
- Border bottom: 1px solid #e5e5e5
- Padding: 12px 16px

Row Hover:
- Background: #fafafa

Last row:
- No border bottom
```

---

## Layout Patterns

### Sidebar Navigation

```
Width:       240px
Background:  #fafafa
Border:      1px solid #e5e5e5 (right)
Height:      100vh
Flex:        column

Collapse:
- Width: 0px
- Overflow: hidden
- Transition: 0.3s ease
```

### Page Container

```
Max width:   1280px (or 100% for full-width)
Padding:     24px
Margin:      0 auto
```

### Content Sections

```
Background:  #ffffff
Border:      1px solid #e5e5e5
Radius:      8px
Padding:     24px
Margin:      16px 0
```

---

## Animation & Transitions

### Timing Functions
```
Standard: ease-in-out
Quick:    ease (for micro-interactions)
Entry:    ease-out
Exit:     ease-in
```

### Duration Scale
```
Instant:   50ms  (color changes)
Quick:     150ms (hover states, text color)
Standard:  200ms (backgrounds, borders)
Medium:    300ms (modals, drawers)
Slow:      500ms (layout changes)
```

### Common Animations

**Fade In**
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
Duration: 0.2s
```

**Modal Entry**
```css
@keyframes modalSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
Duration: 0.3s
```

**Page Transition**
```css
@keyframes pageIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
Duration: 0.3s
```

### Animation Rules

1. **Hover transitions are 150-200ms**—fast enough to feel instant
2. **No easing curves longer than cubic-bezier**—keep it simple
3. **Entrance animations are subtle**—4-8px movement max
4. **Never animate on exit unless closing**—just fade out
5. **No bounce, elastic, or attention-seeking effects**

---

## Interaction Patterns

### Hover States

**General Rules**
- Background lightens slightly (#fafafa)
- Text darkens to primary color (#171717)
- Border darkens one shade
- No scale/transform effects
- Transition: 150ms

### Focus States

**Keyboard Navigation**
- Use border color change, not glow
- Border: 2px solid #171717
- No box-shadow outline
- Visible and clear

### Active/Pressed States

**On Click**
- Slightly darker background
- No scale down
- 100ms transition (faster than hover)

### Loading States

**Skeleton Loaders**
```
Background:  #fafafa
Animation:   pulse (opacity 1 → 0.5 → 1)
Duration:    2s infinite
Border:      same as element would have
Radius:      match final element
```

**Spinners**
```
Size:        16-24px
Color:       #171717
Animation:   spin 1s linear infinite
Line width:  2px
```

---

## Iconography

### Icon Style
- **Outline style** (not filled)
- **2px stroke width**
- **24px default size** (scale down to 16px for compact UI)
- **Rounded line caps and joins**
- **Match text color** of surrounding context

### Icon Spacing
- **Gap from text**: 8-10px (0.5rem to 0.625rem)
- **Icon-only buttons**: 32px × 32px touch target minimum

---

## Shadows (Use Sparingly)

```
None:    (default—no shadow)
Subtle:  0 1px 2px rgba(0, 0, 0, 0.05)
Light:   0 1px 3px rgba(0, 0, 0, 0.1)
Medium:  0 4px 6px rgba(0, 0, 0, 0.1)
Heavy:   0 10px 15px rgba(0, 0, 0, 0.1)
```

**When to Use Shadows**
- Modals/dialogs: medium
- Dropdown menus: light
- Cards: none or subtle
- Buttons: never
- Popovers: light

---

## Border Radius Scale

```
Small:   4px  (badges, pills)
Default: 6px  (buttons, inputs)
Medium:  8px  (cards, containers)
Large:   12px (modals, large panels)
Full:    9999px (circular buttons, pills)
```

---

## Responsive Breakpoints

```
Mobile:       < 640px
Tablet:       640px - 1024px
Desktop:      1024px+
Wide:         1280px+
```

### Mobile Adaptations
- Reduce padding: 16px instead of 24px
- Collapse sidebar to overlay/drawer
- Stack horizontal layouts vertically
- Reduce font sizes slightly (13px base instead of 14px)
- Increase touch targets to 44px minimum

---

## Dark Mode Considerations

### Automatic Switching
```css
@media (prefers-color-scheme: dark) {
  /* Apply dark theme */
}
```

### Dark Mode Colors

**Backgrounds**
- Pure black (#000) for drama
- Slightly lighter (#0a0a0a) for panels
- Very subtle borders (#262626)

**Text**
- Off-white (#ededed) not pure white
- Gray (#a1a1a1) for secondary

**Borders**
- Much darker but still subtle (#262626)

**Key Difference**: Dark mode has higher contrast between elements to maintain readability.

---

## Common Mistakes to Avoid

1. ❌ **Heavy drop shadows**—use subtle borders instead
2. ❌ **Bold accent colors**—keep it monochrome with rare color use
3. ❌ **Complex gradients**—solid colors only
4. ❌ **Slow animations**—keep everything under 300ms
5. ❌ **Scale/transform on hover**—just color/background changes
6. ❌ **Too much border radius**—8px is usually the max
7. ❌ **Pure black text**—use #171717 in light mode
8. ❌ **Thick borders**—1px is standard, 2px for focus only
9. ❌ **Colorful UI elements**—status colors only when needed
10. ❌ **Overly tight spacing**—respect the 4px grid

---

## Design Checklist

When implementing a new component, ensure:

- [ ] Uses colors from centralized palette
- [ ] Border is 1px solid #e5e5e5 (or transparent)
- [ ] Border radius is 6-8px
- [ ] Padding follows 4px grid
- [ ] Font size is 14px (or 12px for compact)
- [ ] Font weight is 400-600 range
- [ ] Hover transition is 150-200ms
- [ ] No drop shadows (except modals)
- [ ] Text color is #171717 or #737373
- [ ] Background is #ffffff or #fafafa
- [ ] Icons are 16-24px outline style
- [ ] Touch targets are 32px+ for interactive elements
- [ ] Animation is subtle and quick
- [ ] Responsive on mobile (16px padding minimum)

---

## Implementation Notes

### CSS Variables Approach
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --text-primary: #171717;
  --text-secondary: #737373;
  --border: #e5e5e5;
  --radius: 8px;
  --transition: 0.2s ease;
}
```

### Tailwind CSS Approach
```javascript
// tailwind.config.js
theme: {
  colors: {
    bg: { primary: '#ffffff', secondary: '#fafafa' },
    text: { primary: '#171717', secondary: '#737373' },
    border: '#e5e5e5',
  },
  borderRadius: {
    DEFAULT: '6px',
    lg: '8px',
    xl: '12px',
  },
  transitionDuration: {
    DEFAULT: '200ms',
    fast: '150ms',
  }
}
```

---

## Inspiration Sources

- **Vercel Dashboard**: vercel.com/dashboard
- **shadcn/ui**: ui.shadcn.com
- **Linear**: linear.app
- **GitHub**: github.com (2023+ design)
- **Raycast**: raycast.com

---

## Summary

The Vercel/shadcn aesthetic is defined by:

1. **Extreme minimalism**—every pixel has purpose
2. **Near-monochrome palette**—black, white, grays
3. **Subtle borders and backgrounds**—barely visible until needed
4. **Quick, purposeful transitions**—150-200ms standard
5. **Typography-driven hierarchy**—weight and spacing over color
6. **No decorative effects**—no shadows, gradients, or transforms
7. **System fonts**—fast loading, native feel
8. **Generous whitespace**—let content breathe
9. **Status colors used sparingly**—only when semantically needed
10. **Dark mode as first-class**—not an afterthought

This creates interfaces that feel fast, professional, and get out of the user's way.
