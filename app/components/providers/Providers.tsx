"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastProvider } from "@/app/components/ui";
import { AuthProvider } from "@/app/lib/context/AuthContext";
import { AppProvider } from "@/app/lib/context/AppContext";
import { useModelSchemas } from "@/app/hooks/useModelSchemas";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function ModelSchemaLoader() {
  useModelSchemas();
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <ModelSchemaLoader />
            {children}
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}
