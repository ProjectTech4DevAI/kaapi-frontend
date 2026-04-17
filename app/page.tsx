"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshIcon } from "@/app/components/icons";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/evaluations");
  }, [router]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className="animate-pulse text-text-secondary">
          <RefreshIcon className="mx-auto h-12 w-12 mb-4" />
          <p className="text-sm text-[#171717]">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}
