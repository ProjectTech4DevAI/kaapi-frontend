import { FeatureFlag } from "@/app/lib/constants";
import { NavItemConfig, SettingsNavSection } from "@/app/lib/types/nav";

export const SETTINGS_NAV: SettingsNavSection[] = [
  {
    label: "Settings",
    items: [
      { name: "Credentials", route: "/settings/credentials", icon: "key" },
      { name: "Organizations", route: "/settings/onboarding", icon: "sliders" },
    ],
  },
];

export const NAV_ITEMS: NavItemConfig[] = [
  {
    name: "Documents",
    route: "/document",
    icon: "document",
    gateDescription: "Log in to upload and manage your documents.",
  },
  {
    name: "Knowledge Base",
    route: "/knowledge-base",
    icon: "book",
    gateDescription: "Log in to manage your knowledge bases for RAG.",
  },
  {
    name: "Configurations",
    icon: "gear",
    submenu: [
      { name: "Library", route: "/configurations" },
      { name: "Prompt Editor", route: "/configurations/prompt-editor" },
    ],
    gateDescription: "Log in to manage prompts and model configurations.",
  },
  {
    name: "Guardrails",
    route: "/guardrails",
    icon: "shield",
    gateDescription: "Log in to manage guardrails and validators.",
    disabledReason:
      "Guardrails is temporarily disabled. We're making significant backend changes and things aren't in sync yet — it will be re-enabled once everything is aligned. To explore Guardrails, please contact the Kaapi team.",
  },
  {
    name: "Chat",
    route: "/chat",
    icon: "chat",
    gateDescription:
      "Log in to chat with your assistants and keep conversation history.",
  },
  {
    name: "Evaluations",
    icon: "clipboard",
    submenu: [
      { name: "Text", route: "/evaluations" },
      { name: "Speech-to-Text", route: "/speech-to-text" },
      { name: "Text-to-Speech", route: "/text-to-speech" },
    ],
    gateDescription:
      "Log in to compare model response quality across different configs.",
  },
  {
    name: "Assessment",
    route: "/assessment",
    icon: "assessment",
    featureFlag: FeatureFlag.ASSESSMENT,
    gateDescription: "Log in to run assessments.",
  },
  {
    name: "Analytics",
    route: "/analytics",
    icon: "chart",
    gateDescription: "Log in to view the analytics dashboard.",
  },
];
