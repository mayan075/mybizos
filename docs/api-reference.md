# API Reference

Base URL: `http://localhost:3001` (development) or your production API URL.

All org-scoped endpoints require a Bearer token in the `Authorization` header. In development mode, the API auto-authenticates with a demo user if no token is provided.

## Response Format

### Success

```json
{
  "data": { ... }
}
```

### Success with Pagination

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Validation Error

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "status": 422,
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

---

## Health Check

### `GET /`

Returns API status information.

**Response:**
```json
{
  "status": "ok",
  "name": "mybizos-api",
  "version": "0.1.0"
}
```

### `GET /health`

Returns health check with timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-22T10:00:00.000Z",
  "version": "0.1.0",
  "environment": "development"
}
```

---

## Auth

Authentication endpoints. No org prefix required.

### `POST /auth/register`

Register a new user and create their organization.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Smith",
  "businessName": "Smith Plumbing",
  "vertical": "plumbing"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 8 characters |
| `name` | string | Yes | User's full name |
| `businessName` | string | Yes | Business name |
| `vertical` | string | Yes | One of: `plumbing`, `hvac`, `electrical`, `roofing`, `landscaping`, `pest_control`, `cleaning`, `general_contractor` |

**Response (201):**
```json
{
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "organization": { "id": "...", "name": "...", "slug": "..." },
    "token": "eyJ..."
  }
}
```

### `POST /auth/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "token": "eyJ...",
    "expiresAt": "2026-03-23T10:00:00.000Z"
  }
}
```

### `POST /auth/logout`

Invalidate the current session. Requires authentication.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": { "message": "Logged out successfully" }
}
```

### `GET /auth/me`

Get the current authenticated user's profile. Requires authentication.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "id": "usr_01",
    "email": "user@example.com",
    "name": "John Smith",
    "orgId": "org_01",
    "role": "owner"
  }
}
```

---

## Organizations

### `GET /orgs/:orgId`

Get organization details.

**Response (200):**
```json
{
  "data": {
    "id": "org_01",
    "name": "Acme HVAC & Plumbing",
    "slug": "acme-hvac",
    "phone": "+15551234567",
    "email": "info@acmehvac.com",
    "address": "789 Main Street, Springfield, IL",
    "timezone": "America/Chicago",
    "businessHours": { "start": "08:00", "end": "17:00", "days": [1,2,3,4,5] },
    "plan": "starter"
  }
}
```

### `PATCH /orgs/:orgId`

Update organization settings. Requires `owner` or `admin` role.

**Request Body (all fields optional):**
```json
{
  "name": "Updated Business Name",
  "phone": "+15559999999",
  "email": "new@email.com",
  "address": "123 New Street",
  "timezone": "America/New_York",
  "businessHours": {
    "start": "09:00",
    "end": "18:00",
    "days": [1, 2, 3, 4, 5]
  }
}
```

### `GET /orgs/:orgId/members`

List organization members.

**Response (200):**
```json
{
  "data": [
    {
      "id": "mem_01",
      "userId": "usr_01",
      "name": "Demo Owner",
      "email": "demo@mybizos.com",
      "role": "owner",
      "status": "active",
      "joinedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /orgs/:orgId/invite`

Invite a new member. Requires `owner` or `admin` role.

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member",
  "name": "Jane Doe"
}
```

---

## Contacts

All endpoints: `/orgs/:orgId/contacts`

### `GET /orgs/:orgId/contacts`

List contacts with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | -- | Search by name, email, or phone |
| `status` | string | -- | Filter: `active`, `inactive`, `archived` |
| `source` | string | -- | Filter by lead source |
| `tag` | string | -- | Filter by tag |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "cnt_01",
      "firstName": "Robert",
      "lastName": "Martinez",
      "email": "rmartinez@gmail.com",
      "phone": "+15559012345",
      "source": "google_ads",
      "status": "active",
      "tags": ["residential"],
      "customFields": {},
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

### `GET /orgs/:orgId/contacts/:id`

Get a single contact by ID.

### `POST /orgs/:orgId/contacts`

Create a new contact.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "company": "Doe Inc",
  "source": "webform",
  "status": "active",
  "tags": ["residential", "emergency"],
  "customFields": { "referredBy": "Google" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `company` | string | No | Company name |
| `source` | string | No | One of: `manual`, `phone`, `sms`, `email`, `webform`, `referral`, `google_ads`, `facebook_ads`, `yelp`, `import`. Default: `manual` |
| `status` | string | No | `active`, `inactive`, `archived`. Default: `active` |
| `tags` | string[] | No | Array of tag strings |
| `customFields` | object | No | Key-value pairs for custom data |

### `PATCH /orgs/:orgId/contacts/:id`

Update a contact. All fields optional.

### `DELETE /orgs/:orgId/contacts/:id`

Archive a contact (soft delete).

**Response (200):**
```json
{
  "data": { "message": "Contact archived successfully" }
}
```

---

## Pipelines

All endpoints: `/orgs/:orgId/pipelines`

### `GET /orgs/:orgId/pipelines`

List all pipelines with their stages.

### `GET /orgs/:orgId/pipelines/:id`

Get a single pipeline with stages.

### `POST /orgs/:orgId/pipelines`

Create a new pipeline.

**Request Body:**
```json
{
  "name": "Sales Pipeline",
  "stages": [
    { "name": "New Lead", "slug": "new_lead", "color": "#6366f1" },
    { "name": "Contacted", "slug": "contacted", "color": "#3b82f6" },
    { "name": "Qualified", "slug": "qualified", "color": "#8b5cf6" },
    { "name": "Quote Sent", "slug": "quote_sent", "color": "#f59e0b" },
    { "name": "Won", "slug": "won", "color": "#22c55e" },
    { "name": "Lost", "slug": "lost", "color": "#6b7280" }
  ]
}
```

Stage slugs must be one of: `new_lead`, `contacted`, `qualified`, `quote_sent`, `negotiation`, `won`, `lost`.

### `PATCH /orgs/:orgId/pipelines/:id`

Update pipeline name.

---

## Deals

All endpoints: `/orgs/:orgId/deals`

### `GET /orgs/:orgId/deals`

List all deals.

### `POST /orgs/:orgId/deals`

Create a new deal.

**Request Body:**
```json
{
  "pipelineId": "pipe_01",
  "stageId": "stage_01",
  "contactId": "cnt_01",
  "title": "Kitchen Remodel Plumbing",
  "value": 5000,
  "currency": "USD",
  "expectedCloseDate": "2026-04-15T00:00:00Z",
  "assignedTo": "usr_01"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pipelineId` | string | Yes | Pipeline ID |
| `stageId` | string | Yes | Stage ID |
| `contactId` | string | Yes | Associated contact |
| `title` | string | Yes | Deal title |
| `value` | number | No | Deal value (non-negative) |
| `currency` | string | No | 3-letter code. Default: `USD` |
| `expectedCloseDate` | string | No | ISO 8601 datetime |
| `assignedTo` | string | No | User ID |

### `PATCH /orgs/:orgId/deals/:id`

Update a deal (move stages, update value, etc.).

### `DELETE /orgs/:orgId/deals/:id`

Delete a deal.

---

## Conversations

Unified inbox for all communication channels.

### `GET /orgs/:orgId/conversations`

List conversations.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel` | string | Filter: `sms`, `email`, `call`, `whatsapp`, `webchat` |
| `status` | string | Filter: `open`, `closed`, `snoozed` |

### `GET /orgs/:orgId/conversations/:id/messages`

Get all messages in a conversation.

### `POST /orgs/:orgId/conversations/:id/messages`

Send a message in a conversation.

**Request Body:**
```json
{
  "content": "Thanks for your inquiry! We can schedule an appointment this week.",
  "channel": "sms"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Message text |
| `channel` | string | Yes | `sms` or `email` |

---

## Scheduling / Appointments

### `GET /orgs/:orgId/appointments`

List all appointments.

### `POST /orgs/:orgId/appointments`

Create a new appointment.

**Request Body:**
```json
{
  "contactId": "cnt_01",
  "contactName": "Robert Martinez",
  "title": "AC Inspection",
  "description": "Annual AC maintenance check",
  "startTime": "2026-03-25T09:00:00Z",
  "endTime": "2026-03-25T10:00:00Z",
  "assignedTo": "usr_01",
  "location": "789 Main Street",
  "bookedBy": "manual"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contactId` | string | Yes | Contact ID |
| `contactName` | string | Yes | Contact display name |
| `title` | string | Yes | Appointment title |
| `startTime` | string | Yes | ISO 8601 datetime |
| `endTime` | string | Yes | ISO 8601 datetime |
| `description` | string | No | Description |
| `assignedTo` | string | No | Assigned user ID |
| `location` | string | No | Location |
| `bookedBy` | string | No | `ai_phone`, `ai_sms`, `manual`, `public_booking`. Default: `manual` |

### `PATCH /orgs/:orgId/appointments/:id`

Update an appointment. Supports updating status to: `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`.

### `GET /orgs/:orgId/availability`

Check availability for a given date.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | Yes | Date in `YYYY-MM-DD` format |
| `userId` | string | No | Specific user's availability |

### `POST /public/book/:orgSlug` (No auth required)

Public booking endpoint for customers.

**Request Body:**
```json
{
  "contactName": "Jane Doe",
  "contactEmail": "jane@example.com",
  "contactPhone": "+15559876543",
  "title": "Drain Cleaning",
  "startTime": "2026-03-26T14:00:00Z",
  "endTime": "2026-03-26T15:00:00Z"
}
```

---

## Campaigns

Email and SMS marketing campaigns.

### `GET /orgs/:orgId/campaigns`

List campaigns with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name |
| `status` | string | `draft`, `scheduled`, `sending`, `sent`, `cancelled` |
| `type` | string | `email` or `sms` |
| `page` | number | Page number |
| `limit` | number | Results per page |

### `GET /orgs/:orgId/campaigns/:id`

Get campaign details.

### `POST /orgs/:orgId/campaigns`

Create a new campaign.

**Request Body:**
```json
{
  "name": "Spring Maintenance Special",
  "type": "email",
  "subject": "Get 20% off AC tune-ups this spring!",
  "bodyHtml": "<h1>Spring Special</h1><p>Book your AC tune-up today...</p>",
  "bodyText": "Spring Special - Book your AC tune-up today...",
  "segmentFilter": {
    "tags": ["residential"],
    "allContacts": false
  },
  "scheduledAt": "2026-04-01T09:00:00Z"
}
```

### `PATCH /orgs/:orgId/campaigns/:id`

Update a campaign.

### `POST /orgs/:orgId/campaigns/:id/send`

Send or schedule a campaign for delivery.

### `DELETE /orgs/:orgId/campaigns/:id`

Delete a campaign.

### `GET /orgs/:orgId/campaigns/:id/recipients`

List campaign recipients with pagination.

---

## Reviews

Manage customer reviews across platforms.

### `GET /orgs/:orgId/reviews`

List reviews with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | string | `google`, `facebook`, `yelp`, `internal` |
| `minRating` | number | Minimum rating (1-5) |
| `maxRating` | number | Maximum rating (1-5) |
| `responded` | string | `true` or `false` |
| `sentiment` | string | `positive`, `neutral`, `negative` |
| `page` | number | Page number |
| `limit` | number | Results per page |

### `GET /orgs/:orgId/reviews/stats`

Get review statistics (average rating, count by platform, etc.).

### `GET /orgs/:orgId/reviews/:id`

Get a single review.

### `POST /orgs/:orgId/reviews`

Create a review record.

**Request Body:**
```json
{
  "contactId": null,
  "platform": "google",
  "rating": 5,
  "reviewText": "Great service! Fixed our AC in no time.",
  "reviewerName": "John D.",
  "reviewUrl": "https://g.co/review/...",
  "sentiment": "positive"
}
```

### `POST /orgs/:orgId/reviews/:id/generate-response`

AI-generate a suggested response for a review.

### `POST /orgs/:orgId/reviews/:id/respond`

Post a response to a review.

**Request Body:**
```json
{
  "response": "Thank you for your kind review, John! We're glad we could help."
}
```

### Review Campaigns

Automated review request campaigns.

#### `GET /orgs/:orgId/reviews/campaigns`

List review request campaigns.

#### `GET /orgs/:orgId/reviews/campaigns/:campaignId`

Get a review campaign.

#### `POST /orgs/:orgId/reviews/campaigns`

Create a review campaign.

**Request Body:**
```json
{
  "name": "Post-Appointment Review",
  "triggerType": "after_appointment",
  "delayHours": 24,
  "messageTemplate": "Hi {firstName}, thanks for choosing us! Would you leave us a quick review? {reviewLink}",
  "channel": "sms",
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Campaign name |
| `triggerType` | string | Yes | `after_appointment`, `after_deal_won`, `manual` |
| `delayHours` | number | No | Hours after trigger. Default: 24 |
| `messageTemplate` | string | Yes | Template with `{firstName}`, `{reviewLink}` placeholders |
| `channel` | string | Yes | `sms`, `email`, `both` |
| `isActive` | boolean | No | Default: true |

#### `PATCH /orgs/:orgId/reviews/campaigns/:campaignId`

Update a review campaign.

#### `DELETE /orgs/:orgId/reviews/campaigns/:campaignId`

Delete a review campaign.

---

## Sequences

Automated multi-step follow-up sequences.

### `GET /orgs/:orgId/sequences`

List all sequences.

### `GET /orgs/:orgId/sequences/:id`

Get sequence details including steps.

### `POST /orgs/:orgId/sequences`

Create a new sequence.

**Request Body:**
```json
{
  "name": "New Lead Nurture",
  "description": "Follow up with new leads over 7 days",
  "triggerType": "contact_created",
  "triggerConfig": { "tag": "new-lead" },
  "steps": [
    {
      "type": "send_sms",
      "config": { "body": "Thanks for reaching out! How can we help?", "delay_hours": 0.1 }
    },
    {
      "type": "wait",
      "config": { "delay_hours": 24 }
    },
    {
      "type": "send_email",
      "config": { "subject": "Following up", "body_html": "<p>Just wanted to check in...</p>" }
    },
    {
      "type": "ai_decision",
      "config": { "prompt": "Has the contact replied?", "yes_step": 3, "no_step": 4 }
    }
  ]
}
```

**Step Types:**

| Type | Description | Config Fields |
|------|-------------|---------------|
| `send_email` | Send an email | `subject`, `body_html` |
| `send_sms` | Send an SMS | `body` |
| `wait` | Pause for a duration | `delay_hours` |
| `add_tag` | Add a tag to contact | `tag` |
| `remove_tag` | Remove a tag | `tag` |
| `ai_decision` | AI-powered branching | `prompt`, `yes_step`, `no_step` |

**Trigger Types:** `manual`, `tag_added`, `deal_stage_changed`, `form_submitted`, `appointment_completed`, `contact_created`

### `PATCH /orgs/:orgId/sequences/:id`

Update a sequence.

### `DELETE /orgs/:orgId/sequences/:id`

Delete a sequence.

### `POST /orgs/:orgId/sequences/:id/activate`

Activate a sequence.

### `POST /orgs/:orgId/sequences/:id/deactivate`

Deactivate/pause a sequence.

### `POST /orgs/:orgId/sequences/:id/enroll`

Enroll a contact into a sequence.

**Request Body:**
```json
{
  "contactId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `POST /orgs/:orgId/sequences/:id/unenroll`

Remove a contact from a sequence.

### `GET /orgs/:orgId/sequences/:id/enrollments`

List all contacts enrolled in a sequence.

---

## AI Agents

### `GET /orgs/:orgId/ai-agents`

List all AI agents for the organization.

### `POST /orgs/:orgId/ai-agents`

Create a new AI agent.

**Request Body:**
```json
{
  "name": "Main Phone Agent",
  "type": "phone",
  "greeting": "Hi, this is Smith Plumbing's AI assistant. This call may be recorded. How can I help you today?",
  "businessContext": "Smith Plumbing serves the metro area. We offer plumbing services for residential and commercial customers.",
  "escalationRules": {
    "maxMisunderstandings": 2,
    "emergencyKeywords": ["flooding", "gas leak", "fire", "emergency"],
    "escalationPhone": "+15559999999"
  },
  "priceRanges": [
    { "service": "Drain Cleaning", "minPrice": 150, "maxPrice": 250 },
    { "service": "Water Heater Install", "minPrice": 1500, "maxPrice": 3000 }
  ],
  "enabled": true
}
```

Note: Phone agents must include "AI assistant" in their greeting (compliance requirement).

### `PATCH /orgs/:orgId/ai-agents/:id`

Update an AI agent's configuration.

### `POST /orgs/:orgId/ai/score-lead`

Manually trigger AI lead scoring.

**Request Body:**
```json
{
  "contactId": "cnt_01"
}
```

**Response (200):**
```json
{
  "data": {
    "contactId": "cnt_01",
    "score": 78,
    "grade": "A",
    "factors": [
      { "factor": "Responded to AI agent", "weight": 25, "score": 25 },
      { "factor": "Booked appointment", "weight": 30, "score": 30 }
    ],
    "recommendation": "High-priority lead. Follow up within 24 hours.",
    "scoredAt": "2026-03-22T10:00:00.000Z"
  }
}
```

---

## Phone System

### `GET /orgs/:orgId/phone-system/status`

Get phone system connection status.

### `GET /orgs/:orgId/phone-system/numbers`

List configured phone numbers.

### `POST /orgs/:orgId/phone-system/connect`

Connect Twilio account (requires Twilio credentials and database).

### `POST /orgs/:orgId/phone-system/numbers/:numberSid/configure`

Configure a phone number (set up webhooks, assign AI agent).

### `DELETE /orgs/:orgId/phone-system/disconnect`

Disconnect phone system.

### `POST /orgs/:orgId/phone-system/waitlist`

Sign up for the phone system waitlist.

---

## Dashboard

### `GET /orgs/:orgId/dashboard/stats`

Get dashboard overview statistics.

**Response (200):**
```json
{
  "stats": [
    {
      "label": "Leads Today",
      "value": "12",
      "change": "+18%",
      "trend": "up",
      "iconName": "Users",
      "href": "/dashboard/contacts"
    }
  ],
  "upcomingAppointments": [
    {
      "id": "apt_01",
      "customer": "James Wilson",
      "service": "AC Inspection",
      "time": "9:00 AM",
      "date": "Tomorrow",
      "status": "scheduled"
    }
  ]
}
```

### `GET /orgs/:orgId/dashboard/activity`

Get recent activity feed.

---

## Webhooks

Webhook endpoints for third-party services. These do not require authentication -- they are called by external providers.

### Twilio Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/twilio/sms` | POST | Inbound SMS from Twilio |
| `/webhooks/twilio/voice` | POST | Inbound voice call from Twilio |
| `/webhooks/twilio/status` | POST | Message/call status updates |

Twilio SMS and voice webhooks return TwiML (XML) responses.

### Vapi Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/vapi/call-ended` | POST | AI call ended notification |
| `/webhooks/vapi/tool-call` | POST | AI agent tool call request |

### Stripe Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/stripe/` | POST | All Stripe events (payments, subscriptions) |

### Email Webhooks (Postmark)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/email/inbound` | POST | Inbound email from Postmark |

The inbound email webhook parses Postmark's payload, detects emergency keywords, and routes emails to the correct organization's inbox.
