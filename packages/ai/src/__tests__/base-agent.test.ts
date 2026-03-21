import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAgent, type AgentContext, type AgentAction } from "../agents/base-agent.js";
import type { ClaudeClient, ClaudeResponse } from "../providers/claude.js";

// ─── Concrete test subclass ─────────────────────────────────────────

class TestAgent extends BaseAgent {
  public testSystemPrompt = "You are a test agent.";

  constructor(client: ClaudeClient) {
    super(client, "phone");
  }

  protected buildSystemPrompt(_context: AgentContext): string {
    return this.testSystemPrompt;
  }

  protected async extractActions(
    _context: AgentContext,
    _responseContent: string,
  ): Promise<AgentAction[]> {
    return [];
  }

  // Expose misunderstandingCount for testing
  getMisunderstandingCount(): number {
    return this.misunderstandingCount;
  }
}

function createMockClient(responseContent: string = "I can help you with that."): ClaudeClient {
  return {
    chat: vi.fn().mockResolvedValue({
      content: responseContent,
      stopReason: "end_turn",
      usage: { inputTokens: 100, outputTokens: 50 },
    } satisfies ClaudeResponse),
    complete: vi.fn(),
  } as unknown as ClaudeClient;
}

function createContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    orgId: "test-org-id",
    orgName: "Acme Plumbing",
    vertical: "plumbing",
    contactName: "John Doe",
    contactPhone: "+15551234567",
    conversationHistory: [],
    metadata: {},
    ...overrides,
  };
}

describe("BaseAgent emergency detection", () => {
  it("detects 'my basement is flooding' as emergency", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);
    const context = createContext();

    const result = await agent.process(context, "My basement is flooding!");

    const alertAction = result.actions.find((a) => a.type === "alert_owner");
    expect(alertAction).toBeDefined();
    expect(alertAction?.message).toContain("EMERGENCY");
  });

  it("detects 'gas leak' as emergency", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);
    const context = createContext();

    const result = await agent.process(context, "I think there's a gas leak in my kitchen");

    const alertAction = result.actions.find((a) => a.type === "alert_owner");
    expect(alertAction).toBeDefined();
    expect(alertAction?.data?.keyword).toBe("gas leak");
  });

  it("detects 'fire' as emergency", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);

    const result = await agent.process(createContext(), "There's an electrical fire!");

    const alertAction = result.actions.find((a) => a.type === "alert_owner");
    expect(alertAction).toBeDefined();
  });

  it("detects 'carbon monoxide' as emergency", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);

    const result = await agent.process(createContext(), "My carbon monoxide detector is going off!");

    expect(result.actions.some((a) => a.type === "alert_owner")).toBe(true);
  });

  it("does NOT detect 'I need a tune-up' as emergency", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);
    const context = createContext();

    const result = await agent.process(context, "I need a tune-up for my AC unit");

    const alertAction = result.actions.find((a) => a.type === "alert_owner");
    expect(alertAction).toBeUndefined();
  });

  it("does NOT detect normal request as emergency", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);

    const result = await agent.process(createContext(), "Can you give me a quote for a new water heater?");

    expect(result.actions.some((a) => a.type === "alert_owner")).toBe(false);
  });

  it("emergency action includes contact details", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);
    const context = createContext({ contactName: "Jane", contactPhone: "+15559999999" });

    const result = await agent.process(context, "Help! Burst pipe in the wall!");

    const alertAction = result.actions.find((a) => a.type === "alert_owner");
    expect(alertAction?.data?.contactName).toBe("Jane");
    expect(alertAction?.data?.contactPhone).toBe("+15559999999");
  });
});

describe("BaseAgent misunderstanding escalation", () => {
  it("escalates after 2 misunderstandings", async () => {
    const client = createMockClient("I'm not sure I understand what you mean.");
    const agent = new TestAgent(client);
    const context = createContext();

    // First misunderstanding
    const result1 = await agent.process(context, "blargh flargh");
    expect(result1.shouldEscalate).toBe(false);
    expect(result1.misunderstandingCount).toBe(1);

    // Second misunderstanding
    const result2 = await agent.process(context, "sdfghjkl asdf");
    expect(result2.shouldEscalate).toBe(true);
    expect(result2.misunderstandingCount).toBe(2);

    const escalateAction = result2.actions.find((a) => a.type === "escalate");
    expect(escalateAction).toBeDefined();
    expect(escalateAction?.message).toContain("team member");
  });

  it("does NOT escalate on first misunderstanding", async () => {
    const client = createMockClient("Could you clarify what you need?");
    const agent = new TestAgent(client);

    const result = await agent.process(createContext(), "asdfghjkl");
    expect(result.shouldEscalate).toBe(false);
    expect(result.misunderstandingCount).toBe(1);
  });

  it("does NOT count clear responses as misunderstandings", async () => {
    const client = createMockClient("Sure! I can help you schedule an appointment for AC repair.");
    const agent = new TestAgent(client);

    const result = await agent.process(createContext(), "I need AC repair");
    expect(result.misunderstandingCount).toBe(0);
    expect(result.shouldEscalate).toBe(false);
  });

  it("detects 'could you rephrase' as misunderstanding", async () => {
    const client = createMockClient("I'm sorry, could you rephrase that?");
    const agent = new TestAgent(client);

    const result = await agent.process(createContext(), "xyzzy plugh");
    expect(result.misunderstandingCount).toBe(1);
  });
});

describe("BaseAgent system prompt", () => {
  it("uses the system prompt from buildSystemPrompt", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);
    agent.testSystemPrompt = "Custom system prompt with AI disclosure";

    await agent.process(createContext(), "Hello");

    expect(client.chat).toHaveBeenCalledWith(
      "Custom system prompt with AI disclosure",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("passes user message in conversation history", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);

    await agent.process(createContext(), "I need help with my pipes");

    const chatCall = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0];
    const messages = chatCall[1];
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content).toBe("I need help with my pipes");
  });

  it("includes prior conversation history", async () => {
    const client = createMockClient();
    const agent = new TestAgent(client);
    const context = createContext({
      conversationHistory: [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi! How can I help?" },
      ],
    });

    await agent.process(context, "I need a plumber");

    const chatCall = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0];
    const messages = chatCall[1];
    expect(messages).toHaveLength(3); // 2 history + 1 new
  });
});
