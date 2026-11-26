import { DocumentFileIcon, ImageIcon, VideoIcon } from "@/app/components/icons";
import type { PromptFieldType } from "@/app/lib/types/assessment";

export default function RenderFieldType({
  type,
  className,
  textLabel = "Aa",
}: {
  type: PromptFieldType;
  className: string;
  textLabel?: string;
}) {
  if (type === "text") {
    return (
      <span className="font-sans text-[11px] font-semibold">{textLabel}</span>
    );
  }
  if (type === "image") return <ImageIcon className={className} />;
  if (type === "video") return <VideoIcon className={className} />;
  return <DocumentFileIcon className={className} />;
}
