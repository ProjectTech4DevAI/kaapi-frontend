"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import {
  OnboardingForm,
  OnboardingSuccess,
  OrganizationList,
  ProjectList,
  StepIndicator,
} from "@/app/components/settings/onboarding";
import {
  Organization,
  Project,
  ProjectListResponse,
  OnboardResponseData,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";
import { colors } from "@/app/lib/colors";
import { ArrowLeftIcon, RefreshIcon } from "@/app/components/icons";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";

type View = "loading" | "list" | "projects" | "form" | "success";

export default function OnboardingPage() {
  const router = useRouter();
  const { sidebarCollapsed } = useApp();
  const { activeKey, currentUser, isHydrated } = useAuth();
  const [view, setView] = useState<View>("loading");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [onboardData, setOnboardData] = useState<OnboardResponseData | null>(
    null,
  );

  const {
    items: organizations,
    isLoading: isLoadingOrgs,
    isLoadingMore,
    hasMore,
    loadMore,
  } = usePaginatedList<Organization>({
    endpoint: "/api/organization",
    limit: DEFAULT_PAGE_LIMIT,
  });

  const scrollRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingOrgs || isLoadingMore,
  });

  useEffect(() => {
    if (isLoadingOrgs) {
      setView("loading");
      return;
    }
    if (view === "loading") {
      setView(organizations.length > 0 ? "list" : "form");
    }
  }, [isLoadingOrgs, organizations.length]);

  // Redirect if no API key or not a superuser
  useEffect(() => {
    if (!isHydrated) return;
    if (!activeKey) {
      router.replace("/");
      return;
    }
    if (currentUser && !currentUser.is_superuser) {
      router.replace("/settings/credentials");
    }
  }, [isHydrated, activeKey, currentUser, router]);

  const fetchProjects = useCallback(
    async (org: Organization) => {
      setSelectedOrg(org);
      setView("projects");
      setIsLoadingProjects(true);
      setProjects([]);

      try {
        const result = await apiFetch<ProjectListResponse>(
          `/api/organization/${org.id}/projects`,
          activeKey?.key ?? "",
        );

        if (result.success && result.data) {
          setProjects(result.data);
        }
      } catch {
        // keep empty list
      } finally {
        setIsLoadingProjects(false);
      }
    },
    [activeKey],
  );

  const handleSuccess = (data: OnboardResponseData) => {
    setOnboardData(data);
    setView("success");
  };

  const handleBackToOrgs = () => {
    setSelectedOrg(null);
    setProjects([]);
    setView("list");
  };

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          activeRoute="/settings/onboarding"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Onboarding"
            subtitle="Manage organizations and set up new projects"
          />

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl py-5 px-8">
              {view === "loading" && (
                <div className="flex items-center justify-center py-20 text-text-secondary">
                  <RefreshIcon className="w-6 h-6 animate-spin" />
                </div>
              )}

              {view === "list" && (
                <OrganizationList
                  organizations={organizations}
                  isLoadingMore={isLoadingMore}
                  onNewOrg={() => setView("form")}
                  onSelectOrg={fetchProjects}
                  scrollRef={scrollRef}
                />
              )}

              {view === "projects" && selectedOrg && (
                <ProjectList
                  organization={selectedOrg}
                  projects={projects}
                  isLoading={isLoadingProjects}
                  onBack={handleBackToOrgs}
                />
              )}

              {view === "form" && (
                <>
                  <div className="flex items-center gap-3 mb-8">
                    <StepIndicator
                      number={1}
                      label="Setup"
                      active
                      completed={false}
                    />
                    <div className="flex-1 h-px bg-border" />
                    <StepIndicator
                      number={2}
                      label="API Key"
                      active={false}
                      completed={false}
                    />
                  </div>

                  {organizations.length > 0 && (
                    <button
                      onClick={() => setView("list")}
                      className="text-sm text-text-secondary hover:text-text-primary mb-6 flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to
                      organizations
                    </button>
                  )}

                  <OnboardingForm onSuccess={handleSuccess} />
                </>
              )}

              {view === "success" && onboardData && (
                <>
                  <div className="flex items-center gap-3 mb-8">
                    <StepIndicator
                      number={1}
                      label="Setup"
                      active={false}
                      completed
                    />
                    <div className="flex-1 h-px bg-border" />
                    <StepIndicator
                      number={2}
                      label="API Key"
                      active
                      completed={false}
                    />
                  </div>

                  <OnboardingSuccess data={onboardData} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
