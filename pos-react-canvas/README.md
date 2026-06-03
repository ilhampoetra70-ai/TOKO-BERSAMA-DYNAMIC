# POS React Canvas

This folder contains the React decomposition of `POS_UI_CANVAS.html`.

The goal is to keep the canvas split into implementation-ready pieces:

- `src/App.tsx` owns the state machine.
- `src/components/Topbar.tsx` owns the shell header.
- `src/components/ControlPanel.tsx` owns the canvas controls.
- `src/components/PreviewFrame.tsx` owns the viewport preview.
- `src/components/views/*` owns the POS, admin, and price-checker screens.
- `src/components/StateRail.tsx` owns the compact status rail.
- `src/components/RecoveryModal.tsx` owns the sensitive-action modal.

The code is written as a Vite-friendly React/TypeScript scaffold and can be moved into the real app later.
