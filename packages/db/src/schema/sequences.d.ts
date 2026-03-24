export declare const sequenceTriggerTypeEnum: import("drizzle-orm/pg-core").PgEnum<["manual", "tag_added", "deal_stage_changed", "form_submitted", "appointment_completed", "contact_created"]>;
export declare const sequenceStepTypeEnum: import("drizzle-orm/pg-core").PgEnum<["send_email", "send_sms", "wait", "add_tag", "remove_tag", "ai_decision"]>;
export declare const enrollmentStatusEnum: import("drizzle-orm/pg-core").PgEnum<["active", "completed", "cancelled", "paused"]>;
export interface SendEmailStepConfig {
    subject: string;
    body_html: string;
}
export interface SendSmsStepConfig {
    body: string;
}
export interface WaitStepConfig {
    delay_hours: number;
}
export interface AddTagStepConfig {
    tag: string;
}
export interface RemoveTagStepConfig {
    tag: string;
}
export interface AiDecisionStepConfig {
    prompt: string;
    yes_step: number;
    no_step: number;
}
export type SequenceStepConfig = SendEmailStepConfig | SendSmsStepConfig | WaitStepConfig | AddTagStepConfig | RemoveTagStepConfig | AiDecisionStepConfig;
export interface SequenceStep {
    type: "send_email" | "send_sms" | "wait" | "add_tag" | "remove_tag" | "ai_decision";
    config: SequenceStepConfig;
}
export interface SequenceTriggerConfig {
    tag?: string;
    stage?: string;
    form_id?: string;
}
export declare const dripSequences: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "drip_sequences";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "drip_sequences";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        orgId: import("drizzle-orm/pg-core").PgColumn<{
            name: "org_id";
            tableName: "drip_sequences";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "drip_sequences";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "drip_sequences";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        triggerType: import("drizzle-orm/pg-core").PgColumn<{
            name: "trigger_type";
            tableName: "drip_sequences";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "manual" | "contact_created" | "appointment_completed" | "tag_added" | "deal_stage_changed" | "form_submitted";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["manual", "tag_added", "deal_stage_changed", "form_submitted", "appointment_completed", "contact_created"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        triggerConfig: import("drizzle-orm/pg-core").PgColumn<{
            name: "trigger_config";
            tableName: "drip_sequences";
            dataType: "json";
            columnType: "PgJsonb";
            data: SequenceTriggerConfig;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: SequenceTriggerConfig;
        }>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "drip_sequences";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        enrollmentCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "enrollment_count";
            tableName: "drip_sequences";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        steps: import("drizzle-orm/pg-core").PgColumn<{
            name: "steps";
            tableName: "drip_sequences";
            dataType: "json";
            columnType: "PgJsonb";
            data: SequenceStep[];
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: SequenceStep[];
        }>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "drip_sequences";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "drip_sequences";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const sequenceEnrollments: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "sequence_enrollments";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "sequence_enrollments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sequenceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sequence_id";
            tableName: "sequence_enrollments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        contactId: import("drizzle-orm/pg-core").PgColumn<{
            name: "contact_id";
            tableName: "sequence_enrollments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        orgId: import("drizzle-orm/pg-core").PgColumn<{
            name: "org_id";
            tableName: "sequence_enrollments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        currentStep: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_step";
            tableName: "sequence_enrollments";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "sequence_enrollments";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "active" | "completed" | "cancelled" | "paused";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["active", "completed", "cancelled", "paused"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        enrolledAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "enrolled_at";
            tableName: "sequence_enrollments";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        nextStepAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "next_step_at";
            tableName: "sequence_enrollments";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        completedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "completed_at";
            tableName: "sequence_enrollments";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
//# sourceMappingURL=sequences.d.ts.map