"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { JobForm } from "@/components/recruiter/workspace/JobForm";
import {
  ErrorState,
  LoadingSkeleton,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/recruiter/workspace";
import { buttonVariants } from "@/components/ui/Button";
import { createJobFormState } from "@/features/recruiter-workspace/job-form";
import { useAuth } from "@/contexts/AuthContext";

export default function NewRecruiterJobPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [loading, user]);  // Fixed: removed router from deps

  const companyDisplay = user?.profile?.companyName?.trim() || null;
  const initialForm = useMemo(
    () =>
      createJobFormState({
        companyDisplay,
        status: "DRAFT",
      }),
    [companyDisplay]
  );

  if (loading || !user) {
    return (
      <WorkspacePageShell labelledBy="new-job-heading" maxWidth="wide">
        <WorkspacePageHeader
          titleId="new-job-heading"
          eyebrow="Recruiter workspace"
          title="Post a job"
          description="Preparing your job posting workspace."
          breadcrumbs={[{ label: "Recruiter workspace", href: "/recruiter/dashboard" }, { label: "Post a job" }]}
        />
        <LoadingSkeleton label="job posting form" variant="form" rows={7} />
      </WorkspacePageShell>
    );
  }

  if (user.role !== "RECRUITER") {
    return (
      <WorkspacePageShell labelledBy="new-job-heading" maxWidth="compact">
        <WorkspacePageHeader
          titleId="new-job-heading"
          eyebrow="Recruiter workspace"
          title="Post a job"
          breadcrumbs={[{ label: "Recruiter workspace", href: "/recruiter/dashboard" }, { label: "Post a job" }]}
        />
        <ErrorState
          title="Recruiter access is required"
          message="Only recruiter accounts can create job postings."
        />
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell labelledBy="new-job-heading" maxWidth="wide">
      <WorkspacePageHeader
        titleId="new-job-heading"
        eyebrow="Recruiter workspace"
        title="Post a job"
        description="Create a complete job brief while keeping current service persistence limits visible."
        breadcrumbs={[{ label: "Recruiter workspace", href: "/recruiter/dashboard" }, { label: "Post a job" }]}
        actions={
          <Link
            href="/recruiter/dashboard"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Dashboard
          </Link>
        }
      />
      <div className="flex items-center gap-2 text-sm text-white/55">
        <BriefcaseBusiness aria-hidden="true" size={16} className="text-brand-cyan-light" />
        <span>New postings begin as a local form until you save them as a Draft or Published job.</span>
      </div>
      <JobForm mode="create" initialForm={initialForm} />
    </WorkspacePageShell>
  );
}

