# 2048 NEON - Full Folder (Fixed: Can't Click Same Button Twice)

Homepage + Sliding Animation + Score Tracking + Repeat-Click Fix

## Install & Run
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Build
```bash
npm run build
npm run preview
```

## Fix in this version
- Arrow buttons NEVER disabled, can be clicked repeatedly / same arrow many times. If no move possible, board does a tiny shake so you see the click registered.
- PLAY / New Game / Undo / Home / Scores all work repeatedly. PLAY -> Home -> PLAY works. New Game x3 works. Undo x3 works.
- Overlays fully unmount on close, no invisible backdrop blocking clicks.
- No saved-flag blocking second click. Moves use functional setState so rapid clicks work.
- Every button has press animation (:active scale).

## Note on 2048 logic (normal, not a bug)
If tiles are already pushed all the way Right, pressing Right again does nothing until you move another direction first. That's real 2048 rules.
