import { NavItemConfig, SettingsNavSection } from "@/app/lib/types/nav";

export const SETTINGS_NAV: SettingsNavSection[] = [
  {
    label: "Settings",
    items: [
      { name: "Credentials", route: "/settings/credentials", icon: "key" },
      { name: "Onboarding", route: "/settings/onboarding", icon: "sliders" },
    ],
  },
];

export const NAV_ITEMS: NavItemConfig[] = [
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
  },
  {
    name: "Settings",
    route: "/settings/credentials",
    icon: "sliders",
  },
];
