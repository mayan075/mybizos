import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

import { users } from "./schema/auth.js";
import { organizations, orgMembers } from "./schema/organizations.js";
import { contacts } from "./schema/contacts.js";
import { pipelines, pipelineStages, deals } from "./schema/pipeline.js";
import { activities } from "./schema/activities.js";
import {
  conversations,
  messages,
} from "./schema/communications.js";
import {
  appointments,
  availabilityRules,
} from "./schema/scheduling.js";
import { aiAgents, aiCallLogs } from "./schema/ai.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple password hash for demo data. NOT for production use. */
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/** Generate a stable UUID from a seed string so re-runs are idempotent. */
function seededId(seed: string): string {
  return createHash("md5").update(seed).digest("hex").replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5",
  );
}

/** Return a date relative to today. Negative = past, positive = future. */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Return a date at a specific hour today (or offset days). */
function atHour(hour: number, minuteOffset = 0, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minuteOffset, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Stable IDs
// ---------------------------------------------------------------------------

const USER_ID = seededId("user-jim-henderson");
const ORG_ID = seededId("org-jims-plumbing");
const PIPELINE_ID = seededId("pipeline-sales");

const STAGE_IDS = {
  new_lead: seededId("stage-new-lead"),
  contacted: seededId("stage-contacted"),
  quote_sent: seededId("stage-quote-sent"),
  qualified: seededId("stage-qualified"),
  won: seededId("stage-won"),
  lost: seededId("stage-lost"),
};

const CONTACT_IDS = Array.from({ length: 15 }, (_, i) =>
  seededId(`contact-${i}`),
);

const DEAL_IDS = Array.from({ length: 10 }, (_, i) =>
  seededId(`deal-${i}`),
);

const ACTIVITY_IDS = Array.from({ length: 20 }, (_, i) =>
  seededId(`activity-${i}`),
);

const CONVERSATION_IDS = Array.from({ length: 8 }, (_, i) =>
  seededId(`conversation-${i}`),
);

const APPOINTMENT_IDS = Array.from({ length: 6 }, (_, i) =>
  seededId(`appointment-${i}`),
);

const AGENT_IDS = {
  phone: seededId("agent-phone"),
  sms: seededId("agent-sms"),
};

const CALL_LOG_IDS = Array.from({ length: 3 }, (_, i) =>
  seededId(`call-log-${i}`),
);

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const CONTACTS_DATA: Array<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: "manual" | "phone" | "sms" | "email" | "webform" | "referral" | "google_ads" | "facebook_ads" | "yelp" | "import";
  aiScore: number;
  tags: string[];
}> = [
  { id: CONTACT_IDS[0]!, firstName: "Robert", lastName: "Martinez", email: "rmartinez@gmail.com", phone: "+15559012345", source: "google_ads", aiScore: 85, tags: ["residential"] },
  { id: CONTACT_IDS[1]!, firstName: "Sarah", lastName: "Chen", email: "sarah.chen@outlook.com", phone: "+15559123456", source: "referral", aiScore: 92, tags: ["residential", "emergency"] },
  { id: CONTACT_IDS[2]!, firstName: "Mike", lastName: "Johnson", email: "mjohnson@yahoo.com", phone: "+15559234567", source: "yelp", aiScore: 45, tags: ["residential"] },
  { id: CONTACT_IDS[3]!, firstName: "Lisa", lastName: "Thompson", email: "lisa.t@gmail.com", phone: "+15559345678", source: "phone", aiScore: 78, tags: ["commercial"] },
  { id: CONTACT_IDS[4]!, firstName: "David", lastName: "Williams", email: "dwilliams@protonmail.com", phone: "+15559456789", source: "google_ads", aiScore: 60, tags: ["residential", "maintenance"] },
  { id: CONTACT_IDS[5]!, firstName: "Jennifer", lastName: "Davis", email: "jdavis@gmail.com", phone: "+15559567890", source: "referral", aiScore: 88, tags: ["commercial"] },
  { id: CONTACT_IDS[6]!, firstName: "Carlos", lastName: "Rodriguez", email: "carlos.r@hotmail.com", phone: "+15559678901", source: "webform", aiScore: 35, tags: ["residential"] },
  { id: CONTACT_IDS[7]!, firstName: "Amanda", lastName: "Wilson", email: "awilson@gmail.com", phone: "+15559789012", source: "google_ads", aiScore: 72, tags: ["residential", "emergency"] },
  { id: CONTACT_IDS[8]!, firstName: "Brian", lastName: "Taylor", email: "brian.taylor@outlook.com", phone: "+15559890123", source: "phone", aiScore: 50, tags: ["maintenance"] },
  { id: CONTACT_IDS[9]!, firstName: "Maria", lastName: "Garcia", email: "maria.g@yahoo.com", phone: "+15559901234", source: "yelp", aiScore: 95, tags: ["commercial", "maintenance"] },
  { id: CONTACT_IDS[10]!, firstName: "Kevin", lastName: "Brown", email: "kbrown@gmail.com", phone: "+15550012345", source: "referral", aiScore: 20, tags: ["residential"] },
  { id: CONTACT_IDS[11]!, firstName: "Patricia", lastName: "Anderson", email: "panderson@outlook.com", phone: "+15550123456", source: "google_ads", aiScore: 67, tags: ["residential"] },
  { id: CONTACT_IDS[12]!, firstName: "James", lastName: "Lee", email: "jameslee@gmail.com", phone: "+15550234567", source: "webform", aiScore: 82, tags: ["commercial", "emergency"] },
  { id: CONTACT_IDS[13]!, firstName: "Nancy", lastName: "Clark", email: "nancy.clark@yahoo.com", phone: "+15550345678", source: "phone", aiScore: 55, tags: ["residential", "maintenance"] },
  { id: CONTACT_IDS[14]!, firstName: "Thomas", lastName: "Moore", email: "tmoore@protonmail.com", phone: "+15550456789", source: "yelp", aiScore: 40, tags: ["residential"] },
];

const DEALS_DATA: Array<{
  id: string;
  contactIdx: number;
  stageKey: keyof typeof STAGE_IDS;
  title: string;
  value: string;
  daysAgo: number;
}> = [
  { id: DEAL_IDS[0]!, contactIdx: 0, stageKey: "new_lead", title: "Drain Cleaning", value: "250.00", daysAgo: 1 },
  { id: DEAL_IDS[1]!, contactIdx: 1, stageKey: "contacted", title: "Water Heater Replacement", value: "3500.00", daysAgo: 3 },
  { id: DEAL_IDS[2]!, contactIdx: 2, stageKey: "quote_sent", title: "Bathroom Remodel Plumbing", value: "8000.00", daysAgo: 5 },
  { id: DEAL_IDS[3]!, contactIdx: 3, stageKey: "qualified", title: "Commercial HVAC Maintenance", value: "2200.00", daysAgo: 7 },
  { id: DEAL_IDS[4]!, contactIdx: 4, stageKey: "new_lead", title: "Garbage Disposal Install", value: "450.00", daysAgo: 0 },
  { id: DEAL_IDS[5]!, contactIdx: 5, stageKey: "won", title: "AC Installation", value: "6500.00", daysAgo: 14 },
  { id: DEAL_IDS[6]!, contactIdx: 6, stageKey: "lost", title: "Pipe Repair", value: "800.00", daysAgo: 10 },
  { id: DEAL_IDS[7]!, contactIdx: 7, stageKey: "contacted", title: "Sewer Line Inspection", value: "350.00", daysAgo: 2 },
  { id: DEAL_IDS[8]!, contactIdx: 8, stageKey: "won", title: "Furnace Tune-Up", value: "150.00", daysAgo: 20 },
  { id: DEAL_IDS[9]!, contactIdx: 9, stageKey: "qualified", title: "Commercial Kitchen Plumbing", value: "5500.00", daysAgo: 4 },
];

const ACTIVITIES_DATA: Array<{
  id: string;
  contactIdx: number;
  type: "call" | "sms" | "email" | "note" | "meeting" | "task" | "deal_stage_change" | "ai_interaction" | "form_submission" | "appointment_booked" | "appointment_completed" | "payment_received";
  title: string;
  description: string;
  daysAgo: number;
}> = [
  { id: ACTIVITY_IDS[0]!, contactIdx: 0, type: "call", title: "Inbound call", description: "Robert called about a slow drain in kitchen sink. Scheduled estimate.", daysAgo: 1 },
  { id: ACTIVITY_IDS[1]!, contactIdx: 0, type: "note", title: "Site visit note", description: "Kitchen drain backed up. Likely grease buildup. Quoted $200-300 for snake + clean.", daysAgo: 0 },
  { id: ACTIVITY_IDS[2]!, contactIdx: 1, type: "email", title: "Estimate sent", description: "Sent detailed estimate for 50-gallon gas water heater replacement including permits.", daysAgo: 3 },
  { id: ACTIVITY_IDS[3]!, contactIdx: 1, type: "sms", title: "Follow-up SMS", description: "Hi Sarah, just checking in on the water heater estimate. Happy to answer any questions!", daysAgo: 2 },
  { id: ACTIVITY_IDS[4]!, contactIdx: 2, type: "call", title: "Consultation call", description: "Mike wants full bathroom remodel. Discussed layout options and rough-in requirements.", daysAgo: 5 },
  { id: ACTIVITY_IDS[5]!, contactIdx: 2, type: "email", title: "Quote sent", description: "Sent comprehensive quote for bathroom remodel plumbing: rough-in, fixtures, and finishing.", daysAgo: 4 },
  { id: ACTIVITY_IDS[6]!, contactIdx: 3, type: "appointment_booked", title: "HVAC inspection scheduled", description: "Scheduled annual HVAC maintenance inspection at Thompson Commercial Plaza.", daysAgo: 7 },
  { id: ACTIVITY_IDS[7]!, contactIdx: 4, type: "ai_interaction", title: "AI phone call", description: "AI agent handled initial inquiry about garbage disposal installation. Qualified the lead.", daysAgo: 0 },
  { id: ACTIVITY_IDS[8]!, contactIdx: 5, type: "payment_received", title: "Payment received", description: "Full payment received for AC installation. Job completed successfully.", daysAgo: 12 },
  { id: ACTIVITY_IDS[9]!, contactIdx: 5, type: "appointment_completed", title: "AC install completed", description: "Installed 3-ton Carrier AC unit. System tested and running efficiently.", daysAgo: 13 },
  { id: ACTIVITY_IDS[10]!, contactIdx: 6, type: "call", title: "Follow-up call", description: "Carlos decided to go with another contractor. Price was the main factor.", daysAgo: 9 },
  { id: ACTIVITY_IDS[11]!, contactIdx: 7, type: "sms", title: "Inbound SMS", description: "Amanda texted asking about sewer line inspection pricing and availability.", daysAgo: 2 },
  { id: ACTIVITY_IDS[12]!, contactIdx: 8, type: "appointment_completed", title: "Furnace tune-up done", description: "Annual furnace tune-up completed. Replaced air filter, checked ignitor and heat exchanger.", daysAgo: 18 },
  { id: ACTIVITY_IDS[13]!, contactIdx: 9, type: "call", title: "Commercial inquiry", description: "Maria called about kitchen plumbing for new restaurant buildout. Needs grease trap and 3-compartment sink.", daysAgo: 4 },
  { id: ACTIVITY_IDS[14]!, contactIdx: 9, type: "note", title: "Site survey", description: "Visited location. 2,400 sq ft commercial kitchen. Need 50lb grease trap, 3-comp sink, hand sinks, floor drains.", daysAgo: 3 },
  { id: ACTIVITY_IDS[15]!, contactIdx: 10, type: "ai_interaction", title: "AI SMS conversation", description: "AI agent responded to Kevin's inquiry about leaky faucet. Low priority lead.", daysAgo: 6 },
  { id: ACTIVITY_IDS[16]!, contactIdx: 11, type: "email", title: "Marketing email opened", description: "Patricia opened the spring maintenance special email. Clicked on AC tune-up link.", daysAgo: 8 },
  { id: ACTIVITY_IDS[17]!, contactIdx: 12, type: "call", title: "Emergency call", description: "James called about burst pipe in office building. Dispatched crew immediately.", daysAgo: 1 },
  { id: ACTIVITY_IDS[18]!, contactIdx: 13, type: "sms", title: "Reminder sent", description: "Sent appointment reminder for annual plumbing inspection.", daysAgo: 2 },
  { id: ACTIVITY_IDS[19]!, contactIdx: 14, type: "call", title: "Quote follow-up", description: "Called Thomas about toilet replacement quote. He's still deciding.", daysAgo: 5 },
];

// ---------------------------------------------------------------------------
// Conversation + message data
// ---------------------------------------------------------------------------

type Channel = "sms" | "email" | "call";
type MsgDirection = "inbound" | "outbound";
type SenderType = "contact" | "user" | "ai";

interface ConversationSeed {
  id: string;
  contactIdx: number;
  channel: Channel;
  aiHandled: boolean;
  status: "open" | "closed" | "snoozed";
  messages: Array<{
    direction: MsgDirection;
    senderType: SenderType;
    body: string;
    minutesAgo: number;
  }>;
}

const CONVERSATIONS_DATA: ConversationSeed[] = [
  {
    id: CONVERSATION_IDS[0]!,
    contactIdx: 0,
    channel: "sms",
    aiHandled: false,
    status: "open",
    messages: [
      { direction: "inbound", senderType: "contact", body: "Hi, I have a clogged kitchen drain. Are you available today?", minutesAgo: 120 },
      { direction: "outbound", senderType: "user", body: "Hi Robert! Yes, we can come by this afternoon between 2-4 PM. Does that work?", minutesAgo: 110 },
      { direction: "inbound", senderType: "contact", body: "That works! The address is 145 Oak Street, Apt 2B.", minutesAgo: 105 },
      { direction: "outbound", senderType: "user", body: "Great, see you then. Our tech Mike will call when he's on his way.", minutesAgo: 100 },
    ],
  },
  {
    id: CONVERSATION_IDS[1]!,
    contactIdx: 1,
    channel: "email",
    aiHandled: false,
    status: "open",
    messages: [
      { direction: "inbound", senderType: "contact", body: "Hello, I received the estimate for the water heater. A few questions: does the price include the permit fee? And how long will the installation take?", minutesAgo: 4320 },
      { direction: "outbound", senderType: "user", body: "Hi Sarah, great questions! Yes, the permit fee is included in our quote. Installation typically takes 4-6 hours. We handle everything including removing the old unit.", minutesAgo: 4200 },
      { direction: "inbound", senderType: "contact", body: "Perfect. Can we schedule it for next Tuesday?", minutesAgo: 3000 },
    ],
  },
  {
    id: CONVERSATION_IDS[2]!,
    contactIdx: 4,
    channel: "sms",
    aiHandled: true,
    status: "open",
    messages: [
      { direction: "inbound", senderType: "contact", body: "Do you guys install garbage disposals? My old one just died.", minutesAgo: 60 },
      { direction: "outbound", senderType: "ai", body: "Hi David! Yes, we install and replace garbage disposals. The typical cost ranges from $350-550 depending on the model. Would you like to schedule a free estimate?", minutesAgo: 59 },
      { direction: "inbound", senderType: "contact", body: "Sure, what times do you have available?", minutesAgo: 55 },
      { direction: "outbound", senderType: "ai", body: "We have availability tomorrow between 10 AM - 12 PM or Thursday 1 PM - 3 PM. Which works better for you?", minutesAgo: 54 },
      { direction: "inbound", senderType: "contact", body: "Thursday afternoon works for me", minutesAgo: 50 },
    ],
  },
  {
    id: CONVERSATION_IDS[3]!,
    contactIdx: 7,
    channel: "sms",
    aiHandled: true,
    status: "open",
    messages: [
      { direction: "inbound", senderType: "contact", body: "I think I need a sewer line inspection. We keep getting backups.", minutesAgo: 2880 },
      { direction: "outbound", senderType: "ai", body: "Hi Amanda! Sorry to hear about the backups. A sewer camera inspection typically costs $250-400 and helps us identify the exact issue. Would you like to schedule one?", minutesAgo: 2878 },
      { direction: "inbound", senderType: "contact", body: "Yes please. How soon can you come out?", minutesAgo: 2700 },
      { direction: "outbound", senderType: "user", body: "Hi Amanda, this is Jim. We can come out tomorrow morning. I'll bring the camera scope and we'll get to the bottom of it. Does 9 AM work?", minutesAgo: 2650 },
    ],
  },
  {
    id: CONVERSATION_IDS[4]!,
    contactIdx: 9,
    channel: "email",
    aiHandled: false,
    status: "open",
    messages: [
      { direction: "inbound", senderType: "contact", body: "Hi, I'm opening a new restaurant and need complete kitchen plumbing. Can you do commercial work?", minutesAgo: 5760 },
      { direction: "outbound", senderType: "user", body: "Hi Maria! Absolutely, we handle commercial kitchen plumbing including grease traps, 3-compartment sinks, floor drains, and all code-compliant rough-in work. I'd love to visit the site to give you an accurate estimate.", minutesAgo: 5600 },
      { direction: "inbound", senderType: "contact", body: "That sounds great. The space is at 890 Main Street, Suite 100. When can you come take a look?", minutesAgo: 5400 },
    ],
  },
  {
    id: CONVERSATION_IDS[5]!,
    contactIdx: 12,
    channel: "call",
    aiHandled: false,
    status: "closed",
    messages: [
      { direction: "inbound", senderType: "contact", body: "URGENT: Burst pipe in the 2nd floor bathroom, water coming through the ceiling!", minutesAgo: 1440 },
      { direction: "outbound", senderType: "user", body: "James, we're sending someone right now. Please shut off the main water valve if you can. We'll be there in 20 minutes.", minutesAgo: 1435 },
      { direction: "inbound", senderType: "contact", body: "Valve is off. Thank you for the quick response.", minutesAgo: 1430 },
      { direction: "outbound", senderType: "user", body: "Our crew is on site now. We've stopped the leak and will have the pipe replaced within the hour.", minutesAgo: 1380 },
    ],
  },
  {
    id: CONVERSATION_IDS[6]!,
    contactIdx: 10,
    channel: "sms",
    aiHandled: true,
    status: "snoozed",
    messages: [
      { direction: "inbound", senderType: "contact", body: "Hey, my bathroom faucet is dripping. Not urgent but it's annoying.", minutesAgo: 8640 },
      { direction: "outbound", senderType: "ai", body: "Hi Kevin! A dripping faucet usually needs a cartridge or washer replacement. The fix typically costs $85-150 for parts and labor. Would you like to schedule a visit?", minutesAgo: 8638 },
      { direction: "inbound", senderType: "contact", body: "Let me think about it. I'll get back to you.", minutesAgo: 8600 },
    ],
  },
  {
    id: CONVERSATION_IDS[7]!,
    contactIdx: 13,
    channel: "sms",
    aiHandled: false,
    status: "open",
    messages: [
      { direction: "outbound", senderType: "user", body: "Hi Nancy, this is a reminder about your annual plumbing inspection scheduled for this Wednesday at 10 AM. See you then!", minutesAgo: 2880 },
      { direction: "inbound", senderType: "contact", body: "Thanks for the reminder! We'll be here.", minutesAgo: 2800 },
      { direction: "outbound", senderType: "user", body: "Perfect. Our tech will arrive between 10-10:30 AM.", minutesAgo: 2780 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  const connectionString =
    process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/mybizos_dev";

  const queryClient = postgres(connectionString, { max: 1 });
  const db = drizzle(queryClient);

  console.log("Seeding database...\n");

  // --- 1. User -----------------------------------------------------------
  console.log("  Creating demo user...");
  await db.insert(users).values({
    id: USER_ID,
    email: "jim@jimsplumbing.com",
    passwordHash: hashPassword("demo1234"),
    name: "Jim Henderson",
    emailVerified: true,
    isActive: true,
  }).onConflictDoNothing();

  // --- 2. Organization ----------------------------------------------------
  console.log("  Creating organization...");
  await db.insert(organizations).values({
    id: ORG_ID,
    name: "Jim's Plumbing & HVAC",
    slug: "jims-plumbing",
    vertical: "plumbing",
    timezone: "America/New_York",
    phone: "+15551234567",
    email: "info@jimsplumbing.com",
    website: "https://jimsplumbing.com",
    address: "123 Trade Street, Charlotte, NC 28202",
    settings: {
      twilioNumber: "+15551234567",
      businessHours: { start: "08:00", end: "17:00" },
      aiEnabled: true,
    },
  }).onConflictDoNothing();

  // --- 3. Org member ------------------------------------------------------
  console.log("  Linking user to org...");
  await db.insert(orgMembers).values({
    id: seededId("orgmember-jim"),
    orgId: ORG_ID,
    userId: USER_ID,
    role: "owner",
    isActive: true,
  }).onConflictDoNothing();

  // --- 4. Pipeline + stages -----------------------------------------------
  console.log("  Creating pipeline and stages...");
  await db.insert(pipelines).values({
    id: PIPELINE_ID,
    orgId: ORG_ID,
    name: "Sales Pipeline",
    isDefault: true,
  }).onConflictDoNothing();

  const stageRows: Array<{
    id: string;
    pipelineId: string;
    orgId: string;
    name: string;
    slug: "new_lead" | "contacted" | "qualified" | "quote_sent" | "negotiation" | "won" | "lost";
    position: number;
    color: string;
  }> = [
    { id: STAGE_IDS.new_lead, pipelineId: PIPELINE_ID, orgId: ORG_ID, name: "New Lead", slug: "new_lead", position: 0, color: "#6366f1" },
    { id: STAGE_IDS.contacted, pipelineId: PIPELINE_ID, orgId: ORG_ID, name: "Contacted", slug: "contacted", position: 1, color: "#3b82f6" },
    { id: STAGE_IDS.quote_sent, pipelineId: PIPELINE_ID, orgId: ORG_ID, name: "Quoted", slug: "quote_sent", position: 2, color: "#f59e0b" },
    { id: STAGE_IDS.qualified, pipelineId: PIPELINE_ID, orgId: ORG_ID, name: "Scheduled", slug: "qualified", position: 3, color: "#8b5cf6" },
    { id: STAGE_IDS.won, pipelineId: PIPELINE_ID, orgId: ORG_ID, name: "Won", slug: "won", position: 4, color: "#22c55e" },
    { id: STAGE_IDS.lost, pipelineId: PIPELINE_ID, orgId: ORG_ID, name: "Lost", slug: "lost", position: 5, color: "#ef4444" },
  ];
  for (const stage of stageRows) {
    await db.insert(pipelineStages).values(stage).onConflictDoNothing();
  }

  // --- 5. Contacts --------------------------------------------------------
  console.log("  Creating 15 contacts...");
  for (const c of CONTACTS_DATA) {
    await db.insert(contacts).values({
      id: c.id,
      orgId: ORG_ID,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      source: c.source,
      aiScore: c.aiScore,
      tags: c.tags,
      customFields: {},
      createdAt: daysFromNow(-Math.floor(Math.random() * 60 + 1)),
    }).onConflictDoNothing();
  }

  // --- 6. Deals -----------------------------------------------------------
  console.log("  Creating 10 deals...");
  for (const d of DEALS_DATA) {
    await db.insert(deals).values({
      id: d.id,
      orgId: ORG_ID,
      pipelineId: PIPELINE_ID,
      stageId: STAGE_IDS[d.stageKey],
      contactId: CONTACT_IDS[d.contactIdx]!,
      title: d.title,
      value: d.value,
      currency: "USD",
      assignedTo: USER_ID,
      metadata: {},
      closedAt: d.stageKey === "won" || d.stageKey === "lost" ? daysFromNow(-d.daysAgo) : null,
      createdAt: daysFromNow(-d.daysAgo - 5),
    }).onConflictDoNothing();
  }

  // --- 7. Activities ------------------------------------------------------
  console.log("  Creating 20 activities...");
  for (const a of ACTIVITIES_DATA) {
    await db.insert(activities).values({
      id: a.id,
      orgId: ORG_ID,
      contactId: CONTACT_IDS[a.contactIdx]!,
      type: a.type,
      title: a.title,
      description: a.description,
      performedBy: USER_ID,
      metadata: {},
      createdAt: daysFromNow(-a.daysAgo),
    }).onConflictDoNothing();
  }

  // --- 8. Conversations + messages ----------------------------------------
  console.log("  Creating 8 conversations with messages...");
  for (const conv of CONVERSATIONS_DATA) {
    const lastMsg = conv.messages[conv.messages.length - 1]!;
    const lastMessageAt = new Date(Date.now() - lastMsg.minutesAgo * 60_000);

    await db.insert(conversations).values({
      id: conv.id,
      orgId: ORG_ID,
      contactId: CONTACT_IDS[conv.contactIdx]!,
      channel: conv.channel,
      status: conv.status,
      assignedTo: conv.aiHandled ? null : USER_ID,
      aiHandled: conv.aiHandled,
      lastMessageAt,
      unreadCount: conv.status === "open" ? conv.messages.filter((m) => m.direction === "inbound").length : 0,
    }).onConflictDoNothing();

    for (let mi = 0; mi < conv.messages.length; mi++) {
      const msg = conv.messages[mi]!;
      await db.insert(messages).values({
        id: seededId(`msg-${conv.id}-${mi}`),
        conversationId: conv.id,
        orgId: ORG_ID,
        direction: msg.direction,
        channel: conv.channel,
        senderType: msg.senderType,
        senderId: msg.senderType === "contact" ? CONTACT_IDS[conv.contactIdx]! : (msg.senderType === "user" ? USER_ID : null),
        body: msg.body,
        mediaUrls: [],
        metadata: {},
        status: "delivered",
        createdAt: new Date(Date.now() - msg.minutesAgo * 60_000),
      }).onConflictDoNothing();
    }
  }

  // --- 9. Appointments ----------------------------------------------------
  console.log("  Creating 6 appointments...");
  const appointmentData: Array<{
    id: string;
    contactIdx: number;
    title: string;
    description: string;
    dayOffset: number;
    hour: number;
    durationHours: number;
    status: "scheduled" | "confirmed" | "completed";
    location: string;
  }> = [
    { id: APPOINTMENT_IDS[0]!, contactIdx: 0, title: "Drain Cleaning - Martinez", description: "Kitchen drain snake and clean", dayOffset: 0, hour: 14, durationHours: 2, status: "confirmed", location: "145 Oak Street, Apt 2B, Charlotte, NC" },
    { id: APPOINTMENT_IDS[1]!, contactIdx: 1, title: "Water Heater Install - Chen", description: "Remove old 40-gal, install new 50-gal gas water heater", dayOffset: 1, hour: 9, durationHours: 5, status: "scheduled", location: "78 Maple Drive, Charlotte, NC" },
    { id: APPOINTMENT_IDS[2]!, contactIdx: 3, title: "HVAC Inspection - Thompson", description: "Annual commercial HVAC system inspection and maintenance", dayOffset: 2, hour: 10, durationHours: 3, status: "scheduled", location: "Thompson Commercial Plaza, 500 Commerce Blvd" },
    { id: APPOINTMENT_IDS[3]!, contactIdx: 7, title: "Sewer Inspection - Wilson", description: "Camera inspection of main sewer line", dayOffset: 1, hour: 9, durationHours: 2, status: "confirmed", location: "234 Pine Avenue, Charlotte, NC" },
    { id: APPOINTMENT_IDS[4]!, contactIdx: 13, title: "Plumbing Inspection - Clark", description: "Annual whole-house plumbing inspection", dayOffset: 3, hour: 10, durationHours: 2, status: "scheduled", location: "567 Birch Lane, Charlotte, NC" },
    { id: APPOINTMENT_IDS[5]!, contactIdx: 8, title: "Furnace Tune-Up - Taylor", description: "Annual furnace maintenance and inspection", dayOffset: -2, hour: 13, durationHours: 2, status: "completed", location: "891 Cedar Court, Charlotte, NC" },
  ];

  for (const appt of appointmentData) {
    await db.insert(appointments).values({
      id: appt.id,
      orgId: ORG_ID,
      contactId: CONTACT_IDS[appt.contactIdx]!,
      assignedTo: USER_ID,
      title: appt.title,
      description: appt.description,
      startTime: atHour(appt.hour, 0, appt.dayOffset),
      endTime: atHour(appt.hour + appt.durationHours, 0, appt.dayOffset),
      status: appt.status,
      location: appt.location,
    }).onConflictDoNothing();
  }

  // --- 10. AI Agents ------------------------------------------------------
  console.log("  Creating 2 AI agents...");
  await db.insert(aiAgents).values({
    id: AGENT_IDS.phone,
    orgId: ORG_ID,
    type: "phone",
    name: "Jim's Plumbing Phone Agent",
    vertical: "plumbing",
    systemPrompt: `You are the AI phone assistant for Jim's Plumbing & HVAC. You answer calls professionally and help callers with scheduling, pricing questions, and emergencies.

RULES:
- Always start with: "Hi, this is Jim's Plumbing & HVAC AI assistant. This call may be recorded."
- For pricing, give RANGES only (e.g., "typically $150-250")
- For emergencies (flooding, gas leak, fire), say: "I'm flagging this as urgent and notifying Jim immediately."
- After 2 misunderstandings, say: "Let me connect you with Jim directly."
- Collect: name, phone, address, description of issue, urgency level
- Try to book an appointment if the caller is interested`,
    isActive: true,
    settings: {
      greeting: "Hi, this is Jim's Plumbing & HVAC AI assistant. This call may be recorded. How can I help you today?",
      maxMisunderstandings: 2,
      escalationPhone: "+15551234567",
      emergencyKeywords: ["flooding", "flood", "gas leak", "gas smell", "fire", "burst pipe", "sewage"],
      voiceId: "rachel",
      language: "en-US",
    },
  }).onConflictDoNothing();

  await db.insert(aiAgents).values({
    id: AGENT_IDS.sms,
    orgId: ORG_ID,
    type: "sms",
    name: "Jim's Plumbing SMS Agent",
    vertical: "plumbing",
    systemPrompt: `You are the AI SMS assistant for Jim's Plumbing & HVAC. You respond to text messages quickly and helpfully.

RULES:
- Keep responses concise (under 160 characters when possible)
- For pricing, give RANGES only
- For emergencies, immediately notify the team and tell the customer to call 911 if needed
- Try to schedule appointments when appropriate
- Always be professional but friendly`,
    isActive: true,
    settings: {
      autoReplyEnabled: true,
      maxResponseTime: 30,
      afterHoursMessage: "Thanks for reaching out! Our office hours are Mon-Fri 8 AM - 5 PM, Sat 9 AM - 1 PM. We'll respond first thing next business day.",
    },
  }).onConflictDoNothing();

  // --- 11. AI Call Logs ---------------------------------------------------
  console.log("  Creating 3 AI call logs...");
  const callLogData: Array<{
    id: string;
    contactIdx: number;
    direction: "inbound" | "outbound";
    durationSeconds: number;
    transcript: string;
    summary: string;
    outcome: "booked" | "qualified" | "escalated";
    daysAgo: number;
  }> = [
    {
      id: CALL_LOG_IDS[0]!,
      contactIdx: 4,
      direction: "inbound",
      durationSeconds: 185,
      transcript: `AI: Hi, this is Jim's Plumbing & HVAC AI assistant. This call may be recorded. How can I help you today?
Caller: Yeah, my garbage disposal stopped working. It just makes a humming noise.
AI: I'm sorry to hear that. A humming disposal usually means something is jammed or the motor is failing. We can send a technician to diagnose and fix it. The cost typically ranges from $350 to $550 depending on whether it needs repair or replacement. Would you like to schedule an appointment?
Caller: Sure, what do you have available?
AI: We have openings tomorrow between 10 AM and noon, or Thursday afternoon from 1 to 3 PM. Which works better for you?
Caller: Thursday afternoon works.
AI: Great! I've scheduled you for Thursday between 1 and 3 PM. Can I get your name and address?
Caller: David Williams, 412 Elm Street.
AI: Perfect, David. You're all set for Thursday. Our technician will call when they're on the way. Is there anything else I can help with?
Caller: No, that's it. Thanks!
AI: Thank you for calling Jim's Plumbing & HVAC. Have a great day!`,
      summary: "Inbound call about a non-working garbage disposal (humming noise). Caller scheduled for Thursday 1-3 PM. Customer: David Williams at 412 Elm Street.",
      outcome: "booked",
      daysAgo: 0,
    },
    {
      id: CALL_LOG_IDS[1]!,
      contactIdx: 11,
      direction: "inbound",
      durationSeconds: 142,
      transcript: `AI: Hi, this is Jim's Plumbing & HVAC AI assistant. This call may be recorded. How can I help you today?
Caller: Hi, I got your flyer about the spring AC tune-up special. How much is it?
AI: Great question! Our spring AC tune-up special is typically priced between $89 and $129. It includes a full system inspection, filter replacement, refrigerant check, and coil cleaning. Would you like to schedule one?
Caller: That sounds reasonable. I need to check with my husband first though.
AI: No problem at all! When you're ready, you can call us back or text us at this number. The special runs through the end of April.
Caller: Perfect, I'll call back this week.
AI: Sounds great! We look forward to hearing from you. Have a wonderful day!`,
      summary: "Inbound call about spring AC tune-up special. Caller interested but needs to confirm with spouse. Will call back. Customer: Patricia Anderson.",
      outcome: "qualified",
      daysAgo: 2,
    },
    {
      id: CALL_LOG_IDS[2]!,
      contactIdx: 12,
      direction: "inbound",
      durationSeconds: 95,
      transcript: `AI: Hi, this is Jim's Plumbing & HVAC AI assistant. This call may be recorded. How can I help you today?
Caller: We have a burst pipe! Water is spraying everywhere in our office!
AI: I understand this is an emergency. I'm flagging this as urgent and notifying Jim immediately. Can you please shut off the main water valve if possible?
Caller: Where is that?!
AI: It's usually near your water meter, often in the basement or near where the main water line enters the building. Let me connect you with Jim directly right now.
Caller: Please hurry!
AI: Transferring you now. Stay on the line.`,
      summary: "EMERGENCY: Burst pipe in office building. Water actively spraying. Escalated to Jim immediately. Customer: James Lee.",
      outcome: "escalated",
      daysAgo: 1,
    },
  ];

  for (const log of callLogData) {
    await db.insert(aiCallLogs).values({
      id: log.id,
      orgId: ORG_ID,
      agentId: AGENT_IDS.phone,
      contactId: CONTACT_IDS[log.contactIdx]!,
      conversationId: null,
      twilioCallSid: `CA${randomUUID().replace(/-/g, "").substring(0, 32)}`,
      direction: log.direction,
      durationSeconds: log.durationSeconds,
      transcript: log.transcript,
      summary: log.summary,
      sentiment: log.outcome === "escalated" ? "negative" : "positive",
      outcome: log.outcome,
      createdAt: daysFromNow(-log.daysAgo),
    }).onConflictDoNothing();
  }

  // --- 12. Availability rules ---------------------------------------------
  console.log("  Creating availability rules...");
  const days: Array<{ day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"; start: string; end: string; active: boolean }> = [
    { day: "monday", start: "08:00", end: "17:00", active: true },
    { day: "tuesday", start: "08:00", end: "17:00", active: true },
    { day: "wednesday", start: "08:00", end: "17:00", active: true },
    { day: "thursday", start: "08:00", end: "17:00", active: true },
    { day: "friday", start: "08:00", end: "17:00", active: true },
    { day: "saturday", start: "09:00", end: "13:00", active: true },
    { day: "sunday", start: "00:00", end: "00:00", active: false },
  ];

  for (const rule of days) {
    await db.insert(availabilityRules).values({
      id: seededId(`avail-${rule.day}`),
      orgId: ORG_ID,
      userId: USER_ID,
      dayOfWeek: rule.day,
      startTime: rule.start,
      endTime: rule.end,
      isActive: rule.active,
    }).onConflictDoNothing();
  }

  // --- Done ---------------------------------------------------------------
  console.log("\nSeed complete!");
  console.log("  User:  jim@jimsplumbing.com / demo1234");
  console.log("  Org:   Jim's Plumbing & HVAC");
  console.log("  Data:  15 contacts, 10 deals, 20 activities, 8 conversations, 6 appointments\n");

  await queryClient.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
