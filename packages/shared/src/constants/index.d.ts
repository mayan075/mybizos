import type { ActivityType, AiAgentType, AppointmentStatus, CallOutcome, ChannelType, ConversationStatus, DayOfWeek, DealStage, ContactSource, MessageDirection, MessageSenderType, MessageStatus, OrgMemberRole, Vertical } from "../types/index.js";
/** Supported business verticals */
export declare const VERTICALS: readonly Vertical[];
/** Vertical display labels */
export declare const VERTICAL_LABELS: Record<Vertical, string>;
/** Default pipeline deal stages in order */
export declare const DEAL_STAGES: readonly DealStage[];
/** Deal stage display labels */
export declare const DEAL_STAGE_LABELS: Record<DealStage, string>;
/** Deal stage colors for UI rendering */
export declare const DEAL_STAGE_COLORS: Record<DealStage, string>;
/** Activity types for the unified timeline */
export declare const ACTIVITY_TYPES: readonly ActivityType[];
/** Activity type display labels */
export declare const ACTIVITY_TYPE_LABELS: Record<ActivityType, string>;
/** Communication channel types */
export declare const CHANNEL_TYPES: readonly ChannelType[];
/** Channel type display labels */
export declare const CHANNEL_TYPE_LABELS: Record<ChannelType, string>;
/** Contact sources */
export declare const CONTACT_SOURCES: readonly ContactSource[];
/** Conversation statuses */
export declare const CONVERSATION_STATUSES: readonly ConversationStatus[];
/** Message directions */
export declare const MESSAGE_DIRECTIONS: readonly MessageDirection[];
/** Message sender types */
export declare const MESSAGE_SENDER_TYPES: readonly MessageSenderType[];
/** Message statuses */
export declare const MESSAGE_STATUSES: readonly MessageStatus[];
/** AI agent types */
export declare const AI_AGENT_TYPES: readonly AiAgentType[];
/** AI call outcomes */
export declare const CALL_OUTCOMES: readonly CallOutcome[];
/** Appointment statuses */
export declare const APPOINTMENT_STATUSES: readonly AppointmentStatus[];
/** Days of the week */
export declare const DAYS_OF_WEEK: readonly DayOfWeek[];
/** Org member roles */
export declare const ORG_MEMBER_ROLES: readonly OrgMemberRole[];
/** AI scoring thresholds */
export declare const AI_SCORE: {
    readonly MIN: 0;
    readonly MAX: 100;
    readonly HOT_LEAD: 80;
    readonly WARM_LEAD: 50;
    readonly COLD_LEAD: 20;
};
/** Emergency keywords that trigger instant owner alert */
export declare const EMERGENCY_KEYWORDS: readonly ["flooding", "flood", "gas leak", "gas smell", "fire", "carbon monoxide", "co detector", "burst pipe", "sewage", "no heat", "no hot water", "electrical fire", "sparking", "smoke"];
/** Max AI misunderstandings before escalation to human */
export declare const AI_MAX_MISUNDERSTANDINGS = 2;
/** AI disclosure message prefix (legally required) */
export declare const AI_DISCLOSURE_PREFIX = "Hi, this is {businessName}'s AI assistant. This call may be recorded.";
/** Default currency */
export declare const DEFAULT_CURRENCY = "USD";
/** Default timezone */
export declare const DEFAULT_TIMEZONE = "America/New_York";
export interface PipelineStageTemplate {
    name: string;
    slug: DealStage;
    color: string;
    position: number;
}
export interface PipelineTemplate {
    name: string;
    stages: PipelineStageTemplate[];
}
/** Vertical-specific pipeline templates. Falls back to default if not found. */
export declare const PIPELINE_TEMPLATES: Partial<Record<Vertical, PipelineTemplate>> & {
    default: PipelineTemplate;
};
export interface DripMessage {
    id: string;
    trigger: string;
    delayMinutes: number;
    channel: "sms" | "email";
    template: string;
}
export interface DripSequenceTemplate {
    name: string;
    messages: DripMessage[];
}
/** Drip sequence templates by vertical. */
export declare const DRIP_SEQUENCE_TEMPLATES: Partial<Record<Vertical, DripSequenceTemplate[]>>;
//# sourceMappingURL=index.d.ts.map