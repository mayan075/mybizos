/**
 * Twilio Voice SDK — Browser Device Manager
 *
 * Singleton that manages the Twilio Device for browser-based calling.
 * Handles token fetching, device initialization, making/receiving calls,
 * and automatic token refresh.
 */

import type { Device } from '@twilio/voice-sdk';
import type { Call } from '@twilio/voice-sdk';

// ── Types ──────────────────────────────────────────────────────────────────

export type DeviceStatus =
  | 'uninitialized'
  | 'initializing'
  | 'registered'
  | 'error'
  | 'destroyed';

export type CallStatus =
  | 'idle'
  | 'connecting'
  | 'ringing'
  | 'open'
  | 'closed'
  | 'incoming';

export interface TwilioCallState {
  deviceStatus: DeviceStatus;
  callStatus: CallStatus;
  remoteNumber: string | null;
  isMuted: boolean;
  error: string | null;
  needsSetup: boolean;
}

type StateListener = (state: TwilioCallState) => void;

// ── Module-level state (singleton) ─────────────────────────────────────────

let device: Device | null = null;
let activeCall: Call | null = null;
let identity: string | null = null;

let currentState: TwilioCallState = {
  deviceStatus: 'uninitialized',
  callStatus: 'idle',
  remoteNumber: null,
  isMuted: false,
  error: null,
  needsSetup: false,
};

const listeners = new Set<StateListener>();

// Token refresh timer
let tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ── Internal helpers ───────────────────────────────────────────────────────

function getOrgId(): string {
  if (typeof window === 'undefined') return 'org_01';
  try {
    const token = localStorage.getItem('mybizos_token');
    if (!token) return 'org_01';
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return 'org_01';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.orgId ?? 'org_01';
  } catch {
    return 'org_01';
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mybizos_token');
}

function setState(partial: Partial<TwilioCallState>): void {
  currentState = { ...currentState, ...partial };
  for (const listener of listeners) {
    listener(currentState);
  }
}

// ── Token management ───────────────────────────────────────────────────────

async function fetchToken(): Promise<string | null> {
  const orgId = getOrgId();
  const authToken = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${API_BASE}/orgs/${orgId}/voice/token`, { headers });
    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.error ?? `Token request failed (HTTP ${res.status})`;
      console.error('[TwilioDevice] fetchToken failed:', errorMsg, data);
      if (data.needsSetup) {
        setState({ needsSetup: true, error: null });
      } else {
        setState({ error: errorMsg });
      }
      return null;
    }

    identity = data.identity ?? null;
    setState({ needsSetup: false });
    return data.token as string;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error reaching API';
    console.error('[TwilioDevice] fetchToken network error:', message);
    setState({ error: `Cannot reach API: ${message}` });
    return null;
  }
}

/**
 * Schedule token refresh ~1 minute before expiry.
 * Twilio tokens are typically valid for 1 hour.
 */
function scheduleTokenRefresh(): void {
  if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);

  // Refresh 5 minutes before the 1-hour default expiry
  const refreshMs = 55 * 60 * 1000; // 55 minutes

  tokenRefreshTimeout = setTimeout(async () => {
    if (!device) return;

    const newToken = await fetchToken();
    if (newToken && device) {
      device.updateToken(newToken);
      scheduleTokenRefresh();
    }
  }, refreshMs);
}

// ── Voice setup (one-time) ─────────────────────────────────────────────────

export async function runVoiceSetup(): Promise<{ success: boolean; error?: string }> {
  const orgId = getOrgId();
  const authToken = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    console.info('[TwilioDevice] Running voice setup for org:', orgId);
    const res = await fetch(`${API_BASE}/orgs/${orgId}/voice/setup`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.error ?? `Setup failed (HTTP ${res.status})`;
      console.error('[TwilioDevice] runVoiceSetup failed:', errorMsg, data);
      setState({ error: errorMsg });
      return { success: false, error: errorMsg };
    }

    console.info('[TwilioDevice] Voice setup succeeded:', data);
    setState({ needsSetup: false, error: null });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    const errorMsg = `Network error reaching API (${message}). Make sure the API is running.`;
    console.error('[TwilioDevice] runVoiceSetup network error:', errorMsg);
    setState({ error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

// ── Device initialization ──────────────────────────────────────────────────

export async function initDevice(): Promise<void> {
  // Don't re-initialize if already registered
  if (device && currentState.deviceStatus === 'registered') return;

  setState({ deviceStatus: 'initializing', error: null });

  console.info('[TwilioDevice] Initializing device...');
  const token = await fetchToken();
  if (!token) {
    console.warn('[TwilioDevice] No token received. needsSetup:', currentState.needsSetup);
    if (currentState.needsSetup) {
      // Don't overwrite the error — the UI will show the setup button
      setState({ deviceStatus: 'error' });
    } else {
      setState({
        deviceStatus: 'error',
        error: currentState.error ?? 'Could not get voice token. Check your phone system configuration.',
      });
    }
    return;
  }

  try {
    // Dynamic import so the SDK only loads when needed
    const { Device } = await import('@twilio/voice-sdk');

    // Destroy existing device if any
    if (device) {
      device.destroy();
      device = null;
    }

    // Import Call type for codec enum access
    const { Call: CallClass } = await import('@twilio/voice-sdk');

    device = new Device(token, {
      logLevel: 1,
      codecPreferences: [CallClass.Codec.Opus, CallClass.Codec.PCMU],
      closeProtection: true,
    });

    // ── Device events ────────────────────────────────────────────────

    device.on('registered', () => {
      setState({ deviceStatus: 'registered', error: null });
    });

    device.on('unregistered', () => {
      setState({ deviceStatus: 'uninitialized' });
    });

    device.on('error', (err: { message?: string; code?: number }) => {
      const errorMessage = err.message ?? 'Voice device error';
      setState({ deviceStatus: 'error', error: errorMessage });
    });

    // Incoming call
    device.on('incoming', (call: Call) => {
      activeCall = call;
      const remoteNumber = call.parameters?.From ?? 'Unknown';
      setState({ callStatus: 'incoming', remoteNumber });

      call.on('accept', () => {
        setState({ callStatus: 'open' });
      });

      call.on('disconnect', () => {
        activeCall = null;
        setState({ callStatus: 'idle', remoteNumber: null, isMuted: false });
      });

      call.on('cancel', () => {
        activeCall = null;
        setState({ callStatus: 'idle', remoteNumber: null, isMuted: false });
      });

      call.on('reject', () => {
        activeCall = null;
        setState({ callStatus: 'idle', remoteNumber: null, isMuted: false });
      });
    });

    device.on('tokenWillExpire', async () => {
      const newToken = await fetchToken();
      if (newToken && device) {
        device.updateToken(newToken);
      }
    });

    // Register the device (enables receiving calls + making calls)
    await device.register();
    scheduleTokenRefresh();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initialize voice';
    setState({ deviceStatus: 'error', error: message });
  }
}

// ── Making calls ───────────────────────────────────────────────────────────

export async function makeCall(to: string): Promise<void> {
  if (!device || currentState.deviceStatus !== 'registered') {
    setState({ error: 'Voice device not ready. Please wait for it to initialize.' });
    return;
  }

  // Check microphone permission
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the test stream immediately
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    setState({ error: 'Microphone access denied. Please allow microphone access to make calls.' });
    return;
  }

  try {
    setState({ callStatus: 'connecting', remoteNumber: to, error: null, isMuted: false });

    const call = await device.connect({
      params: { To: to },
    });

    activeCall = call;

    call.on('ringing', () => {
      setState({ callStatus: 'ringing' });
    });

    call.on('accept', () => {
      setState({ callStatus: 'open' });
    });

    call.on('disconnect', () => {
      activeCall = null;
      setState({ callStatus: 'idle', remoteNumber: null, isMuted: false });
    });

    call.on('cancel', () => {
      activeCall = null;
      setState({ callStatus: 'idle', remoteNumber: null, isMuted: false });
    });

    call.on('error', (err: { message?: string }) => {
      activeCall = null;
      setState({
        callStatus: 'idle',
        remoteNumber: null,
        isMuted: false,
        error: err.message ?? 'Call failed',
      });
    });

    call.on('reconnecting', () => {
      setState({ error: 'Call reconnecting...' });
    });

    call.on('reconnected', () => {
      setState({ error: null });
    });
  } catch (err) {
    activeCall = null;
    const message = err instanceof Error ? err.message : 'Failed to connect call';
    setState({ callStatus: 'idle', error: message, remoteNumber: null, isMuted: false });
  }
}

// ── Call controls ──────────────────────────────────────────────────────────

export function hangUp(): void {
  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }
  if (device) {
    device.disconnectAll();
  }
  setState({ callStatus: 'idle', remoteNumber: null, isMuted: false, error: null });
}

export function toggleMute(): boolean {
  if (!activeCall) return false;

  const newMuted = !currentState.isMuted;
  activeCall.mute(newMuted);
  setState({ isMuted: newMuted });
  return newMuted;
}

export function acceptIncoming(): void {
  if (activeCall && currentState.callStatus === 'incoming') {
    activeCall.accept();
  }
}

export function rejectIncoming(): void {
  if (activeCall && currentState.callStatus === 'incoming') {
    activeCall.reject();
    activeCall = null;
    setState({ callStatus: 'idle', remoteNumber: null, isMuted: false });
  }
}

export function sendDigits(digits: string): void {
  if (activeCall) {
    activeCall.sendDigits(digits);
  }
}

// ── Destroy ────────────────────────────────────────────────────────────────

export function destroyDevice(): void {
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
    tokenRefreshTimeout = null;
  }
  if (device) {
    device.destroy();
    device = null;
  }
  activeCall = null;
  identity = null;
  setState({
    deviceStatus: 'destroyed',
    callStatus: 'idle',
    remoteNumber: null,
    isMuted: false,
    error: null,
    needsSetup: false,
  });
}

// ── State subscription ─────────────────────────────────────────────────────

export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener(currentState);
  return () => listeners.delete(listener);
}

export function getState(): TwilioCallState {
  return currentState;
}

export function getIdentity(): string | null {
  return identity;
}

export function clearError(): void {
  setState({ error: null });
}
