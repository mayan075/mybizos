import { platformAssistantService } from "./platform-assistant-service.js";
import { conversationService } from "./conversation-service.js";
import { logger } from "../middleware/logger.js";

interface InboundMessage {
  conversationId: string;
  orgId: string;
  messageBody: string;
}

/**
 * Process an inbound message through the AI booking handler.
 * Called by webhook handlers for SMS, WhatsApp, email, and the webchat endpoint.
 *
 * Returns the AI response text, or null if AI handling is disabled for this conversation.
 */
export async function handleAIBookingMessage(
  msg: InboundMessage,
): Promise<string | null> {
  // Get the conversation to check if AI handled
  const conversation = await conversationService.getById(
    msg.orgId,
    msg.conversationId,
  );

  if (!conversation.conversation.aiHandled) {
    return null; // Not AI handled — let human reply
  }

  const contactId = conversation.conversation.contactId;
  const channel = conversation.conversation.channel;

  // Load recent message history for context
  const recentMessages = await conversationService.getMessages(
    msg.orgId,
    msg.conversationId,
  );

  // Convert to ChatMessage format (last 10 messages)
  const history = recentMessages
    .slice(-10)
    .filter((m) => m.body)
    .map((m) => ({
      role: (m.senderType === "contact" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.body,
    }));

  try {
    const result = await platformAssistantService.chat(
      msg.orgId,
      msg.messageBody,
      history,
      { contactId, channel },
    );

    // Store the AI response as an outbound message
    await conversationService.createMessage(msg.orgId, msg.conversationId, {
      direction: "outbound",
      channel,
      senderType: "ai",
      body: result.response,
    });

    logger.info("AI booking handler processed message", {
      orgId: msg.orgId,
      conversationId: msg.conversationId,
      channel,
    });

    return result.response;
  } catch (err) {
    logger.error("AI booking handler failed", {
      orgId: msg.orgId,
      conversationId: msg.conversationId,
      error: err instanceof Error ? err.message : String(err),
    });

    return "I'm having a bit of trouble right now. Let me connect you with our team — someone will be in touch shortly.";
  }
}
