import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/Toast";
import { AuthProvider } from "@/app/lib/context/AuthContext";
import { AppProvider } from "@/app/lib/context/AppContext";

const jakarta = Plus_Jakarta_Sans({
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
  title: "Kaapi Konsole",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ToastProvider>
          <AuthProvider>
            <AppProvider>{children}</AppProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
