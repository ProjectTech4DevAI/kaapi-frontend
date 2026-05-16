"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import Modal from "@/app/components/ui/Modal";
import { Button, Field } from "@/app/components/ui";
import { MailIcon } from "@/app/components/icons";
import { useAuth } from "@/app/lib/context/AuthContext";
import { GoogleAuthResponse } from "@/app/lib/types/auth";
import { useToast } from "@/app/components/ui/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import { isValidEmail } from "@/app/lib/utils";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const toast = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

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
      const res = await apiFetch<GoogleAuthResponse>("/api/auth/google", "", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      const { access_token, user, google_profile } = res.data;
      loginWithToken(access_token, user, google_profile);
      onClose();
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : "Failed to connect to server.";
      const message = /no account found/i.test(raw)
        ? "Your Google email isn't assigned to any organization or projects on Kaapi. Please contact Kaapi Support to request access."
        : raw;
      toast.error(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");
    setIsSendingLink(true);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setEmailError(data.error || "Failed to send login link.");
        return;
      }

      setLinkSent(true);
    } catch {
      toast.error("Failed to connect to server. Please try again.");
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setEmailError("");
    setLinkSent(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-md">
      <div className="px-6 pb-4 text-center">
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

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-secondary font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {linkSent ? (
          <div className="text-center py-3">
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
              <MailIcon className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-text-primary">
              Check your email
            </p>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed max-w-xs mx-auto">
              We sent a login link to{" "}
              <span className="font-medium text-text-primary">{email}</span>.
              Click the link in the email to sign in.
            </p>
            <button
              onClick={() => {
                setLinkSent(false);
                setEmail("");
              }}
              className="text-xs text-text-secondary hover:text-text-primary mt-3 transition-colors cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field
              label=""
              type="email"
              value={email}
              onChange={(val) => {
                setEmail(val);
                if (emailError) setEmailError("");
              }}
              placeholder="Email address"
              error={emailError}
              className="rounded-full! px-5! py-3!"
            />
            <Button
              fullWidth
              size="lg"
              onClick={handleSendMagicLink}
              disabled={isSendingLink}
              className="py-3!"
            >
              {isSendingLink ? "Sending..." : "Send login link"}
            </Button>
          </div>
        )}

        {!linkSent && (
          <p className="text-center text-[13px] text-text-secondary">
            Want to use an X-API key instead?{" "}
            <button
              onClick={() => {
                handleClose();
                router.push("/keystore");
              }}
              className="text-accent-primary hover:underline font-medium cursor-pointer"
            >
              Go to Keystore
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
}
