# Kanboard — UI & Design System Guidelines

This document outlines the visual language, typography, color system, and layout principles of the Kanboard frontend.

---

## 🎨 Theme & Color System

Kanboard uses a curated, premium light theme. Do not introduce generic colors (plain red, plain blue). Use the established design system tokens.

### Color Palette (Tailwind / CSS Variables)
*   **Page Background (`bg-page`)**: A soft, calming lavender off-white page background (`#f8f7fa`).
*   **Surfaces (`bg-surface`)**: Pure white `#ffffff`. Surfaces should look like they are floating above the page.
*   **Iris/Brand Accent (`text-brand`)**: A vibrant indigo/lavender hue (`#635bff`).
*   **Text Colors**:
    *   `text-ink`: Pitch black `#0e0d12` (used for headings, titles).
    *   `text-muted`: Soft charcoal `#5c5a66` (used for labels, metadata, body text).
    *   `text-faint`: Warm gray `#a2a0ab` (used for inactive icons, placeholders).
*   **Borders (`border-line`)**: Thin, crisp borders (`#efedf5`).

### Shadows (Restraint + Depth)
Do not use harsh, dark shadows. Use soft, multi-layered shadows to convey elevation:
```css
--shadow-soft: 0 2px 8px -1px rgba(14, 13, 18, 0.03), 0 8px 24px -4px rgba(14, 13, 18, 0.05);
--shadow-brand: 0 4px 14px 0 rgba(99, 91, 255, 0.35);
```

---

## 🔤 Typography

Kanboard uses a combination of modern display and highly legible body typefaces:

1.  **Display Font (Headers, Titles)**: **Space Grotesk**
    *   Used for board headers, card titles, hero text.
    *   Confident, slightly geometric, tracking-tight.
2.  **Body Font (Paragraphs, Code, Details)**: **Inter**
    *   Clean, highly legible at small sizes.

### Font Styles:
*   Page Heading: `font-display text-2xl font-bold tracking-tight text-ink`
*   Task Card Title: `font-display text-sm font-semibold text-ink`
*   Metadata Label: `font-sans text-xs font-medium text-muted`

---

## 📐 Spacing & Layout Rules

*   **Border Radius**: Kanboard uses generous rounding.
    *   Cards & Modals: `rounded-3xl` (24px).
    *   Buttons & Inputs: `rounded-full` (9999px) or `rounded-2xl` (16px) for larger buttons.
    *   Avatars: `rounded-full`.
*   **Layout Container**:
    *   Sidebar: Collapsible sidebar with standard widths (`w-64` expanded, `w-16` collapsed).
    *   Board Wrapper: Horizontal scrolling list with padding `px-6 py-6`.
*   **Micro-interactions**:
    *   Hovering over any card should cause a subtle upward translation and deepen the shadow:
        `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]`
    *   Buttons should scale down slightly when pressed:
        `active:scale-[0.98] transition-transform`
