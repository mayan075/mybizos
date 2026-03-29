/**
 * Gemini Live API function declarations for HararAI voice agent tools.
 * Translated from the Vapi OpenAI-style schemas to Gemini's format.
 *
 * Same 4 tools: bookAppointment, checkAvailability, transferToHuman, endCall
 */

import type { GeminiFunctionDeclaration, GeminiToolConfig } from './types.js';

const SERVICE_TYPES = [
  'hvac_repair',
  'hvac_maintenance',
  'hvac_installation',
  'plumbing_repair',
  'plumbing_installation',
  'plumbing_emergency',
  'drain_cleaning',
  'water_heater',
  'general_inspection',
] as const;

export const GEMINI_FUNCTION_DECLARATIONS: Record<string, GeminiFunctionDeclaration> = {
  bookAppointment: {
    name: 'book_appointment',
    description:
      'Book a service appointment for the caller. Collect the service type, preferred date, preferred time, and customer name before calling this function.',
    parameters: {
      type: 'OBJECT',
      properties: {
        customerName: {
          type: 'STRING',
          description: 'Full name of the customer',
        },
        customerPhone: {
          type: 'STRING',
          description: 'Customer phone number in E.164 format',
        },
        customerEmail: {
          type: 'STRING',
          description: 'Customer email address (optional)',
        },
        serviceType: {
          type: 'STRING',
          description: 'Type of service requested',
          enum: [...SERVICE_TYPES],
        },
        preferredDate: {
          type: 'STRING',
          description: 'Preferred date in YYYY-MM-DD format',
        },
        preferredTime: {
          type: 'STRING',
          description: 'Preferred time slot',
          enum: ['morning', 'afternoon', 'evening'],
        },
        notes: {
          type: 'STRING',
          description: 'Additional notes about the appointment or issue description',
        },
      },
      required: ['customerName', 'customerPhone', 'serviceType', 'preferredDate', 'preferredTime'],
    },
  },

  checkAvailability: {
    name: 'check_availability',
    description:
      'Check available appointment slots for a given date and service type. Call this before booking to present options to the caller.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: {
          type: 'STRING',
          description: 'Date to check availability for in YYYY-MM-DD format',
        },
        serviceType: {
          type: 'STRING',
          description: 'Type of service requested',
          enum: [...SERVICE_TYPES],
        },
      },
      required: ['date', 'serviceType'],
    },
  },

  transferToHuman: {
    name: 'transfer_to_human',
    description:
      'Transfer the call to a human agent. Use this when the caller explicitly requests a human, after 2 misunderstandings, or for emergency situations (flooding, gas leak, fire).',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: {
          type: 'STRING',
          description: 'Reason for transferring to a human',
          enum: [
            'caller_request',
            'emergency',
            'complex_issue',
            'repeated_misunderstanding',
            'complaint',
            'billing_dispute',
          ],
        },
        summary: {
          type: 'STRING',
          description: 'Brief summary of the conversation so far for the human agent',
        },
        urgency: {
          type: 'STRING',
          description: 'Urgency level of the transfer',
          enum: ['low', 'medium', 'high', 'critical'],
        },
      },
      required: ['reason', 'summary'],
    },
  },

  endCall: {
    name: 'end_call',
    description:
      'End the phone call after the conversation is complete. Always summarize what was discussed or scheduled before ending.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: {
          type: 'STRING',
          description: 'Reason for ending the call',
          enum: [
            'appointment_booked',
            'information_provided',
            'caller_request',
            'no_availability',
            'transferred',
            'voicemail',
          ],
        },
        summary: {
          type: 'STRING',
          description: 'Brief summary of the call outcome',
        },
        followUpRequired: {
          type: 'BOOLEAN',
          description: 'Whether a follow-up action is needed',
        },
        followUpNotes: {
          type: 'STRING',
          description: 'Notes about the follow-up if required',
        },
      },
      required: ['reason', 'summary'],
    },
  },
};

/**
 * Build the tools config array for a Gemini Live session.
 * Pass the returned object in the session's `tools` config.
 */
export function buildGeminiToolsConfig(): GeminiToolConfig[] {
  return [
    {
      functionDeclarations: Object.values(GEMINI_FUNCTION_DECLARATIONS),
    },
  ];
}
