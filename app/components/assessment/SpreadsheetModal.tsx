"use client";

import dynamic from "next/dynamic";
import Loader from "@/app/components/Loader";

const SpreadsheetModalInner = dynamic(() => import("./SpreadsheetModalInner"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Loader size="lg" message="Loading spreadsheet..." />
    </div>
  ),
});

interface SpreadsheetModalProps {
  runId: number;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  onClose: () => void;
}

export default function SpreadsheetModal(props: SpreadsheetModalProps) {
  return <SpreadsheetModalInner {...props} />;
}
