"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OnboardingService } from "@/lib/onboarding";
import {
  PRICING_MODE_LABELS,
  PRICING_UNIT_LABELS,
  PRICING_UNIT_SUFFIX,
} from "@/lib/onboarding";
import type { PricingMode, PricingUnit } from "@hararai/shared";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ServicesStepProps {
  services: OnboardingService[];
  onServicesChange: (services: OnboardingService[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 };
const SPRING_FAST = { type: "spring" as const, stiffness: 400, damping: 28 };

const PRICING_MODES: PricingMode[] = ["fixed", "range", "from"];
const PRICING_UNITS: PricingUnit[] = ["job", "hour", "sqm", "unit", "visit"];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ServicesStep({ services, onServicesChange }: ServicesStepProps) {
  const [newServiceName, setNewServiceName] = useState("");
  const enabledCount = services.filter((s) => s.enabled).length;

  // --- Handlers ---

  function updateService(id: string, patch: Partial<OnboardingService>) {
    onServicesChange(
      services.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function toggleService(id: string) {
    onServicesChange(
      services.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function removeService(id: string) {
    onServicesChange(services.filter((s) => s.id !== id));
  }

  function addCustomService() {
    const name = newServiceName.trim();
    if (!name) return;
    onServicesChange([
      ...services,
      {
        id: `custom-${Date.now()}`,
        name,
        enabled: true,
        priceMin: 0,
        priceMax: 0,
        pricingMode: "range",
        pricingUnit: "job",
        custom: true,
      },
    ]);
    setNewServiceName("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Your services</h2>
        <p className="text-sm text-muted-foreground">
          We pre-filled these based on your industry. Toggle what you offer,
          adjust pricing, or add your own.
        </p>
      </div>

      {/* Count */}
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs">
          {enabledCount} service{enabledCount !== 1 ? "s" : ""} active
        </Badge>
      </div>

      {/* Service cards */}
      <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.04, delayChildren: 0.1 },
            },
          }}
        >
          <AnimatePresence mode="popLayout">
            {services.map((service) => (
              <motion.div
                key={service.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: SPRING,
                  },
                }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              >
                {service.enabled ? (
                  <EnabledCard
                    service={service}
                    onToggle={toggleService}
                    onUpdate={updateService}
                    onRemove={removeService}
                  />
                ) : (
                  <DisabledCard
                    service={service}
                    onToggle={toggleService}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Add custom */}
      <AddServiceInput
        value={newServiceName}
        onChange={setNewServiceName}
        onAdd={addCustomService}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enabled card
// ---------------------------------------------------------------------------

function EnabledCard({
  service,
  onToggle,
  onUpdate,
  onRemove,
}: {
  service: OnboardingService;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<OnboardingService>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-primary/20 bg-primary/5 p-4",
        "transition-colors",
      )}
    >
      {/* Row 1: checkbox + name + remove */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(service.id)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
            "border-2 border-primary bg-primary text-primary-foreground",
            "transition-all",
          )}
        >
          <Check className="h-3 w-3" />
        </button>

        {service.custom ? (
          <input
            type="text"
            value={service.name}
            onChange={(e) => onUpdate(service.id, { name: e.target.value })}
            className={cn(
              "flex-1 bg-transparent text-sm font-medium text-foreground",
              "border-b border-transparent",
              "focus:border-muted-foreground/30 focus:outline-none",
              "transition-colors",
            )}
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-foreground">
            {service.name}
          </span>
        )}

        {service.custom && (
          <button
            type="button"
            onClick={() => onRemove(service.id)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              "text-muted-foreground/0 group-hover:text-muted-foreground",
              "hover:text-destructive hover:bg-destructive/10",
              "transition-colors",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Row 2: pricing mode toggle */}
      <div className="mt-3 ml-8">
        <PricingModeToggle
          value={service.pricingMode}
          onChange={(mode) => onUpdate(service.id, { pricingMode: mode })}
        />
      </div>

      {/* Row 3: price inputs + unit pill */}
      <div className="mt-2.5 ml-8 flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <PriceInputs
          mode={service.pricingMode}
          priceMin={service.priceMin}
          priceMax={service.priceMax}
          onMinChange={(v) => onUpdate(service.id, { priceMin: v })}
          onMaxChange={(v) => onUpdate(service.id, { priceMax: v })}
        />

        <PricingUnitPill
          value={service.pricingUnit}
          onChange={(unit) => onUpdate(service.id, { pricingUnit: unit })}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Disabled card
// ---------------------------------------------------------------------------

function DisabledCard({
  service,
  onToggle,
}: {
  service: OnboardingService;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(service.id)}
      className={cn(
        "group w-full cursor-pointer rounded-xl border border-dashed border-border/60",
        "bg-card/30 px-4 py-3 text-left",
        "hover:border-primary/30 hover:bg-primary/5",
        "transition-colors",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
            "border-2 border-muted-foreground/25",
            "group-hover:border-primary/50",
            "transition-colors",
          )}
        />
        <span className="flex-1 text-sm text-muted-foreground">
          {service.name}
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            "text-muted-foreground/50 group-hover:text-primary",
            "transition-colors",
          )}
        >
          + Add
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pricing mode toggle (Fixed · Range · From)
// ---------------------------------------------------------------------------

function PricingModeToggle({
  value,
  onChange,
}: {
  value: PricingMode;
  onChange: (mode: PricingMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted/40 p-0.5">
      {PRICING_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "relative rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            value === mode
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70",
          )}
        >
          {value === mode && (
            <motion.div
              layoutId="pricing-mode-bg"
              className="absolute inset-0 rounded-md bg-background shadow-sm"
              transition={SPRING_FAST}
            />
          )}
          <span className="relative z-10">
            {PRICING_MODE_LABELS[mode]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price inputs (adapt per mode)
// ---------------------------------------------------------------------------

function PriceInputs({
  mode,
  priceMin,
  priceMax,
  onMinChange,
  onMaxChange,
}: {
  mode: PricingMode;
  priceMin: number;
  priceMax: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const inputClass = cn(
    "w-16 bg-transparent text-sm text-foreground tabular-nums",
    "border-b border-transparent",
    "focus:border-muted-foreground/40 focus:outline-none",
    "placeholder:text-muted-foreground/40",
    "transition-colors",
  );

  if (mode === "fixed") {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground/70">$</span>
        <input
          type="number"
          value={priceMin || ""}
          onChange={(e) => onMinChange(Number(e.target.value))}
          placeholder="0"
          min={0}
          className={inputClass}
        />
      </div>
    );
  }

  if (mode === "from") {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground/70">from</span>
        <span className="text-muted-foreground/70">$</span>
        <input
          type="number"
          value={priceMin || ""}
          onChange={(e) => onMinChange(Number(e.target.value))}
          placeholder="0"
          min={0}
          className={inputClass}
        />
      </div>
    );
  }

  // range
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground/70">$</span>
      <input
        type="number"
        value={priceMin || ""}
        onChange={(e) => onMinChange(Number(e.target.value))}
        placeholder="0"
        min={0}
        className={inputClass}
      />
      <span className="text-muted-foreground/50">&ndash;</span>
      <span className="text-muted-foreground/70">$</span>
      <input
        type="number"
        value={priceMax || ""}
        onChange={(e) => onMaxChange(Number(e.target.value))}
        placeholder="0"
        min={0}
        className={inputClass}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing unit pill
// ---------------------------------------------------------------------------

function PricingUnitPill({
  value,
  onChange,
}: {
  value: PricingUnit;
  onChange: (unit: PricingUnit) => void;
}) {
  const [open, setOpen] = useState(false);
  const suffix = PRICING_UNIT_SUFFIX[value];

  // Show the pill for all units — even "job" users may want to change it
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full",
            "px-2 py-0.5 text-xs font-medium",
            "bg-muted/60 text-muted-foreground",
            "hover:bg-muted hover:text-foreground",
            "transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {suffix || PRICING_UNIT_LABELS[value]}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-36 p-1.5"
      >
        {PRICING_UNITS.map((unit) => (
          <button
            key={unit}
            type="button"
            onClick={() => {
              onChange(unit);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center rounded-md px-2.5 py-1.5 text-xs",
              "transition-colors",
              unit === value
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {PRICING_UNIT_LABELS[unit]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Add custom service input
// ---------------------------------------------------------------------------

function AddServiceInput({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-dashed px-4 py-3",
        "border-border/40 bg-card/20",
        "focus-within:border-primary/40 focus-within:bg-primary/5",
        "transition-colors",
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
          "border-2 border-dashed border-muted-foreground/25",
        )}
      >
        <Plus className="h-3 w-3 text-muted-foreground/50" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder="Add a custom service..."
        className={cn(
          "flex-1 bg-transparent text-sm text-foreground",
          "placeholder:text-muted-foreground/40",
          "focus:outline-none",
        )}
      />

      <AnimatePresence>
        {value.trim() && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={SPRING_FAST}
            type="button"
            onClick={onAdd}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-lg px-3",
              "bg-primary text-primary-foreground text-xs font-medium",
              "hover:bg-primary/90 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            Add
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
