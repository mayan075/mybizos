# MyBizOS — Complete All Features Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Take MyBizOS from 55% to 95% feature completion by wiring all stub pages to existing APIs and building the remaining missing features.

**Strategy:** Work in 3 waves — quick wins first (wire existing APIs), then medium builds, then new features from scratch.

---

## Wave 1: Wire Frontend to Existing APIs (fastest — APIs already exist)

### 1.1 Campaigns page → campaign API
- **Files:** `apps/web/src/app/dashboard/campaigns/page.tsx`
- **Backend:** `apps/api/src/routes/campaigns.ts` (full CRUD + send + recipients)
- **DB:** `campaigns` + `campaignRecipients` tables exist
- **Work:** Create `use-campaigns.ts` hook, replace `mockCampaigns = []` with API data
- **Scope:** ~same as forms wiring

### 1.2 Sequences page → sequences API
- **Files:** `apps/web/src/app/dashboard/sequences/page.tsx`
- **Backend:** `apps/api/src/routes/sequences.ts` (CRUD + activate/deactivate + enroll/unenroll)
- **DB:** `dripSequences` + `sequenceEnrollments` tables exist
- **Work:** Create `use-sequences.ts` hook, wire page

### 1.3 Reviews page → reviews API
- **Files:** `apps/web/src/app/dashboard/reviews/page.tsx`
- **Backend:** `apps/api/src/routes/reviews.ts` (CRUD + AI response generation + campaigns)
- **DB:** `reviews` + `reviewCampaigns` tables exist
- **Work:** Create `use-reviews.ts` hook, wire page

### 1.4 Activity page → activities data
- **Files:** `apps/web/src/app/dashboard/activity/page.tsx`
- **Backend:** Activities table exists, data written by contacts/deals/forms
- **Work:** Add GET `/orgs/:orgId/activities` route, create hook, wire page

### 1.5 Team page → org members
- **Files:** `apps/web/src/app/dashboard/team/page.tsx`
- **Backend:** `orgMembers` table + `users` table exist
- **Work:** Add GET `/orgs/:orgId/team` route, create hook, wire page

### 1.6 Inbox/Conversations → verify + polish
- **Files:** `apps/web/src/app/dashboard/inbox/page.tsx`
- **Backend:** `apps/api/src/routes/conversations.ts` exists
- **Work:** Hooks already wired — verify they work, fix any rendering issues

---

## Wave 2: Build from Existing Data (medium — need new API routes)

### 2.1 Analytics dashboard
- **Files:** `apps/web/src/app/dashboard/analytics/page.tsx`
- **Work:** Add GET `/orgs/:orgId/analytics` route that aggregates from contacts, deals, appointments, forms, calls tables. Wire frontend with charts.

### 2.2 Automations page (visual)
- **Files:** `apps/web/src/app/dashboard/automations/page.tsx`
- **Backend:** Sequences API exists — automations = sequence management UI
- **Work:** Wire to sequences API, add trigger configuration UI

---

## Wave 3: New Features (need DB + API + frontend)

### 3.1 Invoices
- **Work:** Create `invoices` DB table, API routes, service, wire frontend page
- **Scope:** Similar to forms system build

### 3.2 Estimates
- **Work:** Create `estimates` DB table, API routes, service, wire frontend page
- **Scope:** Similar to invoices

---

## Execution Order (optimized for speed)

| # | Feature | Type | Est. Effort |
|---|---------|------|-------------|
| 1 | Campaigns | Wire frontend | Small |
| 2 | Sequences | Wire frontend | Small |
| 3 | Reviews | Wire frontend | Small |
| 4 | Activity | Add route + wire | Small |
| 5 | Team | Add route + wire | Small |
| 6 | Inbox | Verify + polish | Small |
| 7 | Analytics | New route + charts | Medium |
| 8 | Automations | Wire + trigger UI | Medium |
| 9 | Invoices | Full build | Large |
| 10 | Estimates | Full build | Large |
