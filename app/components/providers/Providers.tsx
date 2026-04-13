"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastProvider } from "@/app/components/Toast";
import { AuthProvider } from "@/app/lib/context/AuthContext";
import { AppProvider } from "@/app/lib/context/AppContext";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>{children}</AppProvider>
        </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}
