# MyBizOS Quality Audit Report

**Date:** 2026-03-22
**Auditor:** Claude Code (Opus 4.6)
**Scope:** Full codebase audit of apps/web and apps/api

---

## Build & Compilation Status

| Check | Result |
|-------|--------|
| `apps/web` TypeScript (`tsc --noEmit`) | PASS - zero errors |
| `apps/web` Next.js build (`next build`) | PASS - 34 pages generated successfully |
| `apps/api` TypeScript (`tsc --noEmit`) | FAIL - 2 errors in `src/routes/sequences.ts` |

---

## 1. CRITICAL (Blocks Usage)

### C1. API TypeScript Errors in sequences.ts
**File:** `apps/api/src/routes/sequences.ts` (lines 107, 121)
**Issue:** `SequenceStepConfig` discriminated union type mismatch. The `steps` array from Zod parsing produces `string | undefined` for fields like `prompt`, but `AiDecisionStepConfig` requires `string` (non-optional). This will cause the API to fail to compile in strict mode and blocks deployment.

### C2. Missing page: `/dashboard/reviews/[id]`
**Location:** `apps/web/src/app/dashboard/reviews/[id]/` -- directory exists but contains NO `page.tsx` file.
**Impact:** Clicking any individual review link will produce a Next.js 404 error. The directory is empty.

---

## 2. BROKEN (Doesn't Work)

### B1. "Forgot password?" link points to /login (itself)
**File:** `apps/web/src/app/(auth)/login/page.tsx` (line 171)
**Issue:** `<Link href="/login">Forgot password?</Link>` links back to the login page. There is no `/forgot-password` or `/reset-password` route. Clicking it reloads the same page with no effect.

### B2. Logout goes to /login instead of clearing token
**File:** `apps/web/src/components/layout/header.tsx` (line 301)
**Issue:** `router.push("/login")` is called but `removeToken()` is never called. The JWT stays in localStorage and the cookie. The user can navigate back to `/dashboard` and still be "logged in." Should call `removeToken()` from `@/lib/auth` before redirecting.

### B3. Header "Profile" button goes to /dashboard/settings (no profile page)
**File:** `apps/web/src/components/layout/header.tsx` (lines 285-289)
**Issue:** Both "Profile" and "Settings" buttons in the user dropdown navigate to `/dashboard/settings`. There is no dedicated profile page. The Profile button should either go to a profile-specific route or open the General tab with user profile fields.

### B4. Footer links to non-existent pages
**File:** `apps/web/src/app/page.tsx` (lines 833-855)
**Issue:** The landing page footer has `<Link>` elements pointing to:
- `/about` -- does not exist (404)
- `/contact` -- does not exist (404)
- `/privacy` -- does not exist (404)
- `/terms` -- does not exist (404)

### B5. Settings page "Save Changes" does not persist data
**File:** `apps/web/src/app/dashboard/settings/page.tsx`
**Issue:** All form inputs use `defaultValue` (uncontrolled). The "Save Changes" button only shows a toast message ("Settings saved successfully") but does not read or submit the form values anywhere. Changes are lost on page navigation.

### B6. Settings integrations use `window.location.href` instead of Next.js router
**File:** `apps/web/src/app/dashboard/settings/page.tsx` (lines 479, 488)
**Issue:** Integration "Set Up" and "Configure" buttons use `window.location.href = integration.configUrl` which causes a full page reload instead of client-side navigation. Should use `router.push()`.

---

## 3. INCOMPLETE (Placeholder / Non-functional)

### I1. Contacts "Filter" button shows toast only
**File:** `apps/web/src/app/dashboard/contacts/page.tsx` (line 317)
**Issue:** Filter button shows "Filters coming soon" toast. No actual filtering UI exists.

### I2. Contacts "Export" button shows toast only
**File:** `apps/web/src/app/dashboard/contacts/page.tsx` (line 323)
**Issue:** Export button shows a toast but does not actually generate or download a CSV file.

### I3. Contacts row action menu (three-dot) shows toast only
**File:** `apps/web/src/app/dashboard/contacts/page.tsx` (line 444)
**Issue:** The MoreHorizontal button on each contact row just shows `Actions for {name}` toast. No dropdown menu with edit/delete/call actions.

### I4. Pipeline deal card action button does nothing
**File:** `apps/web/src/app/dashboard/pipeline/page.tsx` (line 275)
**Issue:** The MoreHorizontal button on deal cards has no onClick handler at all. It's a visual-only button.

### I5. Inbox attachment and emoji buttons are non-functional
**File:** `apps/web/src/app/dashboard/inbox/page.tsx` (lines 330-334)
**Issue:** Paperclip (attachment) and Smile (emoji) buttons have no onClick handlers.

### I6. Inbox thread "more" button is non-functional
**File:** `apps/web/src/app/dashboard/inbox/page.tsx` (line 258)
**Issue:** MoreHorizontal button in conversation thread header has no onClick handler.

### I7. All sidebar data is hardcoded mock data
**File:** `apps/web/src/components/layout/sidebar.tsx` (lines 185-197)
**Issue:** User info at bottom of sidebar is hardcoded as "John Smith" / "Acme HVAC". Should come from auth context.

### I8. Header org name and user initials are hardcoded
**File:** `apps/web/src/components/layout/header.tsx` (lines 147, 270, 279-281)
**Issue:** "Acme HVAC", "JS" initials, "John Smith", and "john@acmehvac.com" are all hardcoded. Should come from auth context.

### I9. Notification data is hardcoded in header
**File:** `apps/web/src/components/layout/header.tsx` (lines 28-106)
**Issue:** All 7 notifications are hardcoded mock data. No API integration for real notifications.

### I10. Settings billing data is all hardcoded
**File:** `apps/web/src/app/dashboard/settings/page.tsx` (lines 501-578)
**Issue:** Plan details, payment method, usage stats, and invoices are all hardcoded. No Stripe integration.

### I11. Settings integrations all show as "not connected"
**File:** `apps/web/src/app/dashboard/settings/page.tsx` (lines 450-497)
**Issue:** All integrations are hardcoded with `connected: false`. Most "Set Up" buttons show "coming soon" toast.

### I12. Floating dialer is UI-only
**File:** `apps/web/src/components/dialer/floating-dialer.tsx`
**Issue:** The dialer renders a call UI but has no Twilio/Vapi integration. Calls are simulated with timeouts.

### I13. Command palette has limited commands
**File:** `apps/web/src/components/layout/command-palette.tsx`
**Issue:** Only 6 navigation commands. No search for contacts, deals, or other entities. No action commands (create contact, etc.).

### I14. Campaigns, Sequences, Automations, Forms, Invoices, Estimates, Social, Team pages are Phase 2 features
**CLAUDE.md Rule Violation:** Line 99 states "Do NOT build features from Phase 2+  (campaigns, workflows, forms, invoicing, etc.)." However, full pages exist for all of these in the sidebar and are fully built with mock data. While they work as UI, they violate the project rules.

---

## 4. COSMETIC (Looks Wrong / Minor Issues)

### S1. Inbox badge hardcoded to "3"
**File:** `apps/web/src/components/layout/sidebar.tsx` (line 48)
**Issue:** Inbox shows a static badge of "3" regardless of actual unread count.

### S2. setup-wizard.tsx is placed inside app/ pages directory
**File:** `apps/web/src/app/dashboard/settings/phone/setup-wizard.tsx`
**Issue:** This is a reusable component, not a page. It should be in `components/phone/` with the other phone components. Being in `app/` is confusing but doesn't break anything since Next.js only treats `page.tsx` as routes.

### S3. Landing page uses raw HTML elements instead of shadcn/ui
**File:** `apps/web/src/app/page.tsx`
**Issue:** CLAUDE.md Rule 4 says "shadcn/ui for ALL UI components -- never raw HTML elements for buttons, inputs, dialogs." The landing page uses raw `<button>`, `<a>`, `<input>` elements throughout. This is acceptable for a public-facing landing page but technically violates the rule.

### S4. Login/Register forms use raw HTML inputs instead of shadcn/ui
**Files:** `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx`
**Issue:** Same as S3 -- raw `<input>`, `<select>`, `<button>` elements instead of shadcn/ui components.

### S5. Dashboard layout is "use client" (entire dashboard tree is client-rendered)
**File:** `apps/web/src/app/dashboard/layout.tsx`
**Issue:** CLAUDE.md Rule 5 says "Server components by default." The dashboard layout is `"use client"` which forces all child pages to be client-rendered. This is understandable (layout has interactive state for command palette), but it means no dashboard page benefits from server rendering.

---

## 5. MISSING (Not Built Yet)

### M1. No forgot-password / reset-password flow
No `/forgot-password` or `/reset-password` route exists. The login page links to `/login` as a placeholder.

### M2. No /about, /contact, /privacy, /terms pages
Footer links on the landing page lead to 404s.

### M3. No real auth backend (Better Auth not integrated)
**File:** `apps/web/src/middleware.ts` (lines 59-69)
**Issue:** Auth middleware is bypassed on localhost AND all Vercel deployments (`shouldSkipAuth` returns true). The auth flow (login/register) hits the API at `/auth/login` and `/auth/register`, which exist in Hono, but there's no database or Better Auth setup. Currently mock-only.

### M4. No database connection
**File:** `apps/api/src/config.ts`
**Issue:** `DATABASE_URL` defaults to empty string in development. No Drizzle migrations, no schema files in `packages/db/`. The entire data layer is mock services.

### M5. No test files anywhere
**CLAUDE.md Rule 6:** "Every new feature must include at least 1 test." There are zero test files in the entire repo (`*.test.ts`, `*.spec.ts`).

### M6. No `/dashboard/reviews/[id]` page
Directory exists but is empty. See C2 above.

### M7. Activity page exists but is not in sidebar navigation
**File:** `apps/web/src/app/dashboard/activity/page.tsx` exists and works, but there is no sidebar link to `/dashboard/activity`. It is only reachable via a link in the notifications page.

---

## Route Mapping Summary

### All sidebar links and their status:

| Sidebar Link | Route | Status |
|-------------|-------|--------|
| Dashboard | `/dashboard` | Working |
| Contacts | `/dashboard/contacts` | Working (mock data) |
| Pipeline | `/dashboard/pipeline` | Working (mock data, drag-drop works) |
| Inbox | `/dashboard/inbox` | Working (mock data, send works locally) |
| Calls | `/dashboard/calls` | Working (mock data) |
| Scheduling | `/dashboard/scheduling` | Working (mock data, booking works locally) |
| Campaigns | `/dashboard/campaigns` | Working (Phase 2 violation) |
| Sequences | `/dashboard/sequences` | Working (Phase 2 violation) |
| Automations | `/dashboard/automations` | Working (Phase 2 violation) |
| Reviews | `/dashboard/reviews` | Working (but [id] detail page missing) |
| Social | `/dashboard/social` | Working (Phase 2 violation) |
| Forms | `/dashboard/forms` | Working (Phase 2 violation) |
| Invoices | `/dashboard/invoices` | Working (Phase 2 violation) |
| Estimates | `/dashboard/estimates` | Working (Phase 2 violation) |
| Team | `/dashboard/team` | Working (mock data) |
| Analytics | `/dashboard/analytics` | Working (mock data) |
| Settings | `/dashboard/settings` | Working (doesn't persist) |

### Non-sidebar routes:

| Route | Status |
|-------|--------|
| `/` (landing) | Working |
| `/login` | Working (form submits to API) |
| `/register` | Working (form submits to API) |
| `/book/[slug]` | Working (booking flow works with mock data) |
| `/review/[slug]` | Working (star rating works) |
| `/dashboard/notifications` | Working (linked from header bell) |
| `/dashboard/activity` | Working (no sidebar link) |
| `/dashboard/settings/phone` | Working (phone system management) |
| `/portal/*` | Working (customer portal with 5 pages) |

---

## Priority Fix List (Recommended Order)

1. **Fix C2:** Add `page.tsx` to `/dashboard/reviews/[id]/`
2. **Fix B2:** Call `removeToken()` before logout redirect in header
3. **Fix B1:** Create forgot-password route or update link
4. **Fix B4:** Create /about, /contact, /privacy, /terms pages or remove links
5. **Fix C1:** Fix TypeScript errors in `apps/api/src/routes/sequences.ts`
6. **Fix B5:** Wire up settings form to use controlled state and API persistence
7. **Fix B3:** Create a profile page or clarify Profile vs Settings distinction
8. **Fix I7/I8:** Pull user and org data from auth context instead of hardcoding
9. **Fix M5:** Add at least basic tests for critical paths

---

## Summary

- **Total pages audited:** 42 (34 under apps/web, plus portal and public pages)
- **Critical issues:** 2
- **Broken issues:** 6
- **Incomplete issues:** 14
- **Cosmetic issues:** 5
- **Missing features:** 7

The frontend compiles and builds successfully. The UI is well-designed and consistent. The core Phase 1 pages (Dashboard, Contacts, Pipeline, Inbox, Calls, Scheduling, Settings) are all present and functional with mock data fallback. The main concerns are: (1) the missing reviews detail page, (2) the logout not clearing auth state, (3) the forgot-password dead link, (4) footer links to non-existent pages, and (5) significant Phase 2 feature scope creep with campaigns, sequences, automations, forms, invoices, estimates, and social pages all being built despite CLAUDE.md explicitly prohibiting them.
