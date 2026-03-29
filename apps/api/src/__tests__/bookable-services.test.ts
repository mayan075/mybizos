import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config to avoid env validation
vi.mock("../config.js", () => ({
  config: {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://test",
    JWT_SECRET: "test-secret",
  },
}));

// Mock the DB package to avoid actual DB connections
vi.mock("@hararai/db", () => ({
  db: {},
  bookableServices: { orgId: "orgId", id: "id", name: "name" },
  serviceTeamMembers: { orgId: "orgId", serviceId: "serviceId", userId: "userId" },
  users: { id: "id", name: "name", email: "email" },
  withOrgScope: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

describe("bookableServiceService", () => {
  it("should export list, create, update, delete, addTeamMember, removeTeamMember", async () => {
    const { bookableServiceService } = await import(
      "../services/bookable-service-service.js"
    );
    expect(bookableServiceService.list).toBeTypeOf("function");
    expect(bookableServiceService.create).toBeTypeOf("function");
    expect(bookableServiceService.update).toBeTypeOf("function");
    expect(bookableServiceService.remove).toBeTypeOf("function");
    expect(bookableServiceService.addTeamMember).toBeTypeOf("function");
    expect(bookableServiceService.removeTeamMember).toBeTypeOf("function");
    expect(bookableServiceService.getWithTeamMembers).toBeTypeOf("function");
  });
});
