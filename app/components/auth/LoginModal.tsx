"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import Modal from "@/app/components/Modal";
import { useAuth, User, GoogleProfile } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
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
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect to server.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 pb-6 text-center">
        <h2 className="text-2xl font-medium text-text-primary">
          Log in or connect
        </h2>
        <p className="text-base text-text-secondary mt-2">
          Sign in to access all features including evaluations, configurations,
          and more.
        </p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        <div className="flex justify-center">
          {isLoggingIn ? (
            <div className="w-full flex items-center justify-center py-3.5 rounded-full border border-border text-sm text-text-secondary">
              Signing in...
            </div>
          ) : (
            <GoogleLogin
              type="standard"
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google login failed.")}
              width="400"
              shape="pill"
              text="continue_with"
              size="large"
              logo_alignment="center"
            />
          )}
        </div>

        <p className="text-center text-[13px] text-text-secondary">
          Want to use an X-API key instead?{" "}
          <button
            onClick={() => {
              onClose();
              router.push("/keystore");
            }}
            className="text-accent-primary hover:underline font-medium cursor-pointer"
          >
            Go to Keystore
          </button>
        </p>
      </div>
    </Modal>
  );
}
