"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  X,
  Upload,
  FileText,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type ContactField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "source"
  | "tags"
  | "skip";

interface ColumnMapping {
  csvHeader: string;
  field: ContactField;
}

interface ParsedContact {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  tags?: string | null;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface CsvImportModalProps {
  onClose: () => void;
  onImport: (
    contacts: ParsedContact[],
  ) => Promise<ImportResult | null>;
}

/* -------------------------------------------------------------------------- */
/*  CSV Parser                                                                 */
/* -------------------------------------------------------------------------- */

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, rows };
}

/* -------------------------------------------------------------------------- */
/*  Auto-detect column mapping                                                 */
/* -------------------------------------------------------------------------- */

const FIELD_LABELS: Record<ContactField, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  source: "Source",
  tags: "Tags",
  skip: "Skip",
};

const FIELD_OPTIONS: ContactField[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "source",
  "tags",
  "skip",
];

function autoDetectField(header: string): ContactField {
  const h = header.toLowerCase().replace(/[_\-\s]+/g, "");

  if (h === "firstname" || h === "first" || h === "fname") return "firstName";
  if (h === "lastname" || h === "last" || h === "lname" || h === "surname")
    return "lastName";
  if (
    h === "name" ||
    h === "fullname" ||
    h === "contactname" ||
    h === "customername"
  )
    return "firstName"; // will handle full name → firstName
  if (h === "email" || h === "emailaddress" || h === "mail")
    return "email";
  if (
    h === "phone" ||
    h === "phonenumber" ||
    h === "telephone" ||
    h === "tel" ||
    h === "mobile" ||
    h === "cell"
  )
    return "phone";
  if (h === "source" || h === "leadsource" || h === "origin")
    return "source";
  if (h === "tags" || h === "tag" || h === "labels" || h === "label")
    return "tags";

  return "skip";
}

/* -------------------------------------------------------------------------- */
/*  Steps                                                                      */
/* -------------------------------------------------------------------------- */

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function CsvImportModal({ onClose, onImport }: CsvImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* --- File handling --- */

  const handleFile = useCallback((file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10 MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        setError("Failed to read the file.");
        return;
      }

      const parsed = parseCsv(text);

      if (parsed.headers.length === 0) {
        setError("The file appears to be empty.");
        return;
      }

      if (parsed.rows.length === 0) {
        setError("The file has headers but no data rows.");
        return;
      }

      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      // Auto-detect mappings
      const detected = parsed.headers.map(
        (h): ColumnMapping => ({
          csvHeader: h,
          field: autoDetectField(h),
        }),
      );
      setMappings(detected);
      setStep("mapping");
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  /* --- Mapping update --- */

  const updateMapping = useCallback(
    (index: number, field: ContactField) => {
      setMappings((prev) =>
        prev.map((m, i) => (i === index ? { ...m, field } : m)),
      );
    },
    [],
  );

  /* --- Build contacts from mappings --- */

  const mappedContacts = useMemo((): ParsedContact[] => {
    return rows.map((row) => {
      const contact: Record<string, string> = {};

      mappings.forEach((mapping, colIdx) => {
        if (mapping.field === "skip") return;
        const value = row[colIdx] ?? "";
        if (value) {
          // If the field is already set (e.g., multiple columns mapped to same field)
          // concatenate with a space (useful for "name" mapped to firstName)
          if (contact[mapping.field]) {
            contact[mapping.field] += ` ${value}`;
          } else {
            contact[mapping.field] = value;
          }
        }
      });

      // Handle case where "name" column is mapped to firstName:
      // split into firstName + lastName if lastName is empty
      if (contact["firstName"] && !contact["lastName"]) {
        const parts = contact["firstName"].split(" ");
        if (parts.length > 1) {
          contact["firstName"] = parts[0];
          contact["lastName"] = parts.slice(1).join(" ");
        } else {
          contact["lastName"] = "";
        }
      }

      return {
        firstName: contact["firstName"] ?? "",
        lastName: contact["lastName"] ?? "",
        email: contact["email"] || null,
        phone: contact["phone"] || null,
        source: contact["source"] || null,
        tags: contact["tags"] || null,
      };
    });
  }, [rows, mappings]);

  /* --- Validation --- */

  const hasFirstName = mappings.some((m) => m.field === "firstName");
  const validContacts = mappedContacts.filter(
    (c) => c.firstName.trim().length > 0,
  );
  const invalidCount = mappedContacts.length - validContacts.length;

  const mappingError = useMemo(() => {
    if (!hasFirstName) {
      return "You must map at least one column to \"First Name\".";
    }
    if (validContacts.length === 0) {
      return "No valid contacts found. Ensure at least one row has a first name.";
    }
    return null;
  }, [hasFirstName, validContacts.length]);

  /* --- Import --- */

  const handleImport = useCallback(async () => {
    if (validContacts.length === 0) return;

    setStep("importing");
    setError(null);

    try {
      const result = await onImport(validContacts);
      if (result) {
        setImportResult(result);
        setStep("done");
      } else {
        setError("Import failed. The API may be unavailable.");
        setStep("preview");
      }
    } catch {
      setError("An unexpected error occurred during import.");
      setStep("preview");
    }
  }, [validContacts, onImport]);

  /* --- Preview data --- */

  const previewRows = mappedContacts.slice(0, 5);

  /* --- Render --- */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Import Contacts from CSV
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {step === "upload" && "Upload a CSV file to get started"}
              {step === "mapping" && "Map CSV columns to contact fields"}
              {step === "preview" && "Review before importing"}
              {step === "importing" && "Importing contacts..."}
              {step === "done" && "Import complete"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["upload", "mapping", "preview"] as const).map(
            (s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div className="h-px w-6 bg-border" />
                )}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    step === s || step === "importing" || step === "done"
                      ? (["upload", "mapping", "preview"].indexOf(step === "importing" || step === "done" ? "preview" : step) >= i
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground")
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    step === s
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {s === "upload"
                    ? "Upload"
                    : s === "mapping"
                      ? "Map Columns"
                      : "Preview"}
                </span>
              </div>
            ),
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* --- STEP: Upload --- */}
        {step === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drag and drop a CSV file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse (max 10 MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* --- STEP: Column Mapping --- */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <FileText className="h-4 w-4" />
              <span>
                {fileName} &mdash; {rows.length} row
                {rows.length !== 1 ? "s" : ""} found
              </span>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      CSV Column
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Maps To
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sample
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mappings.map((mapping, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                        {mapping.csvHeader}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={mapping.field}
                          onChange={(e) =>
                            updateMapping(
                              idx,
                              e.target.value as ContactField,
                            )
                          }
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {FIELD_OPTIONS.map((f) => (
                            <option key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground truncate max-w-[200px]">
                        {rows[0]?.[idx] ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mappingError && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {mappingError}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  setStep("upload");
                  setHeaders([]);
                  setRows([]);
                  setMappings([]);
                  setFileName("");
                  setError(null);
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep("preview")}
                disabled={!!mappingError}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors",
                  mappingError
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                Preview
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* --- STEP: Preview --- */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing first {Math.min(5, mappedContacts.length)} of{" "}
              {mappedContacts.length} contacts
              {invalidCount > 0 && (
                <span className="text-warning">
                  {" "}
                  ({invalidCount} will be skipped — missing first name)
                </span>
              )}
            </div>

            <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      First Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Last Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Source
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((contact, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="px-4 py-2.5 text-sm text-foreground">
                        {contact.firstName || (
                          <span className="text-destructive italic">
                            missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-foreground">
                        {contact.lastName || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {contact.email || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {contact.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {contact.source || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {contact.tags || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep("mapping")}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleImport}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import {validContacts.length} Contact
                {validContacts.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* --- STEP: Importing --- */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Importing {validContacts.length} contacts...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
          </div>
        )}

        {/* --- STEP: Done --- */}
        {step === "done" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Import Complete
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.imported} imported
                  {importResult.skipped > 0 &&
                    `, ${importResult.skipped} skipped`}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm font-medium text-warning mb-2">
                  {importResult.errors.length} issue
                  {importResult.errors.length !== 1 ? "s" : ""}:
                </p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((err, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-muted-foreground"
                    >
                      {err}
                    </li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li className="text-xs text-muted-foreground italic">
                      ...and {importResult.errors.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
