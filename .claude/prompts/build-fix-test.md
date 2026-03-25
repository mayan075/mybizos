# Autonomous Build-Fix-Test Loop for MyBizOS

You are running an autonomous session on the MyBizOS monorepo. Your job is to make the codebase build cleanly, pass all tests, and be deployment-ready — with zero human input.

## Phase 1: Assess Current State

Run these commands and record the results:

```bash
# 1. Check git status
git status

# 2. Install dependencies
pnpm install

# 3. Try building the web app
cd apps/web && npx next build 2>&1 | tail -50

# 4. Try TypeScript check on API
cd apps/api && npx tsc --noEmit 2>&1 | tail -50

# 5. Run existing tests
cd /home/user/mybizos && pnpm test 2>&1 | tail -80

# 6. Check for TypeScript errors across all packages
npx turbo run typecheck 2>&1 | tail -50
```

Categorize every error you find into:
- **Build errors** (import failures, missing modules, type errors that block compilation)
- **Test failures** (failing assertions, broken test fixtures)
- **Lint/style issues** (can be fixed last)

## Phase 2: Fix Build Errors (Priority 1)

Fix ALL build errors before doing anything else. Common patterns in this repo:

1. **Missing imports** — check if the export exists in the source package. If not, create it.
2. **Type mismatches** — follow the Drizzle schema as source of truth for DB types. Use Zod schemas for API types.
3. **Module not found** — check `package.json` dependencies, run `pnpm install` if needed.
4. **Next.js App Router issues** — ensure server components don't use hooks, client components have `'use client'` directive.
5. **shadcn/ui component missing** — if a component is imported but doesn't exist in `components/ui/`, scaffold it or install it via `npx shadcn@latest add <component>`.

**After each fix:** Run the specific build command again to verify it passes before moving on.

## Phase 3: Fix Test Failures (Priority 2)

1. Run `pnpm test` (or `vitest run` in the relevant package)
2. For each failing test:
   - Read the test file AND the source file it tests
   - Determine if the **test is wrong** (outdated expectations) or the **code is wrong** (bug)
   - Fix the correct side — prefer fixing code bugs over weakening tests
3. If a feature has NO tests, add at least one basic test covering the happy path
4. Re-run all tests after fixes — must be 100% green

## Phase 4: Code Quality Pass

1. Look for `console.log` statements in production code — replace with proper logger or remove
2. Check for `any` types — replace with proper types
3. Check for `@ts-ignore` / `@ts-expect-error` — fix the underlying type issue
4. Verify all API routes have Zod validation on inputs
5. Verify all DB queries use `withOrgScope(orgId)` for multi-tenant tables

## Phase 5: Verify Everything Works Together

Run the FULL verification suite:

```bash
# Full build
cd /home/user/mybizos/apps/web && npx next build

# Full typecheck
cd /home/user/mybizos/apps/api && npx tsc --noEmit

# Full test suite
cd /home/user/mybizos && pnpm test

# Verify no uncommitted changes are left
git status
```

ALL must pass. If anything fails, go back to the relevant phase and fix it.

## Phase 6: Commit, Push, Verify Deploy

1. Stage and commit changes with descriptive messages following the format:
   ```
   type(scope): description
   ```
   Group related fixes into logical commits (don't make one giant commit).

2. Push to the current branch.

3. After pushing, check Vercel deployment status:
   ```bash
   vercel ls | head -5
   ```
   If the deploy fails, pull the logs, fix the issue, and push again.

## Rules

- **Never skip a failing test** — either fix the code or fix the test
- **Never use `@ts-ignore`** — fix the actual type
- **Never use `any`** — use proper types
- **Never leave a broken build** — if you can't fix something, revert that change
- **Commit often** — small, logical commits are better than one massive commit
- **If truly stuck on something** — note it in `docs/needs-mayan.md` and move on
- **Always check your work** — build after fixing, test after fixing, verify after pushing

## Loop Until Done

Repeat Phases 2-5 until:
- [ ] `next build` passes with 0 errors
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] All tests pass (100% green)
- [ ] No `any` types, no `@ts-ignore`, no `console.log` in production code
- [ ] All changes committed and pushed
- [ ] Deployment verified

Then write an updated `docs/morning-report.md` with:
- Build status (pass/fail for each check)
- What was fixed this session
- Current stats (pages, tests, LOC)
- Anything that still needs human attention
