"use client";

import { useApiQuery, useApiMutation } from "./use-api";
import {
  type MockAppointment,
} from "@/lib/mock-data";

// --------------------------------------------------------
// useAppointments — fetch appointments for a date range
// --------------------------------------------------------

function useAppointments(weekStart?: string, weekEnd?: string) {
  const params: Record<string, string> = {};
  if (weekStart) params.weekStart = weekStart;
  if (weekEnd) params.weekEnd = weekEnd;

  return useApiQuery<MockAppointment[]>(
    "/orgs/:orgId/appointments",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// --------------------------------------------------------
// useCreateAppointment
// --------------------------------------------------------

interface CreateAppointmentInput {
  title: string;
  customer: string;
  dayIndex: number;
  hourStart: number;
  duration?: number;
  location?: string;
}

function useCreateAppointment() {
  return useApiMutation<CreateAppointmentInput, MockAppointment>(
    "/orgs/:orgId/appointments",
    "post",
  );
}

// --------------------------------------------------------
// useAvailability — fetch available time slots for a date
// --------------------------------------------------------

interface AvailableSlot {
  hour: number;
  available: boolean;
}

/**
 * Placeholder: when the API is live it returns real availability.
 * Mock fallback generates all hours 8-18 as available.
 */
function useAvailability(date?: string) {
  const mockSlots: AvailableSlot[] = Array.from({ length: 11 }, (_, i) => ({
    hour: i + 8,
    available: true,
  }));

  const params: Record<string, string> = {};
  if (date) params.date = date;

  return useApiQuery<AvailableSlot[]>(
    "/orgs/:orgId/appointments/availability",
    mockSlots,
    Object.keys(params).length > 0 ? params : undefined,
    !!date,
  );
}

export { useAppointments, useCreateAppointment, useAvailability };
