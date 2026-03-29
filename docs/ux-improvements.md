# HararAI UX Research Report — Brutally Honest Assessment

**Date:** 2026-03-25
**Methodology:** Full code audit of every page in `apps/web/src/app/`, component review, customer journey walkthrough, and competitive research against best-in-class CRMs (HubSpot, Pipedrive, Bigin, GoHighLevel).

---

## CRITICAL (Blocks real usage)

### 1. Forgot Password is 100% fake
- `apps/web/src/app/(auth)/forgot-password/page.tsx` line 17: `// Simulate API call` followed by `setTimeout(resolve, 1000)`. No actual email is sent. A locked-out user has ZERO recovery path. This is a support ticket volcano waiting to happen.

### 2. Settings page saves only to localStorage, not the API
- `apps/web/src/app/dashboard/settings/page.tsx` lines 223-251: `loadSettings()` reads from `localStorage`, `saveSettings()` writes to `localStorage`. None of this persists to the database. If a user clears their browser, changes a device, or opens an incognito tab, ALL their business settings vanish. The settings UI gives the impression of saving but it is lying.

### 3. Export/Download button on Contacts is a fake toast
- `apps/web/src/app/dashboard/contacts/page.tsx` line 333: The Export button just shows a toast "Export started — CSV download will begin shortly" but does nothing. A user trying to get their data out will click, see the toast, and then... nothing happens.

### 4. Invoices page is entirely hardcoded mock data — no API integration
- `apps/web/src/app/dashboard/invoices/page.tsx` lines 43-160+: All invoices are `mockInvoices` defined inline. There is no `useInvoices()` hook, no API call, no way to create a real invoice. The "New Invoice" page (`invoices/new/page.tsx`) has mock contacts inline and no submit-to-API logic. A user cannot actually invoice a customer.

### 5. Estimates page is entirely hardcoded mock data — no API integration
- `apps/web/src/app/dashboard/estimates/page.tsx` — same problem as invoices. Pure mock. Cannot create, send, or track a real estimate.

### 6. Campaigns page is entirely mock data with no backend
- `apps/web/src/app/dashboard/campaigns/page.tsx` and sub-pages — all mock. Cannot send a real email or SMS campaign. The "Send Campaign" buttons are non-functional.

### 7. Analytics page shows fabricated numbers
- `apps/web/src/app/dashboard/analytics/page.tsx` lines 34-88: All KPIs ($47,850 revenue, 127 leads, 34% conversion, 342 calls answered) are hardcoded constants. A new user sees impressive fake numbers that have no relation to their actual business. This is actively misleading.

### 8. Onboarding data only persists to localStorage
- `apps/web/src/lib/onboarding.ts` — `saveOnboardingData()` saves to localStorage. The entire onboarding flow (business name, services, hours, AI receptionist config) is browser-local. Switch devices = redo everything.

### 9. No auth token validation or refresh mechanism
- `apps/web/src/lib/auth.ts` — tokens stored in localStorage with no expiry check, no refresh flow. Tokens will silently expire and the user will get mysterious API errors instead of being redirected to login.

---

## HIGH PRIORITY (Hurts experience)

### 10. Every page rolls its own toast notification system
- 20+ pages each have their own `const [toast, setToast] = useState<string | null>(null)` with inline `setTimeout(() => setToast(null), 3000)`. No shared toast library (no sonner, no react-hot-toast). This means: inconsistent positioning, inconsistent styling, toasts that overlap, no queue, no ability to undo actions. Install sonner or react-hot-toast and centralize.

### 11. No Zod validation on the frontend
- Despite CLAUDE.md rule "Zod validation on every API endpoint input and output", there is zero Zod usage in `apps/web/src`. `grep -r "zod" apps/web/src/` returns nothing. Forms use only HTML `required` attributes and ad-hoc JS checks. No schema validation means bad data reaches the API.

### 12. Settings page hardcodes "Jim Henderson" / "Acme HVAC" as defaults
- `apps/web/src/app/dashboard/settings/page.tsx` lines 170-217: `defaultSettings` has `fullName: "Jim Henderson"`, `businessName: "Acme HVAC & Plumbing"`, `email: "jim@acmehvac.com"`. A brand new user sees someone else's demo data pre-filled as their settings. Should pull from the authenticated user's org.

### 13. Settings timezone list is US-only
- `apps/web/src/app/dashboard/settings/page.tsx` lines 124-132: `TIMEZONES` array contains only 7 US timezones. The onboarding page supports Australia and multiple countries, but the settings page is US-locked. Users in AU, UK, NZ will not find their timezone.

### 14. Inbox initializes with mock conversations as local state even when API succeeds
- `apps/web/src/app/dashboard/inbox/page.tsx` lines 39-40: `useState<MockConversation[]>(mockConversations)` and `useState<Record<string, MockChatMessage[]>>(mockMessages)` initialize with mock data. If the API returns an empty conversation list, the user STILL sees fake conversations in the fallback path.

### 15. Sidebar "Inbox" badge is hardcoded to "3"
- `apps/web/src/components/layout/sidebar.tsx` line 55: `badge: "3"` is hardcoded. Whether a user has 0, 50, or 100 unread messages, the sidebar always says 3. Should fetch actual unread count.

### 16. Pipeline currency is hardcoded to USD
- `apps/web/src/app/dashboard/pipeline/page.tsx` line 21-25: `formatValue()` uses `currency: "USD"`. Australian users (the primary target per the onboarding country default of "AU") will see their deals in wrong currency. Should respect org settings.

### 17. Contact detail page has hardcoded mock conversations
- `apps/web/src/app/dashboard/contacts/[id]/page.tsx` lines 105-200+: `contactConversations` and `contactConversationMessages` are hardcoded inline objects keyed by c1/c2/c3. Only 3 contacts have any conversations; all others show empty.

### 18. Booking page has no connection to the scheduling system
- `apps/web/src/app/book/[slug]/page.tsx` line 707: "Simulate a brief delay then show confirmation (no real API call needed)". The customer-facing booking page does not actually create an appointment in the system. The customer thinks they booked; the business never knows.

### 19. Portal pages are entirely static mock data
- `apps/web/src/app/portal/page.tsx` — hardcoded appointments and invoices (lines 39-78). Customer portal cannot show real data. A customer logging in sees fake appointments.

### 20. Social media posting page has no real integration
- `apps/web/src/app/dashboard/social/page.tsx` — mock connected accounts, mock scheduled posts. "Post" and "Schedule" buttons do not connect to Facebook/Instagram/Google Business APIs.

### 21. Automations, Sequences, and Forms pages are all mock-only
- These are Phase 2 features according to CLAUDE.md but they are accessible in the sidebar, which confuses users who think they can use them. They should either be hidden or show a clear "Coming Soon" state.

### 22. Team page has hardcoded team members
- `apps/web/src/app/dashboard/team/page.tsx` lines 49-60+: Jim Henderson and other members are hardcoded. Cannot actually invite real team members.

### 23. Reviews page cannot connect to real Google/Yelp/Facebook reviews
- Pure mock data. The "AI Generate Response" buttons simulate responses but cannot post them anywhere.

### 24. Notifications page is entirely mock data
- `apps/web/src/app/dashboard/notifications/page.tsx` — all notifications are hardcoded. No real-time notification system exists.

---

## MEDIUM (Nice to have but expected by users)

### 25. No global search that actually works
- Command palette (`command-palette.tsx`) exists with Ctrl+K but appears to be navigation-only, not searching across contacts, deals, conversations, and invoices like HubSpot/Pipedrive do.

### 26. No bulk actions on contacts
- The contacts page has checkboxes and a select-all, but no bulk action bar (delete, tag, export selected, add to campaign). The checkboxes are decorative.

### 27. No contact import (CSV/vCard)
- For a rubbish removal or moving company switching from spreadsheets, there's no import flow. Competitive CRMs make this a Day 1 feature.

### 28. No undo on destructive actions
- Moving deals, deleting contacts, etc. have no undo mechanism. Best practice is to show a toast with an "Undo" button for 5 seconds.

### 29. No drag-and-drop on mobile for pipeline
- Pipeline uses HTML5 drag-and-drop (`handleDragStart`, `handleDragOver`, `handleDrop`) which does not work on touch devices. A mobile user (common for field service workers) cannot move deals between stages.

### 30. No mobile-optimized views
- While the layout is responsive, the pipeline Kanban requires horizontal scrolling on mobile. The scheduling weekly view is unusable on small screens. Field service workers check these on their phones.

### 31. Scheduling calendar only shows weekly view
- No daily, monthly, or agenda view. Many small business owners prefer a monthly overview. The current 8AM-6PM grid also does not support early morning or evening appointments (common for emergency plumbing/HVAC).

### 32. Scheduling "new appointment" form has "AC Tune-Up" hardcoded as default title
- `apps/web/src/app/dashboard/scheduling/page.tsx` line 76: `const [newTitle, setNewTitle] = useState("AC Tune-Up")`. A rubbish removal company sees "AC Tune-Up" as the default appointment type.

### 33. No email verification on registration
- Registration immediately logs in and redirects. No email verification step. This means anyone can register with any email address.

### 34. No terms of service or privacy policy links
- Registration and landing page have no ToS/Privacy Policy acceptance. Required for compliance.

### 35. AI Assistant has no loading/thinking indicator when generating
- The AI chat component sends messages but there's no streaming response indicator or typing animation while Claude processes.

### 36. Landing page has no actual pricing information
- Has a "Pricing" nav link to `#pricing` anchor but the pricing section appears to be minimal/placeholder. Competitors show clear tiered pricing.

### 37. Integrations page shows OAuth connect buttons but most cannot actually connect
- The integrations page has cards for Facebook, Instagram, Google Business, Stripe, etc. but the OAuth flows are only partially implemented. Users will click "Connect" and get errors or nothing.

### 38. Activity page is hardcoded mock entries
- `apps/web/src/app/dashboard/activity/page.tsx` — "Jim Smith", "Maria Garcia" etc. are hardcoded team members with fake activity entries.

### 39. No dark mode toggle despite CSS variable support
- The app uses CSS variables that could support dark mode, but there's no toggle. Many field workers prefer dark mode in low-light conditions.

---

## LOW (Polish)

### 40. Landing page uses a completely different design language from the dashboard
- Landing page is dark-themed with gradients and glassmorphism (`bg-[#0a0a1a]`). Dashboard is clean white/light theme. The transition feels like two different products. Not a blocker but hurts brand coherence.

### 41. Inconsistent form input styling
- Auth pages use raw `<input>` with manual classes. Some dashboard pages use the same pattern. Should use shadcn/ui `<Input>` component consistently as required by CLAUDE.md rule 4.

### 42. Inconsistent button patterns
- Mix of raw `<button>` with Tailwind classes and no shared Button component. CLAUDE.md says "shadcn/ui for ALL UI components" but most pages use raw HTML elements.

### 43. No favicon or app icon visible
- Layout references `/icon.svg` but no evidence this file exists or is properly configured.

### 44. Footer copyright in auth pages says 2026 but is hardcoded
- Should be dynamic: `new Date().getFullYear()`.

### 45. No keyboard navigation indicators
- Dashboard layout has Ctrl+K, Ctrl+N, Ctrl+Shift+N shortcuts but these are not discoverable. No keyboard shortcut overlay or hints.

### 46. Admin section visible only to hardcoded emails
- `apps/web/src/components/layout/sidebar.tsx` lines 117-118: `PLATFORM_ADMIN_EMAILS = ["mayan@northernremovals.com.au", "mayan0750@gmail.com"]`. This is a security-by-obscurity pattern. Should be role-based from the database.

### 47. Onboarding country defaults to "AU" instead of detecting user location
- `apps/web/src/app/onboarding/page.tsx` line 135: `const [country, setCountry] = useState("AU")`. While the timezone is detected, country is hardcoded. Should either detect or let the user choose first.

### 48. Multiple places duplicate getInitials() helper
- Both `sidebar.tsx` and `utils.ts` define `getInitials()`. Should be imported from one place.

### 49. Tags in contacts are hardcoded to HVAC/Plumbing vocabulary
- `apps/web/src/app/dashboard/contacts/page.tsx` lines 47-56: Tag color mapping includes "HVAC", "Plumbing", "Furnace". A rubbish removal company sees irrelevant categories. Tags should be user-defined.

### 50. Call records page quick-dial contacts are hardcoded
- `apps/web/src/app/dashboard/calls/page.tsx` lines 144-149: "Sarah J.", "Mike R." etc. are hardcoded. Should pull from actual contacts.

---

## RESEARCH INSIGHTS (from competitive analysis)

### What best-in-class CRMs do that HararAI does not:

1. **Guided empty states with one clear CTA** — When HubSpot has no contacts, it shows "Import contacts" as the primary action with a video tutorial. HararAI shows empty states but the CTAs are generic. Each empty state should have a SPECIFIC next action.

2. **Interactive onboarding progress bar that persists** — Pipedrive shows a persistent progress bar at the top of the dashboard until 100% setup complete, with clear remaining steps. HararAI has `GettingStartedChecklist` but it can be dismissed and is localStorage-based.

3. **Real-time data everywhere** — The #1 complaint about CRMs is stale data. HararAI falls back to mock data too eagerly. When the API is down, show a clear "Reconnecting..." banner instead of seamlessly swapping in fake data that looks real.

4. **Speed to value under 5 minutes** — Best CRMs let you add a contact, send a message, and see value within the first session. HararAI has a 7-step onboarding flow before you even see the dashboard. Consider: let users skip to dashboard immediately with a minimal setup (business name + phone only) and progressively complete setup.

5. **Mobile-first for field service** — GoHighLevel and ServiceTitan are mobile-first because technicians/movers are in the field. HararAI has no native mobile experience and the responsive design breaks on pipeline and scheduling pages.

6. **Automatic data capture** — Modern CRMs auto-log calls, emails, and texts. HararAI requires manual entry for most things. The AI call feature is the right direction but it needs to auto-populate the pipeline and contact records.

7. **Quick actions from anywhere** — Ability to call, text, or email a contact with one click from any page. HararAI has a floating dialer but no quick-SMS or quick-email from contact cards.

8. **Customizable pipeline stages** — Pipeline stages ("New Lead", "Quoted", "Scheduled", "Won") are hardcoded for HVAC. A rubbish removal company might need "Quoted", "Booked", "En Route", "Completed", "Invoiced". Users cannot customize stages.

9. **Real-time notifications** — WebSocket/SSE push notifications for new leads, missed calls, completed bookings. Currently all notifications are mock data.

10. **Data import on Day 1** — CSV import, Google Contacts import, spreadsheet import. The #1 barrier to CRM adoption is getting existing data in. HararAI has no import flow.

### Key stat from research:
- 20-70% of CRM projects fail due to poor user adoption (source: SBA.gov)
- 17% of businesses cite manual data entry as their biggest CRM pain point
- Average small business evaluates 3 CRMs and spends 2 weeks onboarding
- Only 20% of small business owners use analytics weekly

### Competitive research sources:
- https://www.sybill.ai/blogs/best-crm-software-for-small-business
- https://www.appcues.com/blog/crm-software-user-onboarding
- https://f1studioz.com/blog/smart-saas-dashboard-design/
- https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns
- https://www.scratchpad.com/blog/crm-problems
- https://www.nutshell.com/blog/crm-issues-and-how-to-address-them
- https://www.sba.gov/blog/3-biggest-problems-implementing-crm-system-what-do-about-them
- https://www.onepagecrm.com/blog/crm-features/
- https://www.nutshell.com/blog/most-important-crm-features-small-businesses

---

## Summary Scorecard

| Area | Grade | Notes |
|------|-------|-------|
| Auth Flow | B- | Login/Register work, but forgot-password is fake, no email verification |
| Onboarding | B | 7-step wizard is thorough but saves only to localStorage |
| Dashboard | B+ | Good design, proper empty states, but stats are mock when API is down |
| Contacts | B | API-connected, add/search works, but no import/export/bulk actions |
| Pipeline | B | Drag-and-drop works, deals persist, but no mobile touch, USD-only |
| Inbox | C+ | Falls back to mock data too eagerly, SMS sending simulated |
| Calls | B | Good softphone UI, but call records are hardcoded |
| Scheduling | C+ | Basic weekly view only, hardcoded defaults, no real booking connection |
| Invoices | F | 100% mock data, cannot create real invoices |
| Estimates | F | 100% mock data |
| Campaigns | F | 100% mock data |
| Analytics | F | 100% fabricated numbers |
| Settings | D | Saves to localStorage only, hardcoded defaults for wrong user |
| Customer Portal | F | 100% static mock |
| Reviews | D | Mock data, AI responses don't post |
| Social | F | No real integrations |
| Integrations | D+ | UI exists but OAuth flows incomplete |
| Team | D | Hardcoded members, no invite flow |
| Overall Polish | C+ | Good design language but inconsistent components |

**Bottom line:** The core CRM loop (Contacts + Pipeline + Inbox + Calls + Scheduling) is approximately 60% functional with real API connections. Everything outside that loop is facade. A real user would hit a wall within 30 minutes of trying to run their business on this. The highest-leverage fixes are: (1) make settings persist to the API, (2) connect invoicing to a real backend, (3) fix the forgot-password flow, (4) replace mock analytics with real data, and (5) add CSV import for contacts.
