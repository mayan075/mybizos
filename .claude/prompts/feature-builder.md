# Autonomous Feature Builder for MyBizOS

You are running an autonomous session to build or improve features in MyBizOS. Your goal is to deliver working, tested, deployed code with zero human input.

## Step 1: Understand What Exists

Before writing ANY code:

1. Read `CLAUDE.md` for architecture rules (these are non-negotiable)
2. Read `docs/morning-report.md` for current project status
3. Read `docs/needs-mayan.md` for known blockers
4. Run `pnpm build` to confirm the project builds cleanly BEFORE you start
5. Run `pnpm test` to confirm all tests pass BEFORE you start

If the build is broken, FIX IT FIRST before doing any feature work. Use `/build-fix-test` for that.

## Step 2: Plan the Work

For each feature or improvement:

1. Identify which packages are affected (web, api, db, shared, etc.)
2. Check if related code already exists — NEVER duplicate
3. Plan the changes bottom-up: schema → API → frontend
4. Identify what tests you'll write

## Step 3: Implement (Bottom-Up)

### Database layer (if needed)
- Add/modify schema in `packages/db/src/schema/`
- Generate migration: `pnpm --filter @mybizos/db generate`
- Tables MUST have `org_id` for multi-tenant data

### Shared types/validators (if needed)
- Add Zod schemas in `packages/shared/src/validators/`
- Export types derived from Zod schemas

### API routes (if needed)
- Add routes in `apps/api/src/routes/`
- Every endpoint: Zod input validation, `withOrgScope(orgId)`, consistent error format
- Follow REST: GET (list), POST (create), PATCH (update), DELETE (delete)

### Frontend (if needed)
- Server components by default, `'use client'` only when needed
- Use shadcn/ui components — never raw HTML inputs/buttons
- Wire to API using proper fetch with error handling

### Tests (required)
- At least 1 test per new feature
- Test the happy path AND one error case
- Put tests next to source: `feature.test.ts` alongside `feature.ts`

## Step 4: Verify Loop

After implementing, run this cycle until everything passes:

```
pnpm build → fix errors → pnpm test → fix failures → repeat
```

Do NOT move to Step 5 until build AND tests pass.

## Step 5: Commit and Push

1. Commit with format: `feat(scope): description` or `fix(scope): description`
2. Push to the current branch
3. Verify deployment succeeded

## Step 6: Update Status

Update `docs/morning-report.md` with what you built/fixed.

## Priority Queue (work through in order)

If no specific task is given, work through these priorities:

1. **Fix any build errors** — nothing else matters if it doesn't build
2. **Fix any failing tests** — green suite is the foundation
3. **Remove mock/placeholder data** — replace with real API calls or proper empty states
4. **Connect features to real APIs** — forms that don't submit, buttons that don't work
5. **Add missing tests** — target files with 0 test coverage
6. **Add missing Zod validation** — API routes without input validation
7. **Add missing error handling** — API routes that don't handle failures gracefully
8. **UI polish** — loading states, error states, empty states, responsive design
