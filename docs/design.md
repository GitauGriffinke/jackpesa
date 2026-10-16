# Jackpesa Design System

## Color tokens (cream and amber, light theme)

| Token | Hex | Use |
|---|---|---|
| --color-page | #FDFBF7 | Page background |
| --color-surface | #FFFFFF | Inputs, modals |
| --color-card | #EFECE6 | Cards, balance panels |
| --color-accent | #D97706 | Primary buttons, wins, balance figures |
| --color-accent-hover | #F59E0B | Button hover |
| --color-text | #1F2937 | Primary text, button text on amber |
| --color-text-muted | #4B5563 | Secondary text |
| --color-banner-bg | #FEF3C7 | Demo banner background |
| --color-banner-text | #92400E | Demo banner text |
| --color-danger | #B91C1C | Error messages |

## Contrast rules (WCAG AA, 4.5:1 for body text)
- Charcoal on amber: passes (about 4.6:1). Use this for button labels.
- White on amber: fails (about 3.2:1). Never use for text.
- Muted text on card: passes (about 6.4:1).
- Danger on white: passes (about 6.5:1).

## Type
- Font: system-ui sans-serif stack.
- H1 24px bold, H2 20px semibold, body 16px, caption 14px.

## Components (to build)
- Button: primary (amber, charcoal label), secondary (outline), disabled, visible focus ring.
- Input: visible label, error state, +254 prefix for phone, show/hide password.
- Card: cream surface, rounded-2xl, p-6.
- Banner: demo notice, always visible.
