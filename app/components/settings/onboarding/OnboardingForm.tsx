"use client";

import { useState } from "react";
import { useToast } from "@/app/components/ui/Toast";
import { Button, Field } from "@/app/components/ui";
import { apiFetch } from "@/app/lib/apiClient";
import { isValidEmail, isValidPassword, isNonEmpty } from "@/app/lib/utils";
import {
  OnboardRequest,
  OnboardResponse,
  OnboardResponseData,
} from "@/app/lib/types/onboarding";
import { useAuth } from "@/app/lib/context/AuthContext";

interface OnboardingFormProps {
  onSuccess: (data: OnboardResponseData) => void;
}

export default function OnboardingForm({ onSuccess }: OnboardingFormProps) {
  const toast = useToast();
  const { activeKey } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<OnboardRequest>({
    organization_name: "",
    project_name: "",
    user_name: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (field: keyof OnboardRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!isNonEmpty(form.organization_name))
      errors.organization_name = "Organization name is required";
    if (!isNonEmpty(form.project_name))
      errors.project_name = "Project name is required";
    if (!isNonEmpty(form.user_name)) errors.user_name = "User name is required";
    if (!isNonEmpty(form.email)) errors.email = "Email is required";
    else if (!isValidEmail(form.email))
      errors.email = "Enter a valid email address";
    if (!form.password) errors.password = "Password is required";
    else if (!isValidPassword(form.password))
      errors.password = "Password must be at least 8 characters";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await apiFetch<OnboardResponse>(
        "/api/onboard",
        activeKey?.key,
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );

      if (!result.success || !result.data) {
        if (result.errors && result.errors.length > 0) {
          const errors: Record<string, string> = {};
          result.errors.forEach((err) => {
            errors[err.field] = err.message;
          });
          setFieldErrors(errors);
        }
        toast.error(result.error || "Onboarding failed. Please try again.");
        return;
      }

      toast.success("Onboarding completed successfully!");
      onSuccess(result.data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect to server.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Organization
          </h3>
          <Field
            label="Organization Name"
            value={form.organization_name}
            onChange={(v) => update("organization_name", v)}
            placeholder="e.g. Acme Corp"
            error={fieldErrors.organization_name}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Project
          </h3>
          <Field
            label="Project Name"
            value={form.project_name}
            onChange={(v) => update("project_name", v)}
            placeholder="e.g. Main Project"
            error={fieldErrors.project_name}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Admin User
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Full Name"
            value={form.user_name}
            onChange={(v) => update("user_name", v)}
            placeholder="e.g. John Doe"
            error={fieldErrors.user_name}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            placeholder="e.g. admin@acme.com"
            error={fieldErrors.email}
          />
          <div className="md:col-span-2">
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => update("password", v)}
              placeholder="Min. 8 characters"
              error={fieldErrors.password}
            />
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Setting up..." : "Complete Setup"}
      </Button>
    </form>
  );
}
