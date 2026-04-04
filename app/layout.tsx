import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/Toast";
import { AuthProvider } from "@/app/lib/context/AuthContext";
import { AppProvider } from "@/app/lib/context/AppContext";
import { FeatureFlagProvider } from "./lib/FeatureFlagProvider";
import { getServerFeatureFlags } from "./lib/featureFlags.server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kaapi Konsole",
  description: "",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialFlags = await getServerFeatureFlags();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FeatureFlagProvider initialFlags={initialFlags}>
          <ToastProvider>
            <AuthProvider>
              <AppProvider>{children}</AppProvider>
            </AuthProvider>
          </ToastProvider>
        </FeatureFlagProvider>
      </body>
    </html>
  );
}
