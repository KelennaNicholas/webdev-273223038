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

## 2026-11-10 · Slice 2 autonomy
- Goal: Set autonomy boundaries for the study-group joining feature.
- Autonomy: The agent may complete only one step from a plan I have reviewed. It must stop for my review before writing code and after each step; I review every diff and make all commits.
- Checkpoints: Approve the written plan before implementation; run `npm test` and inspect the diff after each step; stop and ask before any action listed under "Always ask before" in `AGENTS.md`.
- Went wrong: Nothing; this entry records boundaries before implementation.
- Changed by hand: Added the Slice 2 autonomy and review checkpoints to the agent log.

## 2026-23-11 · Exercise 3 plan
Goal: a written plan for the booking feature, no code
Autonomy: the agent works alone within one step of the plan; I read the diff before every commit
Checkpoints: plan review before any code, npm test green before each commit, a permission prompt for everything in "Always ask before"