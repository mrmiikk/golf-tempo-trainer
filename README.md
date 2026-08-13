# Golf Swing Tempo Trainer

A mobile-first, dark-theme web app for training golf swing tempo using the
Tour Tempo method: three audible clicks per swing (START / TOP / IMPACT) in
a fixed backswing:downswing ratio, not an evenly spaced metronome.

## Features

- **Tempo Trainer** — 5 presets (18/6, 21/7, 24/8, 27/9, 30/10, all 3:1),
  a Custom mode for arbitrary frame ratios, adjustable rest between swings,
  a proportional swing timeline, and flashing START/TOP/IMPACT indicators.
- **Tempo Finder** — measure your natural tempo with a 3-tap gesture, see
  the nearest matching preset, and track your last few swings.

## Timing

All timing is computed at a 30fps reference (`frames / 30 = seconds`) and
scheduled with the Web Audio API's `AudioContext.currentTime`, using a
look-ahead scheduler rather than chained `setTimeout` calls, so the rhythm
doesn't drift across repeated swings.

## Stack

React + TypeScript + Vite. No backend, no database, no auth. Swing history
in Tempo Finder is stored in `localStorage`.

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```
