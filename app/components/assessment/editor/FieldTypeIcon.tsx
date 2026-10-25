import { DocumentFileIcon, ImageIcon, VideoIcon } from "@/app/components/icons";
import type { PromptFieldType } from "@/app/lib/types/assessment";

export default function FieldTypeIcon({
  type,
  className,
}: {
  type: PromptFieldType;
  className: string;
}) {
  if (type === "image") return <ImageIcon className={className} />;
  if (type === "video") return <VideoIcon className={className} />;
  return <DocumentFileIcon className={className} />;
}
