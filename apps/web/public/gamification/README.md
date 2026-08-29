# gamification assets ("Плотина Тиши")

Drop the exported images here with these exact names. `DamScene` / `MilestoneCard`
reference them via `next/image` at `/gamification/<name>`.

Decided: Тиша stays IN each stage scene, so there is no separate sprite composited
on top of the scene. The `today` sprites are shown small beside the status line,
not overlaid on the illustration.

## Stage scenes (square 1:1, transparent edges)

| file | stage | scene |
|---|---|---|
| `stage-1.png` | 1 first_twig | one twig into a small stream |
| `stage-2.png` | 2 weir | logs starting to pool the water |
| `stage-3.png` | 3 dam | finished dam of interwoven branches, first cattails |
| `stage-4.png` | 4 pond | calm pond behind the dam, reeds and lily pads |
| `stage-5.png` | 5 lodge | cozy lodge at the pond edge |
| `stage-6.png` | 6 seasons | lodge + pond, neutral season (fallback for stage 6) |

## Stage 6 seasonal (square 1:1) — optional, second pass

`stage-6-spring.png` · `stage-6-summer.png` · `stage-6-autumn.png` · `stage-6-winter.png`

## Today sprites (character only, transparent, small)

`tisha-today-added.png` — placing a twig, mid-motion
`tisha-today-done.png` — sitting content, paws folded
`tisha-today-pending.png` — looking toward the water, inviting (3/4 view, not from behind)
`tisha-welcome-back.png` — a small warm wave (shown after a 14+ day gap)

## Milestone cards (landscape, consistent ratio) — second pass

`milestone-1.png` … `milestone-6.png` — warmer-lit close-ups of stage scenes 1..6.
The confetti burst is code (canvas-confetti), never baked into the image.
