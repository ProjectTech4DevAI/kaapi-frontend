import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/Toast";
import { AuthProvider } from "@/app/lib/context/AuthContext";
import { AppProvider } from "@/app/lib/context/AppContext";
import { FeatureFlagProvider } from "./lib/FeatureFlagProvider";
import { getServerFeatureFlags } from "./lib/featureFlags.server";
import { Providers } from "@/app/components/providers";
import { APP_NAME } from "@/app/lib/constants";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <FeatureFlagProvider initialFlags={initialFlags}>
          <ToastProvider>
            <AuthProvider>
              <AppProvider>{children}</AppProvider>
            </AuthProvider>
          </ToastProvider>
        </FeatureFlagProvider>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
