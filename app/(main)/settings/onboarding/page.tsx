"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SettingsSidebar from "@/app/components/settings/SettingsSidebar";
import PageHeader from "@/app/components/PageHeader";
import { useAuth } from "@/app/lib/context/AuthContext";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import {
  DeleteOrganizationModal,
  DeleteProjectModal,
  EditOrganizationModal,
  OnboardingCredentials,
  OnboardingForm,
  OnboardingSuccess,
  OrganizationList,
  ProjectList,
  StepIndicator,
  UserList,
} from "@/app/components/settings/onboarding";
import { useToast } from "@/app/hooks/useToast";
import {
  ActiveStatus,
  Organization,
  Project,
  ProjectListResponse,
  OnboardResponseData,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";
import { ArrowLeftIcon } from "@/app/components/icons";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";
import { TabNavigation } from "@/app/components/ui";

const SEARCH_DEBOUNCE_MS = 300;

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
        <div className="h-9 w-40 bg-neutral-200 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-4 rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 max-w-full bg-neutral-200 rounded mb-2" />
              <div className="h-3 w-28 bg-neutral-100 rounded" />
            </div>
            <div className="h-4 w-4 shrink-0 bg-neutral-100 rounded" />
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
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [orgSearchInput, setOrgSearchInput] = useState("");
  const [debouncedOrgSearch, setDebouncedOrgSearch] = useState("");
  const [projectSearchInput, setProjectSearchInput] = useState("");
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState("");
  const [orgActiveStatus, setOrgActiveStatus] =
    useState<ActiveStatus>("active");
  const [projectActiveStatus, setProjectActiveStatus] =
    useState<ActiveStatus>("active");
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedOrgSearch(orgSearchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [orgSearchInput]);
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedProjectSearch(projectSearchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [projectSearchInput]);

  const orgExtraParams = useMemo(() => {
    const params: Record<string, string> = {
      is_active: orgActiveStatus === "active" ? "true" : "false",
    };
    if (debouncedOrgSearch) params.search = debouncedOrgSearch;
    return params;
  }, [debouncedOrgSearch, orgActiveStatus]);

  const {
    items: organizations,
    isLoading: isLoadingOrgs,
    isLoadingMore,
    hasMore,
    loadMore,
    refetch: refetchOrganizations,
  } = usePaginatedList<Organization>({
    endpoint: "/api/organization",
    limit: DEFAULT_PAGE_LIMIT,
    extraParams: orgExtraParams,
  });

  const scrollRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingOrgs || isLoadingMore,
  });

  const initialOrgViewDecidedRef = useRef(false);
  useEffect(() => {
    if (initialOrgViewDecidedRef.current) return;
    if (isLoadingOrgs) return;
    initialOrgViewDecidedRef.current = true;
    setView(organizations.length > 0 ? "list" : "form");
  }, [isLoadingOrgs, organizations.length]);

  const buildProjectsQuery = (search: string, status: ActiveStatus) => {
    const params = new URLSearchParams({
      is_active: status === "active" ? "true" : "false",
    });
    if (search) params.set("search", search);
    return params.toString();
  };

  const loadProjects = useCallback(
    async (orgId: number, search: string, status: ActiveStatus) => {
      setIsLoadingProjects(true);
      try {
        const qs = buildProjectsQuery(search, status);
        const result = await apiFetch<ProjectListResponse>(
          `/api/organization/${orgId}/projects?${qs}`,
          activeKey?.key ?? "",
        );
        if (result.success && result.data) {
          setProjects(result.data);
        } else {
          setProjects([]);
        }
      } catch {
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    },
    [activeKey],
  );

  const fetchProjects = useCallback(
    async (org: Organization) => {
      setSelectedOrg(org);
      setView("projects");
      setProjectSearchInput("");
      setDebouncedProjectSearch("");
      setProjectActiveStatus("active");
      setProjects([]);
      await loadProjects(org.id, "", "active");
    },
    [loadProjects],
  );

  useEffect(() => {
    if (view !== "projects" || !selectedOrg) return;
    void loadProjects(
      selectedOrg.id,
      debouncedProjectSearch,
      projectActiveStatus,
    );
  }, [
    debouncedProjectSearch,
    projectActiveStatus,
    view,
    selectedOrg,
    loadProjects,
  ]);

  const refreshProjects = useCallback(async () => {
    if (!selectedOrg) return;
    try {
      const qs = buildProjectsQuery(
        debouncedProjectSearch,
        projectActiveStatus,
      );
      const result = await apiFetch<ProjectListResponse>(
        `/api/organization/${selectedOrg.id}/projects?${qs}`,
        activeKey?.key ?? "",
      );
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch {
      // keep current list
    }
  }, [selectedOrg, activeKey, debouncedProjectSearch, projectActiveStatus]);

  const handleSuccess = (data: OnboardResponseData) => {
    setOnboardData(data);
    setView("success");
  };

  const handleOnboardAnother = () => {
    setOnboardData(null);
    setView("form");
  };

  const handleBackToOrgsFromSuccess = () => {
    setOnboardData(null);
    refetchOrganizations();
    setView("list");
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setView("users");
  };

  const handleBackToOrgs = () => {
    setSelectedOrg(null);
    setSelectedProject(null);
    setProjects([]);
    setProjectSearchInput("");
    setDebouncedProjectSearch("");
    setView("list");
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setView("projects");
  };

  const handleConfirmDeleteOrg = async (hardDelete: boolean) => {
    if (!orgToDelete) return;
    setIsDeletingOrg(true);
    try {
      await apiFetch(
        `/api/organization/${orgToDelete.id}`,
        activeKey?.key ?? "",
        {
          method: "DELETE",
          body: JSON.stringify({ hard_delete: hardDelete }),
        },
      );
      toast.success(
        hardDelete
          ? `"${orgToDelete.name}" permanently deleted`
          : `"${orgToDelete.name}" deactivated`,
      );
      setOrgToDelete(null);
      refetchOrganizations();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to delete organization",
      );
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleConfirmDeleteProject = async (hardDelete: boolean) => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    try {
      await apiFetch(
        `/api/project/${projectToDelete.id}`,
        activeKey?.key ?? "",
        {
          method: "DELETE",
          body: JSON.stringify({ hard_delete: hardDelete }),
        },
      );
      toast.success(
        hardDelete
          ? `"${projectToDelete.name}" permanently deleted`
          : `"${projectToDelete.name}" deactivated`,
      );
      setProjectToDelete(null);
      await refreshProjects();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setIsDeletingProject(false);
    }
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
                  isLoading={isLoadingOrgs}
                  isLoadingMore={isLoadingMore}
                  onNewOrg={() => setView("form")}
                  onSelectOrg={fetchProjects}
                  onDeleteOrg={setOrgToDelete}
                  onEditOrg={setOrgToEdit}
                  search={orgSearchInput}
                  onSearchChange={setOrgSearchInput}
                  activeStatus={orgActiveStatus}
                  onActiveStatusChange={setOrgActiveStatus}
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
                  search={projectSearchInput}
                  onSearchChange={setProjectSearchInput}
                  activeStatus={projectActiveStatus}
                  onActiveStatusChange={setProjectActiveStatus}
                  onDeleteProject={setProjectToDelete}
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

                  <OnboardingSuccess
                    data={onboardData}
                    onOnboardAnother={handleOnboardAnother}
                    onBackToList={handleBackToOrgsFromSuccess}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {orgToDelete && (
        <DeleteOrganizationModal
          organization={orgToDelete}
          isDeleting={isDeletingOrg}
          onCancel={() => {
            if (!isDeletingOrg) setOrgToDelete(null);
          }}
          onConfirm={handleConfirmDeleteOrg}
        />
      )}

      {projectToDelete && (
        <DeleteProjectModal
          project={projectToDelete}
          isDeleting={isDeletingProject}
          onCancel={() => {
            if (!isDeletingProject) setProjectToDelete(null);
          }}
          onConfirm={handleConfirmDeleteProject}
        />
      )}

      {orgToEdit && (
        <EditOrganizationModal
          open
          organization={orgToEdit}
          apiKey={activeKey?.key ?? ""}
          onClose={() => setOrgToEdit(null)}
          onOrganizationUpdated={refetchOrganizations}
        />
      )}
    </div>
  );
}
