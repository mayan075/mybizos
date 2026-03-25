# MyBizOS Nonstop Autonomous Improvement Loop

You are running a CONTINUOUS improvement session on MyBizOS. Each cycle you assess, fix, improve, test, and push — then start again. You operate with ZERO human input. If you hit a blocker that requires a human, log it in `docs/action-list.md` and move to the next task.

## The Loop (repeat forever)

### 1. ASSESS (every cycle starts here)

```bash
cd /home/user/mybizos
pnpm install --frozen-lockfile 2>&1 | tail -5
```

Run these checks and record pass/fail:
- `cd apps/web && npx next build 2>&1 | tail -30` → web build
- `cd apps/api && npx tsc --noEmit 2>&1 | tail -30` → api typecheck
- `pnpm test 2>&1 | tail -50` → test suite

Also check:
- `docs/action-list.md` — has the human resolved anything? If items are marked `[DONE]`, act on them (e.g., if DATABASE_URL is now set, run migrations)
- `git log --oneline -5` — what was done recently? Don't repeat work.

### 2. FIX (if anything is broken)

Priority order — stop at the first category that has issues:

**P0 — Build errors:** Fix every error blocking `next build` or `tsc --noEmit`. These are always #1.

**P1 — Test failures:** Fix every failing test. Read BOTH the test file and source file. Fix the correct side (bug in code vs outdated test).

**P2 — Runtime errors:** Look for obvious issues:
- API routes that would crash (missing null checks, unhandled promises)
- Pages that reference undefined variables
- Components importing things that don't exist

After fixing, re-run the relevant check to confirm it passes before moving on.

### 3. IMPROVE (if everything is green)

Pick ONE improvement from this priority list. Do the highest-priority item that hasn't been done yet:

1. **Remove mock/placeholder data** — Find components using hardcoded fake data. Replace with real API calls or proper empty states. Search for: `mock`, `fake`, `dummy`, `placeholder`, `TODO`, `FIXME`, `lorem`, `John Doe`, `jane@`, `555-`, `sample`, `test@test`
2. **Wire disconnected UI** — Find buttons/forms that don't do anything. Wire them to API endpoints. Search for: `onClick={() => {}}`, `onSubmit={() => {}}`, `// TODO`, `alert(`, `console.log(`
3. **Add missing Zod validation** — Find API routes without input validation. Add Zod schemas.
4. **Add missing tests** — Find source files with no corresponding test file. Add at least a basic test.
5. **Remove `any` types** — Search for `: any` and replace with proper types.
6. **Add proper error handling** — Find API routes that don't handle errors consistently. Add try/catch with proper error format.
7. **Improve empty states** — Pages that show blank when there's no data should show helpful empty states with CTAs.
8. **Add loading states** — Pages/components that fetch data should show skeletons or spinners while loading.
9. **Mobile responsiveness** — Check pages for mobile layout issues, fix responsive breakpoints.
10. **Performance** — Find N+1 queries, unnecessary re-renders, missing React.memo, large bundle imports.

**Only do ONE improvement per cycle.** Keep changes small and focused.

### 4. TEST & BUILD

After any changes:
```bash
cd /home/user/mybizos/apps/web && npx next build 2>&1 | tail -20
cd /home/user/mybizos && pnpm test 2>&1 | tail -30
```

If either fails, fix immediately. Do NOT proceed to step 5 with a broken build.

### 5. COMMIT & PUSH

```bash
git add -A
git commit -m "type(scope): description"
git push -u origin <current-branch>
```

Use proper commit types: `fix`, `feat`, `refactor`, `test`, `chore`, `perf`

### 6. UPDATE ACTION LIST

If you hit ANY blocker that needs human input:
- Open `docs/action-list.md`
- Add it under the appropriate section (Blockers, Decisions Needed, or Nice-to-Have)
- Include: what's blocked, what action the human needs to take, what it unblocks, today's date
- Commit and push the updated action list

If you RESOLVED a previous action list item, move it to the Resolved section with today's date.

### 7. UPDATE MORNING REPORT

After every 3-5 improvements, update `docs/morning-report.md` with:
- Current build/test status
- What was fixed/improved this session
- Updated stats
- Current phase completion percentages

### 8. LOOP

Go back to step 1. Pick the next improvement. Keep going.

---

## Rules

- **Never ask the human anything.** If you need input, log it in `docs/action-list.md` and move on.
- **Never break the build.** If your change breaks something, revert it immediately.
- **Small changes.** One improvement per cycle. Don't refactor the whole codebase at once.
- **Don't repeat work.** Check git log before starting. Don't fix what's already fixed.
- **Tests are sacred.** Never delete a passing test. Never weaken an assertion to make it pass.
- **Follow CLAUDE.md rules.** No `any`, no `console.log`, no raw `process.env`, always Zod, always `withOrgScope`.
- **If truly stuck** (same error 3+ attempts), log it in action-list.md and move to something else.
- **Commit after every successful improvement.** Don't batch up changes.
