# Supported Business Verticals

HararAI is designed for local service businesses. Each vertical gets pre-configured pipeline stages, AI agent prompts, booking services with price ranges, and automated drip sequences tailored to its industry.

## Overview

| # | Vertical | Code | Status |
|---|----------|------|--------|
| 1 | Rubbish Removals | `rubbish_removals` | Full templates |
| 2 | Moving Company | `moving_company` | Full templates |
| 3 | Plumbing | `plumbing` | Services + default pipeline |
| 4 | HVAC | `hvac` | Services + default pipeline |
| 5 | Electrical | `electrical` | Services + default pipeline |
| 6 | General Contractor | `general_contractor` | Services + default pipeline |
| 7 | Cleaning | `cleaning` | Services + default pipeline |
| 8 | Landscaping | `landscaping` | Services + default pipeline |
| 9 | Roofing | `roofing` | Default pipeline |
| 10 | Pest Control | `pest_control` | Default pipeline |
| 11 | Auto Repair | `auto_repair` | Services (onboarding only) |
| 12 | Salon / Spa | `salon_spa` | Services (onboarding only) |
| 13 | Dental | `dental` | Services (onboarding only) |
| 14 | Other | `other` | Generic services |

---

## Vertical Details

### 1. Rubbish Removals

**Pipeline Stages:**
| Position | Stage Name | Slug |
|----------|-----------|------|
| 0 | New Inquiry | `new_lead` |
| 1 | Quote Sent | `quote_sent` |
| 2 | Quote Accepted | `qualified` |
| 3 | Job Scheduled | `contacted` |
| 4 | In Progress | `negotiation` |
| 5 | Completed | `won` |

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Single Item Pickup | $50 - $120 |
| Partial Load | $150 - $300 |
| Full Load | $300 - $600 |
| Skip Bin Hire | $250 - $500 |
| Green Waste | $100 - $250 |
| Hard Rubbish | $120 - $350 |
| Commercial Waste | $300 - $800 |

**Drip Sequences:**

1. **New Lead Follow-Up**
   - 5 min after lead created (SMS): Thanks for reaching out, asks what needs removing
   - 24 hours after lead created (SMS): Follow-up offering free quote

2. **Quote Follow-Up**
   - 24 hours after quote sent (SMS): Checks if they have questions
   - 3 days after quote sent (SMS): Follow-up with availability this week

3. **Post-Job Review Request**
   - 2 hours after job completed (SMS): Thanks them, asks for Google review

---

### 2. Moving Company

**Pipeline Stages:**
| Position | Stage Name | Slug |
|----------|-----------|------|
| 0 | New Inquiry | `new_lead` |
| 1 | Site Visit / Quote | `contacted` |
| 2 | Quote Sent | `quote_sent` |
| 3 | Booked | `qualified` |
| 4 | Packing Day | `negotiation` |
| 5 | Moving Day | `won` |

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Studio / 1BR Move | $300 - $600 |
| 2-3BR Move | $500 - $1,200 |
| 4BR+ Move | $1,000 - $2,500 |
| Packing Service | $200 - $600 |
| Piano Moving | $300 - $800 |
| Office Move | $800 - $3,000 |

**Drip Sequences:**

1. **New Lead Follow-Up**
   - 5 min after lead created (SMS): Thanks them, asks about move date
   - 24 hours after lead created (SMS): Follow-up offering free quote

2. **Quote Follow-Up**
   - 24 hours after quote sent (SMS): Check-in about move date
   - 3 days after quote sent (SMS): Urgency about weekends/end-of-month filling up

3. **Pre-Move Reminder**
   - 3 days before appointment (SMS): Checklist (label boxes, essentials bag, clear pathways)
   - 1 day before appointment (SMS): Arrival time, final prep reminders

4. **Post-Move Review Request**
   - 2 hours after job completed (SMS): Asks for Google review

---

### 3. Plumbing

**Pipeline:** Uses default Sales Pipeline (New Lead > Contacted > Qualified > Quote Sent > Negotiation > Won > Lost)

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Drain Cleaning | $150 - $250 |
| Water Heater Install | $1,500 - $3,000 |
| Pipe Repair | $200 - $500 |
| Bathroom Renovation | $5,000 - $15,000 |
| Leak Detection | $100 - $300 |
| Toilet Repair | $100 - $250 |
| Faucet Installation | $150 - $350 |

---

### 4. HVAC

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| AC Installation | $3,000 - $7,000 |
| AC Repair | $150 - $500 |
| AC Tune-Up | $80 - $150 |
| Furnace Installation | $3,000 - $6,000 |
| Furnace Repair | $150 - $500 |
| Duct Cleaning | $300 - $500 |
| Thermostat Install | $100 - $300 |

---

### 5. Electrical

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Panel Upgrade | $1,500 - $3,000 |
| Outlet Installation | $100 - $250 |
| Rewiring | $2,000 - $8,000 |
| Lighting Install | $100 - $500 |
| EV Charger Install | $500 - $2,000 |
| Ceiling Fan Install | $150 - $350 |

---

### 6. General Contractor

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Kitchen Renovation | $10,000 - $50,000 |
| Bathroom Renovation | $5,000 - $25,000 |
| Deck Building | $3,000 - $15,000 |
| Room Addition | $20,000 - $80,000 |
| Drywall Repair | $200 - $800 |
| Interior Painting | $500 - $3,000 |

---

### 7. Cleaning

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Standard Clean | $100 - $200 |
| Deep Clean | $200 - $400 |
| Move In/Out Clean | $250 - $500 |
| Carpet Cleaning | $100 - $300 |
| Window Cleaning | $100 - $250 |
| Office Cleaning | $150 - $400 |

---

### 8. Landscaping

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Lawn Mowing | $50 - $150 |
| Garden Design | $500 - $3,000 |
| Tree Trimming | $200 - $800 |
| Irrigation Install | $500 - $2,000 |
| Hardscaping | $1,000 - $5,000 |
| Mulching | $100 - $300 |

---

### 9. Auto Repair

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Oil Change | $30 - $80 |
| Brake Service | $150 - $400 |
| Tire Rotation | $30 - $60 |
| Engine Diagnostics | $80 - $150 |
| Transmission Service | $500 - $2,000 |
| AC Recharge | $100 - $250 |

---

### 10. Salon / Spa

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Haircut & Style | $30 - $80 |
| Hair Color | $80 - $200 |
| Manicure | $25 - $60 |
| Pedicure | $35 - $70 |
| Facial Treatment | $60 - $150 |
| Massage | $60 - $150 |

---

### 11. Dental

**Pipeline:** Uses default Sales Pipeline

**Booking Services:**
| Service | Price Range |
|---------|------------|
| Dental Cleaning | $100 - $250 |
| Dental Filling | $150 - $400 |
| Crown | $800 - $1,500 |
| Root Canal | $700 - $1,400 |
| Teeth Whitening | $200 - $500 |
| Tooth Extraction | $100 - $300 |

---

### 12. Roofing / Pest Control / Other

These verticals use the **default Sales Pipeline** and generic services (Consultation, Service Call, Maintenance).

---

## Default Sales Pipeline

Used by all verticals that do not have a custom pipeline template:

| Position | Stage Name | Slug | Color |
|----------|-----------|------|-------|
| 0 | New Lead | `new_lead` | #6366f1 (Indigo) |
| 1 | Contacted | `contacted` | #3b82f6 (Blue) |
| 2 | Qualified | `qualified` | #8b5cf6 (Purple) |
| 3 | Quote Sent | `quote_sent` | #f59e0b (Amber) |
| 4 | Negotiation | `negotiation` | #ef4444 (Red) |
| 5 | Won | `won` | #22c55e (Green) |
| 6 | Lost | `lost` | #6b7280 (Gray) |

---

## AI Agent Behavior by Vertical

The AI phone agent adapts its behavior based on the vertical:

- **Greeting:** Always starts with disclosure: "Hi, this is [Business Name]'s AI assistant. This call may be recorded."
- **Price Quoting:** Only quotes price RANGES configured during onboarding. Never exact prices.
- **Emergency Detection:** Keywords like "flooding", "gas leak", "fire", "burst pipe", "sewage", "no heat", "electrical fire" trigger instant owner alerts.
- **Escalation:** After 2 misunderstandings, the AI transfers to a human.
- **Appointment Booking:** Checks availability and books based on the business's configured hours and services.

---

## How to Add a New Vertical

Adding a new vertical requires changes in several places:

### 1. Database Schema

Add the vertical to the `verticalEnum` in `packages/db/src/schema/organizations.ts`:

```typescript
export const verticalEnum = pgEnum("vertical", [
  // ... existing verticals
  "new_vertical",
]);
```

### 2. Shared Constants

Add the vertical to `packages/shared/src/constants/index.ts`:

```typescript
export const VERTICALS = [
  // ... existing
  "new_vertical",
] as const;

export const VERTICAL_LABELS = {
  // ... existing
  new_vertical: "New Vertical",
};
```

### 3. Pipeline Template (Optional)

Add a custom pipeline in `packages/shared/src/constants/index.ts` under `PIPELINE_TEMPLATES`:

```typescript
export const PIPELINE_TEMPLATES = {
  // ... existing
  new_vertical: {
    name: "New Vertical Pipeline",
    stages: [
      { name: "Inquiry", slug: "new_lead", color: "#6366f1", position: 0 },
      // ... custom stages
    ],
  },
};
```

### 4. Drip Sequences (Optional)

Add drip sequence templates under `DRIP_SEQUENCE_TEMPLATES` in the same file.

### 5. Onboarding Services

Add services in `apps/web/src/lib/onboarding.ts` under `VERTICAL_SERVICES`:

```typescript
export const VERTICAL_SERVICES = {
  // ... existing
  new_vertical: [
    { id: "service-1", name: "Service Name", priceMin: 100, priceMax: 300 },
    // ... more services
  ],
};
```

### 6. Registration Validation

Add the vertical to the auth register schema in `apps/api/src/routes/auth.ts`:

```typescript
const registerSchema = z.object({
  vertical: z.enum([
    // ... existing
    'new_vertical',
  ]),
});
```

### 7. Onboarding UI

Add the vertical entry in `apps/web/src/lib/onboarding.ts` under `VERTICALS`:

```typescript
export const VERTICALS = [
  // ... existing
  { value: "new_vertical", label: "New Vertical", icon: "IconName" },
];
```

### 8. Generate and Run Migrations

```bash
pnpm db:generate
pnpm db:migrate
```
