"use client";

import { useApiQuery, useApiMutation } from "./use-api";

// --------------------------------------------------------
// Types
// --------------------------------------------------------

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface FormSettings {
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;
  autoCreateContact?: boolean;
  autoAddTag?: string;
  notificationEmail?: string;
}

interface Form {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  fields: FormField[];
  settings: FormSettings;
  status: "active" | "inactive";
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface FormDetail {
  form: Form;
  submissionCount: number;
  recentSubmissions: FormSubmission[];
}

interface FormSubmission {
  id: string;
  orgId: string;
  formId: string;
  contactId: string | null;
  data: Record<string, string>;
  source: string;
  formName?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  createdAt: string;
}

interface CreateFormInput {
  name: string;
  description?: string;
  fields: FormField[];
  settings?: FormSettings;
  status?: "active" | "inactive";
}

interface UpdateFormInput {
  name?: string;
  description?: string;
  fields?: FormField[];
  settings?: FormSettings;
  status?: "active" | "inactive";
}

// --------------------------------------------------------
// useForms — list all forms
// --------------------------------------------------------

function useForms(options: { search?: string; status?: string } = {}) {
  const params: Record<string, string> = {};
  if (options.search) params.search = options.search;
  if (options.status) params.status = options.status;

  return useApiQuery<Form[]>(
    "/orgs/:orgId/forms",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// --------------------------------------------------------
// useForm — single form with submissions
// --------------------------------------------------------

function useForm(id: string) {
  const fallback: FormDetail = {
    form: {
      id,
      orgId: "",
      name: "",
      description: null,
      fields: [],
      settings: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    submissionCount: 0,
    recentSubmissions: [],
  };

  return useApiQuery<FormDetail>(`/orgs/:orgId/forms/${id}`, fallback);
}

// --------------------------------------------------------
// useFormSubmissions — list submissions
// --------------------------------------------------------

function useFormSubmissions(formId?: string) {
  const params: Record<string, string> = {};
  if (formId) params.formId = formId;

  return useApiQuery<FormSubmission[]>(
    formId
      ? `/orgs/:orgId/forms/${formId}/submissions`
      : "/orgs/:orgId/forms/submissions",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// --------------------------------------------------------
// useCreateForm
// --------------------------------------------------------

function useCreateForm() {
  return useApiMutation<CreateFormInput, Form>(
    "/orgs/:orgId/forms",
    "post",
  );
}

// --------------------------------------------------------
// useUpdateForm
// --------------------------------------------------------

function useUpdateForm(id: string) {
  return useApiMutation<UpdateFormInput, Form>(
    `/orgs/:orgId/forms/${id}`,
    "patch",
  );
}

// --------------------------------------------------------
// useDeleteForm
// --------------------------------------------------------

function useDeleteForm(id: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/forms/${id}`,
    "delete",
  );
}

// --------------------------------------------------------
// useFormEmbed — get embed code
// --------------------------------------------------------

function useFormEmbed(id: string) {
  return useApiQuery<{ embedUrl: string; embedCode: string }>(
    `/orgs/:orgId/forms/${id}/embed`,
    { embedUrl: "", embedCode: "" },
  );
}

export {
  useForms,
  useForm,
  useFormSubmissions,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useFormEmbed,
};

export type {
  Form,
  FormField,
  FormSettings,
  FormDetail,
  FormSubmission,
  CreateFormInput,
  UpdateFormInput,
};
