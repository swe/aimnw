# Interface Design System — aimnw

## Direction
Japandi sport hub: soft neutrals, quiet contrast, training-data clarity. Color means training load / HR intensity, not decoration.

## Naming
- Page heading and Home panel: `{year} year in training` / `This year in training` (never “Sport”)
- Nav and in-copy links: `Training` → `/sport`

## Depth
Borders-only with whisper-quiet surfaces (`--color-surface` → `--color-surface-raised`). Soft shadow only for floating tooltips (`--shadow-soft`).

## Spacing
Base unit: 4px via `--space-*` tokens.

## Cards and tiles
Site-wide with `Panel` and the training hub:
- Outer section: `--radius-md`, `--color-surface-raised`, `1px` `--color-border-subtle`, padding `--space-5`
- Inner tiles (KPIs, body sparks, weekly mix rows): `--radius-md`, `--color-surface`, same subtle border, padding `--space-3`
- Shared shell: `src/components/domain/sport/sportShell.module.css` (`.card`, `.title`, `.header`, `.sub`)

## Section headers
Training sections match “Key signals this week”:
- `font-size: var(--text-xs)`, weight `600`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: var(--color-fg-subtle)`
- Optional right-aligned `.sub` in `--color-fg-muted` (e.g. Trends window)

## Semantic trend color
Use tokens, not mixed hex:
- `--color-positive: #2f6b45`
- `--color-negative: #8a3d52`
- `--color-caution: #9a7b4a` (flat / stable)
HR zone spectrum stays the Z1–Z5 exception (meaning = intensity).

## Sport page tooltips
Page-wide rule for chart and KPI details:
- Hover only — never open or stick on click/focus
- No sibling dimming, desaturation, or “other charts become less colorful”
- Prefer CSS hover panels over native `title` and over click-to-open annotation panels
- Edge-aware anchoring (`start` / `mid` / `end`, and above/below when needed)

Applies to: KPI hints, HR zone weeks, long-run weeks.

## Activity heatmap
- Day intensity: one level step per session (gym from Hevy + non-gym mock / GPX sessions); darker = more sessions
- Click a past/today cell to expand that day’s session list below the grid; click again or × to collapse
- No hover tooltips — the expanded panel is the detail surface
- Future days are non-interactive (muted, no pointer)
- Expanded day panel: date + totals header, then icon + title (no kind tag), bpm / time / Z-zone meta, duration (or distance · duration + pace) on the right

## Sport HR zones
Bright spectrum for Z1–Z5 (recovery → VO₂), tokens `--hrz-1`…`--hrz-5` and `--hrz-*-ink`:
- Z1 `#4ea3e6` / ink `#2b7cb5`
- Z2 `#2bb56f` / ink `#1a8a54`
- Z3 `#f0c01e` / ink `#a67c08`
- Z4 `#f06d2c` / ink `#c45418`
- Z5 `#e44552` / ink `#c43340`

Shared legend (`hrZones.module.css`): round 0.45rem swatch + bold ink `Z#` + percent. Same fills and legend on the weekly strip, session detail bars, and Z labels in heatmap / weekly mix rows.

### Weekly strip charts
- Week labels on a separate axis (not inside columns); skip adjacent final ticks that would collide.
- Tooltip content for HR zones: week number, date range, total duration, per-zone % + duration with swatches.

## Body composition
Three tiled sparklines (Weight, Body fat, Muscle mass) inside the section card:
- Inner tiles use `--color-surface` + subtle border (same language as KPI tiles)
- Each series uses the last 50 chronological readings
- Header shows current value + trend icon; color is favorable / unfavorable / neutral
- Line + area only (no point markers)
- While Hevy has fewer than 50 readings, `hevyBodyMock` supplies a 50-point series with intentional good / bad / flat trends
- Muscle mass falls back to `weight × (1 − fat%)` when lean mass is missing
