"use client";

import { useState, useEffect, useCallback } from "react";
import SettingsSidebar from "@/app/components/settings/SettingsSidebar";
import PageHeader from "@/app/components/PageHeader";
import { useAuth } from "@/app/lib/context/AuthContext";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import {
  OnboardingForm,
  OnboardingSuccess,
  OrganizationList,
  ProjectList,
  StepIndicator,
  UserList,
  OnboardingCredentials,
} from "@/app/components/settings/onboarding";
import {
  Organization,
  Project,
  ProjectListResponse,
  OnboardResponseData,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";
import { ArrowLeftIcon } from "@/app/components/icons";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";
import TabNavigation from "@/app/components/TabNavigation";

const PROJECT_TABS = [
  { id: "users", label: "Users" },
  { id: "credentials", label: "Credentials" },
];

type View = "loading" | "list" | "projects" | "users" | "form" | "success";

function OrganizationListSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-5 w-36 bg-neutral-200 rounded mb-2" />
          <div className="h-3 w-24 bg-neutral-100 rounded" />
        </div>
        <div className="h-9 w-40 bg-neutral-200 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-white"
          >
            <div>
              <div className="h-4 w-40 bg-neutral-200 rounded mb-2" />
              <div className="h-3 w-28 bg-neutral-100 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-14 bg-neutral-100 rounded" />
              <div className="h-4 w-4 bg-neutral-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { activeKey } = useAuth();
  const [view, setView] = useState<View>("loading");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [onboardData, setOnboardData] = useState<OnboardResponseData | null>(
    null,
  );
  const [activeProjectTab, setActiveProjectTab] = useState("users");

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

  const refreshProjects = useCallback(async () => {
    if (!selectedOrg) return;
    try {
      const result = await apiFetch<ProjectListResponse>(
        `/api/organization/${selectedOrg.id}/projects`,
        activeKey?.key ?? "",
      );
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch {
      // keep current list
    }
  }, [selectedOrg, activeKey]);

  const handleSuccess = (data: OnboardResponseData) => {
    setOnboardData(data);
    setView("success");
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setView("users");
  };

  const handleBackToOrgs = () => {
    setSelectedOrg(null);
    setSelectedProject(null);
    setProjects([]);
    setView("list");
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setView("projects");
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-primary">
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Organizations"
            subtitle="Manage organizations, projects, users, and credentials"
          />

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-2xl py-5 px-8">
              {view === "loading" && <OrganizationListSkeleton />}

              {view === "list" && (
                <OrganizationList
                  organizations={organizations}
                  isLoadingMore={isLoadingMore}
                  onNewOrg={() => setView("form")}
                  onSelectOrg={fetchProjects}
                />
              )}

              {view === "projects" && selectedOrg && (
                <ProjectList
                  organization={selectedOrg}
                  projects={projects}
                  isLoading={isLoadingProjects}
                  onBack={handleBackToOrgs}
                  onSelectProject={handleSelectProject}
                  onProjectAdded={refreshProjects}
                />
              )}

              {view === "users" && selectedOrg && selectedProject && (
                <div>
                  <button
                    onClick={handleBackToProjects}
                    className="text-sm text-text-secondary hover:text-text-primary mb-4 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to projects
                  </button>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        {selectedProject.name}
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {selectedOrg.name}
                      </p>
                    </div>
                  </div>

                  <TabNavigation
                    tabs={PROJECT_TABS}
                    activeTab={activeProjectTab}
                    onTabChange={setActiveProjectTab}
                  />

                  {activeProjectTab === "users" && (
                    <UserList
                      organization={selectedOrg}
                      project={selectedProject}
                      onBack={handleBackToProjects}
                      hideHeader
                    />
                  )}

                  {activeProjectTab === "credentials" && (
                    <OnboardingCredentials
                      organizationId={selectedOrg.id}
                      projectId={selectedProject.id}
                    />
                  )}
                </div>
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
