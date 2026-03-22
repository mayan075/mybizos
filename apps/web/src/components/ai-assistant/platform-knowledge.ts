/* -------------------------------------------------------------------------- */
/*  MyBizOS Platform Knowledge Base                                           */
/*  Comprehensive answers for the AI Assistant                                */
/* -------------------------------------------------------------------------- */

export interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  answer: string;
}

export const PLATFORM_KNOWLEDGE: KnowledgeEntry[] = [
  /* ====================================================================== */
  /*  Getting Started                                                        */
  /* ====================================================================== */
  {
    topic: "Getting Started",
    keywords: [
      "get started",
      "getting started",
      "setup",
      "set up",
      "new account",
      "onboarding",
      "first time",
      "begin",
      "start",
      "how to use",
      "new here",
      "just signed up",
      "where do i start",
    ],
    answer: `Welcome to MyBizOS! Here's how to get your account fully set up:

**Step 1: Complete your business profile**
Go to Settings > Business Profile. Fill in your business name, address, service area, and business hours. This info powers your AI phone agent and booking page.

**Step 2: Connect your phone number**
Go to Settings > Phone. You can either bring your own Twilio number (Model A) or use our managed phone service (Model B). Your AI agent will answer calls on this number 24/7.

**Step 3: Set up your pipeline**
Go to Pipeline to customize your deal stages. The default stages (New Lead, Contacted, Quoted, Won, Lost) work for most businesses, but you can rename or add stages.

**Step 4: Import your contacts**
Go to Contacts and click "Import" to bring in your existing customer list via CSV. Or just start adding contacts manually.

**Step 5: Configure your AI phone agent**
Go to Settings > AI Agent to customize how your AI answers calls, what services to offer, and your pricing ranges.

**Step 6: Set up your booking page**
Go to Scheduling to create your online booking page. Set your availability, services, and share the link with customers.

That's it! You're ready to start receiving calls and booking jobs.`,
  },

  /* ====================================================================== */
  /*  Phone / Twilio Setup                                                   */
  /* ====================================================================== */
  {
    topic: "Phone System Setup",
    keywords: [
      "phone",
      "twilio",
      "phone number",
      "connect phone",
      "call",
      "calling",
      "phone setup",
      "sip",
      "voice",
      "inbound",
      "outbound",
      "phone system",
      "model a",
      "model b",
      "bring your own",
      "managed phone",
      "forward calls",
      "call forwarding",
    ],
    answer: `MyBizOS offers two ways to connect your phone system:

**Model A: Bring Your Own Twilio (Advanced)**
1. Go to Settings > Phone
2. Click "Connect Twilio Account"
3. Enter your Twilio Account SID and Auth Token (found at twilio.com/console)
4. Select which Twilio phone number to use
5. We'll automatically configure the webhooks so calls route to your AI agent
6. Cost: You pay Twilio directly (typically $1/month per number + ~$0.02/min)

**Model B: Managed Phone Service (Recommended)**
1. Go to Settings > Phone
2. Click "Get a New Number"
3. Choose your area code
4. We handle everything - Twilio setup, configuration, and billing
5. Cost: Included in your plan with per-minute rates for AI calls

**After setup, your AI agent will:**
- Answer every inbound call within 2 rings
- Introduce itself with your business name
- Qualify the lead and gather contact info
- Book appointments on your calendar
- Send you a notification for every call

**To make outbound calls:**
Use the Dialer (bottom-right of your screen) to call contacts directly from MyBizOS.`,
  },

  /* ====================================================================== */
  /*  AI Phone Agent                                                         */
  /* ====================================================================== */
  {
    topic: "AI Phone Agent Configuration",
    keywords: [
      "ai agent",
      "ai phone",
      "voice agent",
      "ai assistant",
      "ai settings",
      "configure ai",
      "ai call",
      "robot",
      "automated",
      "answering service",
      "virtual receptionist",
      "ai receptionist",
      "vapi",
      "agent settings",
      "greeting",
      "ai voice",
    ],
    answer: `Your AI Phone Agent is your 24/7 virtual receptionist. Here's how to configure it:

**Go to Settings > AI Agent**

**1. Business Information**
- Business name (how the AI introduces itself)
- Services you offer (HVAC, plumbing, electrical, etc.)
- Service area (cities/zip codes you cover)
- Business hours (so AI knows when you're open vs after-hours)

**2. Pricing Ranges**
- Set price ranges for each service (e.g., "drain cleaning: $150-250")
- The AI will ONLY quote ranges, never exact prices
- This protects you from pricing commitments

**3. Call Handling Rules**
- Max conversation length (default: 5 minutes)
- After 2 misunderstandings, AI offers to transfer to a human
- Emergency keywords (flooding, gas leak, fire) trigger instant alerts to you
- After-hours behavior: take message vs. offer emergency service

**4. Booking Integration**
- Connect to your Scheduling page so the AI can book appointments
- Set which services can be booked directly vs. need a quote first

**5. Notifications**
- Get SMS/email alerts for every call
- Instant alerts for emergency calls
- Daily summary of all calls

Every call is recorded and transcribed. View them in the Calls section.`,
  },

  /* ====================================================================== */
  /*  Campaigns                                                              */
  /* ====================================================================== */
  {
    topic: "Campaigns",
    keywords: [
      "campaign",
      "campaigns",
      "email campaign",
      "sms campaign",
      "blast",
      "mass text",
      "bulk",
      "send campaign",
      "marketing",
      "newsletter",
      "broadcast",
      "send emails",
      "send texts",
      "promotional",
    ],
    answer: `Campaigns let you send bulk messages to your contacts. Here's how:

**Creating a Campaign:**
1. Go to Campaigns and click "New Campaign"
2. Choose your type: Email, SMS, or Both
3. Name your campaign (e.g., "Spring AC Tune-Up Special")
4. Select your audience:
   - All contacts
   - Specific tags (e.g., "HVAC customers")
   - Custom filter (by city, last service date, etc.)

**Writing Your Message:**
- Use the visual editor for emails (drag-and-drop blocks)
- For SMS, keep it under 160 characters for best delivery
- Use merge fields: {{first_name}}, {{business_name}}, {{last_service}}
- Always include an unsubscribe link for emails (added automatically)

**Scheduling:**
- Send immediately or schedule for later
- Best times: Tuesday-Thursday, 10am-2pm for highest open rates
- Avoid weekends and holidays

**Tracking Results:**
- View open rates, click rates, and replies
- See which contacts engaged
- Contacts who reply automatically appear in your Inbox

**Pro Tips:**
- Segment your audience for better results
- A/B test subject lines
- Follow up with engaged contacts via the Pipeline`,
  },

  /* ====================================================================== */
  /*  Drip Sequences                                                         */
  /* ====================================================================== */
  {
    topic: "Drip Sequences",
    keywords: [
      "drip",
      "sequence",
      "sequences",
      "automated",
      "follow up",
      "follow-up",
      "nurture",
      "autoresponder",
      "drip campaign",
      "auto follow up",
      "automated messages",
      "cadence",
    ],
    answer: `Drip Sequences automatically send a series of messages over time. Perfect for follow-ups!

**Creating a Sequence:**
1. Go to Sequences and click "New Sequence"
2. Name it (e.g., "New Lead Follow-Up")
3. Add steps with delays between them:

**Example: New Lead 5-Touch Sequence**
- Day 0: SMS - "Thanks for calling! I'm {{business_name}}. How can I help?"
- Day 1: Email - Introduce your services + special offer
- Day 3: SMS - "Just checking in - still need help with {{service}}?"
- Day 7: Email - Customer testimonial + booking link
- Day 14: SMS - "Last chance for our new customer discount!"

**Key Features:**
- Mix SMS and email in the same sequence
- Set delays in minutes, hours, or days
- Auto-stop when the contact replies
- Skip weekends/holidays option
- Merge fields personalize every message

**Enrolling Contacts:**
- Manually add contacts to a sequence
- Auto-enroll from pipeline stage changes
- Auto-enroll from form submissions
- Auto-enroll after missed calls

**Monitoring:**
- See active enrollments and completion rates
- View which step each contact is on
- Pause or remove contacts at any time`,
  },

  /* ====================================================================== */
  /*  Booking / Scheduling                                                   */
  /* ====================================================================== */
  {
    topic: "Booking & Scheduling",
    keywords: [
      "booking",
      "schedule",
      "scheduling",
      "calendar",
      "appointment",
      "availability",
      "booking page",
      "book online",
      "booking link",
      "time slots",
      "appointments",
    ],
    answer: `Set up your online booking page so customers can schedule themselves:

**Setting Up Your Booking Page:**
1. Go to Scheduling
2. Click "Configure Booking Page"
3. Set your availability:
   - Which days you work
   - Start and end times
   - Lunch breaks or blocked time
   - Buffer time between appointments (15-60 min)

**Adding Services:**
- Create service types (e.g., "AC Tune-Up", "Drain Cleaning")
- Set duration for each (30 min, 1 hour, 2 hours, etc.)
- Set price ranges (optional - shown to customer)
- Choose which services can be booked online vs. quote-only

**Sharing Your Booking Link:**
- Your booking page URL: mybizos.com/book/{{your-slug}}
- Share via text, email, social media, or your website
- Embed on your website with our widget code
- QR code generator included

**When Someone Books:**
- You get an instant notification (SMS + email)
- The appointment appears in your calendar
- Customer gets a confirmation text + email
- Automatic reminder sent 24 hours before
- Automatic reminder sent 1 hour before

**Managing Appointments:**
- View all appointments in the Scheduling section
- Reschedule or cancel with one click
- Customer is automatically notified of changes`,
  },

  /* ====================================================================== */
  /*  Invoicing                                                              */
  /* ====================================================================== */
  {
    topic: "Invoices",
    keywords: [
      "invoice",
      "invoices",
      "billing",
      "payment",
      "charge",
      "collect payment",
      "send invoice",
      "paid",
      "unpaid",
      "stripe",
      "credit card",
      "estimates",
      "quote",
    ],
    answer: `Create and send professional invoices directly from MyBizOS:

**Creating an Invoice:**
1. Go to Invoices and click "New Invoice"
2. Select the customer (or create a new one)
3. Add line items:
   - Service name
   - Description
   - Quantity and rate
   - Tax (auto-calculated based on your settings)
4. Add notes or terms
5. Click "Send" to email it to the customer

**Payment Collection:**
- Customers pay online via credit card (powered by Stripe)
- Payment link included in every invoice email
- Supports partial payments
- Automatic payment receipts

**Setting Up Stripe:**
1. Go to Settings > Payments
2. Click "Connect Stripe"
3. Complete the Stripe onboarding (takes ~5 minutes)
4. Funds deposit to your bank account in 2 business days

**Invoice Management:**
- Track status: Draft, Sent, Viewed, Paid, Overdue
- Automatic reminders for overdue invoices (3, 7, 14 days)
- Duplicate invoices for recurring work
- Export to CSV for your accountant

**Estimates/Quotes:**
- Create estimates that convert to invoices with one click
- Customer can approve estimates online
- Track estimate status: Sent, Viewed, Approved, Declined`,
  },

  /* ====================================================================== */
  /*  Pipeline                                                               */
  /* ====================================================================== */
  {
    topic: "Pipeline Management",
    keywords: [
      "pipeline",
      "deal",
      "deals",
      "stages",
      "kanban",
      "lead",
      "leads",
      "opportunity",
      "won",
      "lost",
      "close",
      "drag",
      "move",
      "sales",
      "crm",
      "funnel",
    ],
    answer: `The Pipeline is your visual sales board. Drag deals through stages to track every job:

**Default Pipeline Stages:**
1. **New Lead** - Just came in (from call, form, or manual entry)
2. **Contacted** - You've reached out to them
3. **Quoted** - You've sent an estimate/quote
4. **Won** - Job is booked and confirmed
5. **Lost** - Didn't close (track the reason why)

**Working with Deals:**
- Click "Add Deal" or deals are auto-created from AI phone calls
- Drag and drop between stages
- Click a deal to see full details: contact info, notes, call history, value
- Add a dollar value to track your pipeline revenue

**Customizing Your Pipeline:**
- Rename stages to match your workflow
- Add new stages (e.g., "Scheduled", "In Progress", "Complete")
- Set stage colors for visual clarity
- Create multiple pipelines for different service lines

**Pipeline Automation:**
- Auto-move deals when appointments are booked
- Auto-move to "Won" when invoice is paid
- Trigger drip sequences on stage changes
- Send notifications when deals sit too long in one stage

**Pipeline Analytics:**
- Total pipeline value
- Conversion rates between stages
- Average time in each stage
- Win/loss ratio and reasons`,
  },

  /* ====================================================================== */
  /*  Inbox                                                                  */
  /* ====================================================================== */
  {
    topic: "Unified Inbox",
    keywords: [
      "inbox",
      "messages",
      "text",
      "sms",
      "email",
      "reply",
      "conversation",
      "unified inbox",
      "all messages",
      "respond",
      "communication",
      "chat",
      "messaging",
    ],
    answer: `The Inbox is your unified communications hub. Every message in one place:

**What Shows Up in Your Inbox:**
- SMS/text messages from customers
- Emails from customers
- AI phone call summaries and transcripts
- Chat widget messages from your website
- Social media messages (coming soon)

**Using the Inbox:**
1. Go to Inbox
2. See all conversations sorted by most recent
3. Click a conversation to view the full thread
4. Reply via SMS, email, or both from the same screen
5. Use templates for common responses (e.g., "Thanks for reaching out!")

**Key Features:**
- **Unified thread**: See SMS + email + calls all in one timeline per contact
- **Quick replies**: Save and reuse common responses
- **Internal notes**: Add notes visible only to your team
- **Assign conversations**: Route to specific team members
- **Mark as read/unread**: Keep track of what needs attention
- **Snooze**: Hide a conversation and have it reappear later

**Tips:**
- Star important conversations for quick access
- Filter by channel (SMS, email, calls) or status (unread, starred)
- Use keyboard shortcuts: R to reply, E to archive, S to star`,
  },

  /* ====================================================================== */
  /*  Reviews                                                                */
  /* ====================================================================== */
  {
    topic: "Review Campaigns",
    keywords: [
      "review",
      "reviews",
      "google review",
      "reputation",
      "rating",
      "stars",
      "testimonial",
      "review request",
      "ask for review",
      "feedback",
      "yelp",
    ],
    answer: `Build your online reputation with automated review requests:

**Setting Up Review Campaigns:**
1. Go to Reviews
2. Click "New Review Campaign"
3. Connect your Google Business Profile (one-time setup)
4. Customize your review request message

**How It Works:**
1. After completing a job, send a review request (manual or automatic)
2. Customer gets a text: "Thanks for choosing us! Would you mind leaving a quick review?"
3. Happy customers (4-5 stars) are directed to Google to leave a public review
4. Unhappy customers (1-3 stars) are directed to a private feedback form
5. You get alerted about negative feedback so you can address it

**Automation Options:**
- Auto-send review request when deal moves to "Won"
- Auto-send 2 hours after appointment ends
- Auto-send when invoice is paid
- Follow up if no response after 3 days

**Review Dashboard:**
- See your average rating over time
- Track review volume by month
- View and respond to reviews from one place
- Get alerts for new reviews (especially negative ones)

**Pro Tips:**
- Ask within 2 hours of completing the job (highest response rate)
- Personalize the message with the customer's name and service
- Respond to every review, positive or negative`,
  },

  /* ====================================================================== */
  /*  Analytics                                                              */
  /* ====================================================================== */
  {
    topic: "Analytics & Dashboard",
    keywords: [
      "analytics",
      "dashboard",
      "reports",
      "stats",
      "metrics",
      "performance",
      "data",
      "numbers",
      "conversion",
      "roi",
      "revenue",
      "how am i doing",
      "overview",
      "insights",
    ],
    answer: `Your Dashboard and Analytics show you exactly how your business is performing:

**Dashboard Overview (Home Page):**
- Total leads this month vs. last month
- Revenue (from paid invoices)
- Upcoming appointments today/this week
- Calls answered by AI vs. missed
- Pipeline value summary
- Recent activity feed

**Analytics Deep Dive:**
Go to Analytics for detailed breakdowns:

**Call Analytics:**
- Total calls, answered, missed, voicemail
- Average call duration
- Peak calling hours (so you know when to staff up)
- AI resolution rate (calls handled without human)
- Cost per call

**Lead Analytics:**
- Lead sources: where are leads coming from?
- Conversion rates by source
- Time-to-close by service type
- Best-performing campaigns

**Revenue Analytics:**
- Revenue by month/quarter/year
- Revenue by service type
- Average job value
- Outstanding invoices

**Customer Analytics:**
- Repeat customer rate
- Customer lifetime value
- Satisfaction scores
- Review ratings over time

**Tips for Reading Analytics:**
- Compare week-over-week, not day-over-day (too noisy)
- Focus on conversion rate, not just lead volume
- Track cost-per-lead across channels to optimize spend`,
  },

  /* ====================================================================== */
  /*  Team Management                                                        */
  /* ====================================================================== */
  {
    topic: "Team Management",
    keywords: [
      "team",
      "members",
      "user",
      "users",
      "invite",
      "roles",
      "permissions",
      "add team",
      "employee",
      "staff",
      "technician",
      "dispatcher",
      "admin",
      "access",
    ],
    answer: `Manage your team and control who has access to what:

**Adding Team Members:**
1. Go to Team
2. Click "Invite Member"
3. Enter their email address
4. Select their role:
   - **Owner**: Full access to everything (that's you)
   - **Admin**: Full access except billing and account deletion
   - **Manager**: Can manage contacts, pipeline, inbox, and team
   - **Technician**: Can view assigned jobs, update status, add notes
   - **Viewer**: Read-only access to dashboard and reports

**Managing Permissions:**
- Each role has preset permissions
- Custom permissions available for fine-tuning
- Restrict access to sensitive data (revenue, costs)
- Control who can send campaigns or make calls

**Team Features:**
- Assign leads and jobs to specific team members
- Round-robin lead distribution
- Team performance dashboard
- Individual call and booking stats
- Internal notes and @mentions in conversations

**Notifications per Member:**
- Each team member controls their own notification preferences
- Assign specific phone lines to specific team members
- After-hours routing rules per team member`,
  },

  /* ====================================================================== */
  /*  Automations                                                            */
  /* ====================================================================== */
  {
    topic: "Automations",
    keywords: [
      "automation",
      "automations",
      "workflow",
      "trigger",
      "action",
      "automate",
      "automatic",
      "auto",
      "when then",
      "if then",
      "rule",
      "rules",
      "zap",
    ],
    answer: `Automations save you hours by handling repetitive tasks automatically:

**How Automations Work:**
Every automation has a TRIGGER (when something happens) and an ACTION (do something).

**Common Triggers:**
- New lead comes in (call, form, manual)
- Deal moves to a pipeline stage
- Appointment is booked/completed/cancelled
- Invoice is sent/paid/overdue
- Contact is tagged
- Form is submitted

**Common Actions:**
- Send an SMS or email
- Add to a drip sequence
- Move deal to a pipeline stage
- Assign to a team member
- Create a task
- Add a tag to the contact
- Send a notification
- Wait (delay before next action)

**Example Automations:**
1. **New Lead Follow-Up**: When a new lead comes in > Wait 5 min > Send welcome SMS > Add to "New Lead Sequence"
2. **Job Complete**: When deal moves to "Won" > Send invoice > Send review request (2hr delay)
3. **Missed Call**: When a call is missed > Send SMS "Sorry we missed your call! How can we help?"
4. **Overdue Invoice**: When invoice is overdue 7 days > Send reminder email > Notify owner

**Setting Up:**
1. Go to Automations
2. Click "New Automation"
3. Select your trigger
4. Add one or more actions
5. Test it, then activate`,
  },

  /* ====================================================================== */
  /*  Contacts                                                               */
  /* ====================================================================== */
  {
    topic: "Contact Management",
    keywords: [
      "contact",
      "contacts",
      "customer",
      "customers",
      "import",
      "export",
      "csv",
      "add contact",
      "contact list",
      "database",
      "crm",
      "people",
      "client",
      "clients",
      "tags",
      "segment",
    ],
    answer: `Your contact database is the foundation of MyBizOS:

**Adding Contacts:**
- **Manual**: Click "Add Contact" and fill in the details
- **CSV Import**: Click "Import" to upload a spreadsheet
- **Automatic**: Contacts are auto-created from AI phone calls, form submissions, and chat widget conversations

**Contact Profile Includes:**
- Name, phone, email, address
- Tags (e.g., "HVAC", "VIP", "Residential")
- Pipeline deals and job history
- Full communication timeline (calls, texts, emails)
- Notes from your team
- Invoices and payments
- Booking history

**Organizing Contacts:**
- **Tags**: Label contacts for easy filtering (e.g., "Spring Campaign", "Referral")
- **Smart Filters**: Filter by tag, city, last contacted, deal stage, etc.
- **Segments**: Save filter combinations for reuse

**Importing from CSV:**
1. Go to Contacts > Import
2. Upload your CSV file
3. Map your columns to MyBizOS fields (name, phone, email, etc.)
4. Review and confirm
5. Contacts are created with a "Imported" tag

**Exporting:**
- Select contacts and click "Export"
- Choose CSV or Excel format
- Useful for backups or moving to another system`,
  },

  /* ====================================================================== */
  /*  Settings                                                               */
  /* ====================================================================== */
  {
    topic: "Account Settings",
    keywords: [
      "settings",
      "account",
      "profile",
      "business profile",
      "configure",
      "preferences",
      "timezone",
      "branding",
      "logo",
      "business info",
      "company",
    ],
    answer: `Manage all your account settings in one place:

**Settings Sections:**

**Business Profile (Settings > Business Profile)**
- Business name, address, phone
- Service area (cities or zip codes)
- Business hours
- Logo and brand colors
- Website URL

**Phone Settings (Settings > Phone)**
- Connect/manage your phone number
- Caller ID configuration
- Voicemail settings
- Call recording preferences

**AI Agent Settings (Settings > AI Agent)**
- Agent personality and greeting
- Services and pricing ranges
- Emergency keywords
- Escalation rules

**Notification Settings (Settings > Notifications)**
- Email notifications (on/off for each type)
- SMS notifications
- Push notifications (coming soon)
- Daily/weekly summary emails

**Billing (Settings > Billing)**
- Current plan and usage
- Payment method
- Invoice history
- Upgrade/downgrade plan

**Integrations (Settings > Integrations)**
- Twilio, Stripe, Google Calendar, QuickBooks
- API keys for custom integrations
- Webhook configuration`,
  },

  /* ====================================================================== */
  /*  Pricing                                                                */
  /* ====================================================================== */
  {
    topic: "Pricing & Plans",
    keywords: [
      "pricing",
      "price",
      "cost",
      "plan",
      "plans",
      "subscription",
      "how much",
      "billing",
      "upgrade",
      "downgrade",
      "free trial",
      "trial",
      "money",
      "pay",
      "charge",
      "fee",
      "expensive",
      "affordable",
    ],
    answer: `MyBizOS is built to replace your entire tech stack at a fraction of the cost:

**Starter Plan - $97/month**
- 1 user
- 500 contacts
- AI phone agent (100 minutes/month)
- Unlimited SMS & email
- Pipeline & CRM
- Booking page
- Basic analytics

**Growth Plan - $197/month** (Most Popular)
- 5 users
- 2,500 contacts
- AI phone agent (500 minutes/month)
- Campaigns & sequences
- Automations
- Review management
- Advanced analytics
- Priority support

**Scale Plan - $397/month**
- Unlimited users
- Unlimited contacts
- AI phone agent (2,000 minutes/month)
- Everything in Growth
- Custom integrations
- API access
- Dedicated account manager
- White-label options

**What's Included in All Plans:**
- Unified inbox (SMS, email, calls)
- Online booking page
- Invoice & payments (Stripe)
- Mobile app access
- Free onboarding setup call

**AI Phone Agent Add-On Minutes:**
Additional minutes available at $0.15/minute beyond your plan limit.

**No contracts.** Cancel anytime. 14-day free trial on all plans.

Manage your plan at Settings > Billing.`,
  },

  /* ====================================================================== */
  /*  Troubleshooting                                                        */
  /* ====================================================================== */
  {
    topic: "Troubleshooting Common Issues",
    keywords: [
      "help",
      "issue",
      "problem",
      "trouble",
      "fix",
      "broken",
      "not working",
      "error",
      "bug",
      "crash",
      "slow",
      "can't",
      "cannot",
      "won't",
      "doesn't",
      "failed",
      "stuck",
      "loading",
      "blank",
      "wrong",
      "troubleshoot",
    ],
    answer: `Let's figure out what's going on. Here are solutions to common issues:

**Calls Not Coming Through:**
1. Check Settings > Phone to make sure your number is connected
2. Verify the phone number status shows "Active"
3. Try calling your number from a different phone
4. Check if your Twilio account has sufficient balance (Model A)

**AI Agent Not Responding Correctly:**
1. Go to Settings > AI Agent and review your configuration
2. Make sure services and pricing are filled in
3. Check recent call transcripts in Calls for specific issues
4. The AI resets after 2 misunderstandings and offers human transfer

**Messages Not Sending:**
1. Check if the contact has a valid phone/email
2. Verify you haven't exceeded your plan's SMS limit
3. Check Settings > Phone for messaging status
4. Make sure the contact hasn't opted out

**Page Loading Slowly:**
1. Try refreshing the page (Ctrl+R / Cmd+R)
2. Clear your browser cache
3. Try a different browser (Chrome recommended)
4. Check your internet connection

**Invoice Issues:**
1. Make sure Stripe is connected in Settings > Payments
2. Verify customer email is correct
3. Check if the invoice was sent (look for "Sent" status)

**Still stuck?** Describe your issue and I'll log it for the MyBizOS team. Or email support@mybizos.com.`,
  },

  /* ====================================================================== */
  /*  Forms                                                                  */
  /* ====================================================================== */
  {
    topic: "Forms & Lead Capture",
    keywords: [
      "form",
      "forms",
      "lead capture",
      "web form",
      "embed",
      "landing page",
      "submission",
      "form builder",
      "contact form",
    ],
    answer: `Capture leads with custom forms on your website:

**Creating a Form:**
1. Go to Forms
2. Click "New Form"
3. Drag and drop fields:
   - Name, phone, email (required)
   - Service needed (dropdown)
   - Message/description (text area)
   - Address
   - Preferred date/time
4. Customize the submit button text
5. Set a thank-you message or redirect URL

**Embedding on Your Website:**
- Copy the embed code (HTML snippet)
- Paste it into your website where you want the form
- Or use the standalone form URL to link directly

**When Someone Submits:**
- A new contact is created automatically
- A new deal is added to your pipeline (New Lead stage)
- You get a notification (SMS + email)
- The lead can be auto-enrolled in a drip sequence

**Form Analytics:**
- Total submissions
- Conversion rate (views to submissions)
- Top-performing forms
- Submission source tracking`,
  },

  /* ====================================================================== */
  /*  Social Media                                                           */
  /* ====================================================================== */
  {
    topic: "Social Media",
    keywords: [
      "social",
      "social media",
      "facebook",
      "instagram",
      "google business",
      "gmb",
      "post",
      "posting",
      "social post",
    ],
    answer: `Manage your social media presence from MyBizOS:

**Social Features:**
1. Go to Social
2. Connect your accounts:
   - Google Business Profile
   - Facebook Page
   - Instagram Business (coming soon)

**What You Can Do:**
- Schedule and publish posts across platforms
- View and respond to comments
- Track engagement metrics
- Get notified of new reviews and comments

**Google Business Profile:**
- Post updates, offers, and events
- Respond to reviews
- Update business hours and info
- View insights (searches, views, calls)

**Pro Tips:**
- Post at least 2-3 times per week for best visibility
- Share before/after photos of your work
- Respond to every review within 24 hours
- Use seasonal content (AC in summer, heating in winter)`,
  },

  /* ====================================================================== */
  /*  Notifications                                                          */
  /* ====================================================================== */
  {
    topic: "Notifications",
    keywords: [
      "notification",
      "notifications",
      "alert",
      "alerts",
      "notify",
      "reminder",
      "reminders",
    ],
    answer: `Stay on top of everything with MyBizOS notifications:

**Notification Center:**
- Click the bell icon in the top navigation bar
- See all recent notifications in one feed
- Mark as read or dismiss
- Click to jump directly to the relevant item

**Types of Notifications:**
- New leads and calls
- Appointment bookings and reminders
- Invoice payments
- New messages in your inbox
- Review alerts
- Team mentions (@you)
- System alerts and updates

**Configuring Notifications:**
1. Go to Settings > Notifications
2. Toggle on/off for each notification type
3. Choose delivery method: in-app, email, SMS, or all three
4. Set quiet hours (no notifications during off hours)

**Daily Summary:**
- Opt in to receive a daily email summary
- Includes: new leads, calls answered, revenue, upcoming appointments
- Sent at your preferred time (default: 8am)`,
  },

  /* ====================================================================== */
  /*  Keyboard Shortcuts                                                     */
  /* ====================================================================== */
  {
    topic: "Keyboard Shortcuts",
    keywords: [
      "keyboard",
      "shortcuts",
      "hotkey",
      "hotkeys",
      "shortcut",
      "quick",
      "command palette",
      "ctrl k",
      "cmd k",
    ],
    answer: `Speed up your workflow with keyboard shortcuts:

**Global:**
- **Ctrl/Cmd + K** : Open Command Palette (search anything)
- **Ctrl/Cmd + /** : Open this AI Assistant

**Navigation:**
- **G then D** : Go to Dashboard
- **G then C** : Go to Contacts
- **G then P** : Go to Pipeline
- **G then I** : Go to Inbox
- **G then S** : Go to Settings

**Inbox:**
- **R** : Reply to conversation
- **E** : Archive conversation
- **S** : Star/unstar conversation
- **J/K** : Navigate between conversations

**Pipeline:**
- **N** : New deal
- **Enter** : Open selected deal

**Command Palette (Ctrl/Cmd + K):**
Type to search for anything:
- Contacts by name or phone
- Navigate to any page
- Create new items (contact, deal, invoice)
- Run common actions`,
  },

  /* ====================================================================== */
  /*  Mobile App                                                             */
  /* ====================================================================== */
  {
    topic: "Mobile Access",
    keywords: [
      "mobile",
      "app",
      "phone app",
      "ios",
      "android",
      "mobile app",
      "on the go",
    ],
    answer: `Access MyBizOS from anywhere:

**Mobile Web App:**
- Visit app.mybizos.com on your phone's browser
- Tap "Add to Home Screen" for an app-like experience
- Full access to inbox, pipeline, contacts, and more

**Mobile Features:**
- View and respond to messages
- Accept or decline appointments
- Update pipeline deals
- Make and receive calls through the app
- View today's schedule
- Quick-add contacts

**Push Notifications (Mobile):**
- New lead alerts
- Incoming call notifications
- Appointment reminders
- Payment received alerts

**Native App:**
- iOS and Android apps coming soon!
- Sign up for early access in Settings > Mobile`,
  },
];

/* -------------------------------------------------------------------------- */
/*  Contextual Page Greetings                                                 */
/* -------------------------------------------------------------------------- */

export interface PageContext {
  pathPattern: string;
  greeting: string;
  suggestions: string[];
}

export const PAGE_CONTEXTS: PageContext[] = [
  {
    pathPattern: "/dashboard/settings/phone",
    greeting:
      "I see you're setting up your phone system! Need help connecting Twilio or choosing between Model A and Model B?",
    suggestions: [
      "How does Model A vs Model B work?",
      "Help me connect Twilio",
      "How does the AI answer calls?",
      "What does it cost per minute?",
    ],
  },
  {
    pathPattern: "/dashboard/settings/ai",
    greeting:
      "Configuring your AI agent? I can walk you through setting up the perfect greeting, pricing rules, and escalation behavior.",
    suggestions: [
      "How do I set up my AI greeting?",
      "How does emergency detection work?",
      "What pricing should I set?",
      "How does escalation work?",
    ],
  },
  {
    pathPattern: "/dashboard/settings",
    greeting:
      "You're in Settings. I can help you configure your business profile, phone, AI agent, billing, or integrations.",
    suggestions: [
      "How do I update my business info?",
      "Set up my phone system",
      "Configure my AI agent",
      "Connect Stripe for payments",
    ],
  },
  {
    pathPattern: "/dashboard/campaigns",
    greeting:
      "Ready to launch a campaign? I can help you create an email blast, SMS campaign, or both!",
    suggestions: [
      "How do I create a campaign?",
      "What's the best time to send?",
      "How do merge fields work?",
      "Show me campaign best practices",
    ],
  },
  {
    pathPattern: "/dashboard/sequences",
    greeting:
      "Drip sequences are a powerful way to follow up automatically. Want me to walk you through creating one?",
    suggestions: [
      "How do sequences work?",
      "Create a new lead follow-up",
      "How to auto-enroll contacts",
      "Best sequence templates",
    ],
  },
  {
    pathPattern: "/dashboard/pipeline",
    greeting:
      "This is your Pipeline - your visual sales board. Drag deals between stages to track every lead from first call to closed job.",
    suggestions: [
      "How do I customize stages?",
      "How to add a new deal",
      "How does automation work here?",
      "How to track conversion rates",
    ],
  },
  {
    pathPattern: "/dashboard/contacts",
    greeting:
      "Your contact database! You can add contacts manually, import from CSV, or they're auto-created from phone calls and forms.",
    suggestions: [
      "How to import contacts from CSV",
      "How do tags work?",
      "How to segment my contacts",
      "How to export contacts",
    ],
  },
  {
    pathPattern: "/dashboard/inbox",
    greeting:
      "Welcome to your Unified Inbox. Every SMS, email, and call transcript in one place. Select a conversation to respond.",
    suggestions: [
      "How do I reply to messages?",
      "How to use quick replies",
      "How to assign conversations",
      "What are internal notes?",
    ],
  },
  {
    pathPattern: "/dashboard/scheduling",
    greeting:
      "Set up your booking page and manage appointments here. Customers can self-book online 24/7!",
    suggestions: [
      "How to set my availability",
      "How to share my booking link",
      "How to add services",
      "How do reminders work?",
    ],
  },
  {
    pathPattern: "/dashboard/invoices",
    greeting:
      "Create and manage invoices here. Connect Stripe to accept online payments from your customers.",
    suggestions: [
      "How to create an invoice",
      "How to connect Stripe",
      "How do payment reminders work?",
      "How to create an estimate",
    ],
  },
  {
    pathPattern: "/dashboard/reviews",
    greeting:
      "Build your online reputation! Set up automated review requests to get more 5-star Google reviews.",
    suggestions: [
      "How to set up review requests",
      "How does the rating filter work?",
      "Best time to ask for reviews",
      "How to respond to negative reviews",
    ],
  },
  {
    pathPattern: "/dashboard/analytics",
    greeting:
      "Here's your analytics dashboard. Dive into call stats, lead sources, revenue trends, and conversion rates.",
    suggestions: [
      "What metrics should I focus on?",
      "How to read call analytics",
      "How to track ROI",
      "What's a good conversion rate?",
    ],
  },
  {
    pathPattern: "/dashboard/team",
    greeting:
      "Manage your team members and permissions here. Invite techs, dispatchers, and managers with the right access levels.",
    suggestions: [
      "How to invite a team member",
      "What roles are available?",
      "How to assign leads to team members",
      "How does round-robin work?",
    ],
  },
  {
    pathPattern: "/dashboard/automations",
    greeting:
      "Automations eliminate busywork. Set up triggers and actions to handle follow-ups, assignments, and more on autopilot.",
    suggestions: [
      "Show me popular automations",
      "How to create an automation",
      "How to auto-follow-up on missed calls",
      "How to auto-send review requests",
    ],
  },
  {
    pathPattern: "/dashboard/calls",
    greeting:
      "View all your call history here. Every AI-answered call includes a full transcript and summary.",
    suggestions: [
      "How to listen to a call recording",
      "How does the AI handle calls?",
      "How to see call transcripts",
      "What happens on missed calls?",
    ],
  },
  {
    pathPattern: "/dashboard/forms",
    greeting:
      "Build lead capture forms and embed them on your website. Every submission creates a new contact and deal.",
    suggestions: [
      "How to create a form",
      "How to embed on my website",
      "What fields should I include?",
      "How to track form conversions",
    ],
  },
  {
    pathPattern: "/dashboard",
    greeting:
      "Welcome to your MyBizOS Dashboard! This is your command center. How can I help you today?",
    suggestions: [
      "How do I get started?",
      "Set up my phone system",
      "Create my first campaign",
      "Help me understand analytics",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Search / Match Logic                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Finds the best matching knowledge entry for a user query.
 * Scores each entry by counting keyword hits, weighted by match quality.
 */
export function findBestAnswer(query: string): KnowledgeEntry | null {
  const lower = query.toLowerCase().trim();
  if (!lower) return null;

  let bestEntry: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of PLATFORM_KNOWLEDGE) {
    let score = 0;

    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        // Exact substring match
        score += keyword.split(" ").length * 2; // Multi-word keywords score higher
      } else if (keyword.includes(" ")) {
        // Check if individual words from multi-word keyword appear
        const words = keyword.split(" ");
        const matchedWords = words.filter((w) => lower.includes(w));
        if (matchedWords.length > 0) {
          score += matchedWords.length * 0.5;
        }
      }
    }

    // Boost if topic name is mentioned
    if (lower.includes(entry.topic.toLowerCase())) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Require a minimum score to avoid false matches
  return bestScore >= 1 ? bestEntry : null;
}

/**
 * Returns the contextual page data for the current path.
 * Matches from most specific to least specific.
 */
export function getPageContext(pathname: string): PageContext | null {
  // Sort by path length descending so more specific paths match first
  const sorted = [...PAGE_CONTEXTS].sort(
    (a, b) => b.pathPattern.length - a.pathPattern.length,
  );

  for (const ctx of sorted) {
    if (pathname.startsWith(ctx.pathPattern)) {
      return ctx;
    }
  }

  return null;
}

/**
 * Checks if the user message indicates a bug or issue report.
 */
export function isIssueReport(message: string): boolean {
  const issueKeywords = [
    "bug",
    "broken",
    "not working",
    "error",
    "crash",
    "crashed",
    "down",
    "issue",
    "problem",
    "glitch",
    "wrong",
    "fail",
    "failed",
    "stuck",
    "freeze",
    "frozen",
    "blank",
    "won't load",
    "doesn't work",
    "can't access",
    "unable to",
    "something is wrong",
    "doesn't load",
  ];

  const lower = message.toLowerCase();
  return issueKeywords.some((kw) => lower.includes(kw));
}
