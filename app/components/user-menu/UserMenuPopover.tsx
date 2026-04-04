"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { GearIcon, LogoutIcon } from "@/app/components/icons";
import { User, GoogleProfile } from "@/app/lib/types/auth";

interface UserMenuPopoverProps {
  currentUser: User | null;
  googleProfile: GoogleProfile | null;
  onClose: () => void;
  onLogout: () => void;
}

export default function UserMenuPopover({
  currentUser,
  googleProfile,
  onClose,
  onLogout,
}: UserMenuPopoverProps) {
  const router = useRouter();

  const displayName =
    googleProfile?.name || currentUser?.full_name || currentUser?.email || "";
  const initials = (currentUser?.full_name || currentUser?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl border border-border shadow-lg py-2 z-50">
      <div className="px-4 py-3 flex items-center gap-3">
        {googleProfile?.picture ? (
          <Image
            src={googleProfile.picture}
            alt={googleProfile.name}
            width={36}
            height={36}
            className="rounded-full shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-white">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {displayName}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {currentUser?.email}
          </p>
        </div>
      </div>

      <div className="h-px bg-border mx-2" />

      {currentUser?.is_superuser && (
        <button
          onClick={() => {
            onClose();
            router.push("/settings/onboarding");
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <GearIcon className="w-5 h-5 text-text-secondary" />
          Settings
        </button>
      )}

      <button
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer"
      >
        <LogoutIcon className="w-5 h-5 text-text-secondary" />
        Log out
      </button>
    </div>
  );
}
