import Link from "next/link";
import { EditIcon } from "@/app/components/icons";
import { formatRelativeTime } from "@/app/lib/utils";
import { Chatbot } from "@/app/lib/types/chatbot";

const TH_CLASS =
  "px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary";

const editUrl = (chatbot: Chatbot) => `/chatbot/${chatbot.id}`;

export default function ChatbotList({ chatbots }: { chatbots: Chatbot[] }) {
  return (
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <table className="w-full border-collapse">
        <thead className="bg-bg-secondary">
          <tr className="border-b border-border">
            <th className={TH_CLASS}>Name</th>
            <th className={TH_CLASS}>Last updated</th>
            <th className={TH_CLASS}>Created</th>
            <th className={`${TH_CLASS} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {chatbots.map((chatbot) => (
            <tr
              key={chatbot.id}
              className="border-b border-border last:border-b-0 hover:bg-bg-secondary/60"
            >
              <td className="px-5 py-3">
                <Link
                  href={editUrl(chatbot)}
                  className="inline-block px-2.5 py-1 rounded-md text-sm font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/15"
                >
                  {chatbot.name}
                </Link>
              </td>
              <td className="px-5 py-3 text-sm text-text-primary">
                {formatRelativeTime(chatbot.updated_at)}
              </td>
              <td className="px-5 py-3 text-sm text-text-secondary">
                {formatRelativeTime(chatbot.inserted_at)}
              </td>
              <td className="px-5 py-3 text-right">
                <Link
                  href={editUrl(chatbot)}
                  title="Edit chatbot"
                  aria-label={`Edit ${chatbot.name}`}
                  className="inline-flex p-1.5 rounded-md text-text-primary hover:bg-neutral-100"
                >
                  <EditIcon className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
