# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## 2026-11-10 · Fix sign-in and study-group endpoints
- Goal: Make AC-14 through AC-16 endpoint tests pass.
- Delegated: No.
- Checkpoints: Read the project instructions and Slice 1 criteria; ran `npm test` and reproduced the login failure; corrected the seeded account hash; reran `npm test` successfully (4/4).
- Went wrong: The seeded account used a placeholder hash, causing login to throw instead of returning a response.
- Changed by hand: Updated `src/db/database.js` to seed and repair the known placeholder account hash, and `src/services/authService.js` to reject malformed stored hashes safely.
