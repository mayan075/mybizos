import { describe, it, expect, vi } from "vitest";

// Mock config to avoid env validation
vi.mock("../config.js", () => ({
  config: {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://test",
    JWT_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    APP_URL: "http://localhost:3001",
  },
}));

// Mock the DB package to avoid actual DB connections
vi.mock("@hararai/db", () => ({
  db: {},
  bookableServices: { orgId: "orgId", id: "id", name: "name", isActive: "isActive" },
  appointments: {
    orgId: "orgId",
    id: "id",
    contactId: "contactId",
    assignedTo: "assignedTo",
    googleEventId: "googleEventId",
    startTime: "startTime",
    endTime: "endTime",
  },
  withOrgScope: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  ilike: vi.fn(),
}));

// Mock dependent services
vi.mock("../services/scheduling-service.js", () => ({
  schedulingService: {
    getAvailabilityForAI: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
  },
}));

vi.mock("../services/waitlist-service.js", () => ({
  waitlistService: {
    create: vi.fn(),
  },
}));

vi.mock("../services/google-calendar-sync-service.js", () => ({
  googleCalendarSyncService: {
    pushAppointmentToGoogle: vi.fn(),
    updateGoogleEvent: vi.fn(),
    deleteGoogleEvent: vi.fn(),
  },
}));

vi.mock("../middleware/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("AI Booking Tools", () => {
  it("should export BOOKING_TOOLS array with 6 tool definitions", async () => {
    const { BOOKING_TOOLS } = await import(
      "../services/ai-booking-tools.js"
    );
    expect(BOOKING_TOOLS).toHaveLength(6);

    const toolNames = BOOKING_TOOLS.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("check_availability");
    expect(toolNames).toContain("propose_booking");
    expect(toolNames).toContain("confirm_booking");
    expect(toolNames).toContain("reschedule_appointment");
    expect(toolNames).toContain("cancel_appointment");
    expect(toolNames).toContain("add_to_waitlist");
  });

  it("should export executeBookingTool function", async () => {
    const { executeBookingTool } = await import(
      "../services/ai-booking-tools.js"
    );
    expect(executeBookingTool).toBeTypeOf("function");
  });

  it("each tool should have name, description, and input_schema", async () => {
    const { BOOKING_TOOLS } = await import(
      "../services/ai-booking-tools.js"
    );
    for (const tool of BOOKING_TOOLS) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("input_schema");
      expect(tool.input_schema).toHaveProperty("type", "object");
      expect(tool.input_schema).toHaveProperty("properties");
    }
  });
});
