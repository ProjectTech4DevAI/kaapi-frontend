"use client";

import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import Modal from "@/app/components/Modal";
import { Button, Field } from "@/app/components";
import { useAuth, User, GoogleProfile } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { addKey, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    const token = credentialResponse.credential;
    if (!token) {
      toast.error("No credential received from Google.");
      return;
    }

    setIsLoggingIn(true);

    try {
      const data = await apiFetch<{
        access_token: string;
        token_type: string;
        user: User;
        google_profile: GoogleProfile;
      }>("/api/auth/google", "", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      loginWithGoogle(data.access_token, data.user, data.google_profile);

      toast.success("Logged in successfully!");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect to server.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key.");
      return;
    }
    addKey({
      id: crypto.randomUUID(),
      label: "API Key",
      key: apiKey.trim(),
      provider: "default",
      createdAt: new Date().toISOString(),
    });
    toast.success("API key added successfully!");
    setApiKey("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 pb-6 text-center">
        <h2 className="text-2xl font-semibold text-text-primary">
          Log in or connect
        </h2>
        <p className="text-base text-text-secondary mt-2">
          Sign in to access all features including evaluations, configurations,
          and more.
        </p>
      </div>

      <div className="px-6 pb-8 space-y-3">
        {/* Google Login */}
        <div className="flex justify-center">
          {isLoggingIn ? (
            <div className="w-full flex items-center justify-center py-3.5 rounded-full border border-border text-sm text-text-secondary">
              Signing in...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google login failed.")}
              width="400"
              shape="pill"
              text="continue_with"
              size="large"
            />
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-secondary font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* API Key */}
        <div>
          <Field
            label=""
            value={apiKey}
            onChange={setApiKey}
            placeholder="Enter your X-API-KEY"
            type="password"
          />
        </div>

        <Button fullWidth size="lg" onClick={handleApiKeySubmit}>
          Continue
        </Button>
      </div>
    </Modal>
  );
}
