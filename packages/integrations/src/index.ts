// Twilio
export {
  TwilioClient,
  type TwilioConfig,
  type SendSmsOptions,
  type SendSmsResult,
  type SendMmsOptions,
  type SendMmsResult,
  type MakeCallOptions,
  type MakeCallResult,
  type InboundSms,
  type InboundCall,
  type TwimlAction,
} from "./twilio/index.js";

// Stripe
export {
  StripeClient,
  type StripeConfig,
  type CreateConnectAccountOptions,
  type CreateConnectAccountResult,
  type CreateAccountLinkResult,
  type ConnectAccountStatus,
  type CreateCustomerOptions,
  type CustomerResult,
  type InvoiceLineItem,
  type CreateInvoiceOptions,
  type InvoiceResult,
  type CreatePaymentLinkOptions,
  type PaymentLinkResult,
} from "./stripe/index.js";

// Google Calendar
export {
  GoogleCalendarClient,
  type GoogleCalendarConfig,
  type CalendarTokens,
  type CalendarEvent,
  type CalendarEventAttendee,
  type CalendarEventResult,
  type ListEventsResult,
} from "./google-calendar/index.js";

// Vapi.ai Voice
export {
  VapiClient,
  VAPI_TOOL_SCHEMAS,
  type VapiConfig,
  type VapiAssistantConfig,
  type VapiToolDefinition,
  type VapiToolParameter,
  type VapiPhoneNumberConfig,
  type VapiAssistant,
  type VapiPhoneNumber,
  type VapiCall,
  type VapiMessage,
  type VapiCallListFilters,
} from "./vapi/index.js";
