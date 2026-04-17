"use client";

import { useState, ReactNode } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { FeatureGateModal, LoginModal } from "@/app/components/auth";

interface ProtectedPageProps {
  feature: string;
  description: string;
  children: ReactNode;
}

export default function ProtectedPage({
  feature,
  description,
  children,
}: ProtectedPageProps) {
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <FeatureGateModal
          feature={feature}
          description={description}
          onLogin={() => setShowLoginModal(true)}
        />
        <LoginModal
          open={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}
