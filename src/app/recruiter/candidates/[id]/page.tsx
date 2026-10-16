"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  CandidateProfile,
  ErrorState,
  LoadingSkeleton,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/recruiter/workspace";
import { buttonVariants } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { readWorkspaceJsonSafely } from "@/features/recruiter-workspace/job-response";
import { serializeWorkspaceRequest } from "@/features/recruiter-workspace/request-intents";
import {
  beginCandidateProfileLoad,
  clearCandidateProfileState,
  createCandidateProfileState,
  resolveCandidateProfileFailure,
  resolveCandidateProfileSuccess,
  CANDIDATE_PROFILE_LOAD_FAILURE_MESSAGE,
  type CandidateProfileResourceState,
} from "@/features/recruiter-workspace/candidate-profile-state";

const CANDIDATES_PATH = "/recruiter/candidates";

interface CandidateProfileResource {
  readonly phase: CandidateProfileResourceState["phase"];
  readonly profile: CandidateProfileResourceState["lastSuccess"];
  readonly errorMessage: string | null;
  readonly reload: () => Promise<void>;
}

/**
 * Owns exactly one reset-safe application-detail GET for the current profile
 * ID. It clears the prior candidate's source values before loading or retrying
 * (via the 7.1 resource), rejects stale/mismatched responses, and never fans
 * out across rows or reuses a different ID's data.
 */
function useCandidateProfile(applicationId: string, enabled: boolean): CandidateProfileResource {
  const resourceRef = useRef<CandidateProfileResourceState>(createCandidateProfileState());
  const [resource, setResource] = useState(resourceRef.current);

  const commit = useCallback((next: CandidateProfileResourceState) => {
    resourceRef.current = next;
    setResource(next);
  }, []);

  const load = useCallback(async () => {
    // Begin always clears the previous candidate's data first, so a new or
    // inaccessible ID can never leave the prior candidate's profile visible.
    const started = beginCandidateProfileLoad(resourceRef.current, applicationId);
    const requestToken = started.requestToken;
    commit(started.state);

    // A blank ID yields a terminal error state with no request to fire.
    if (started.request === null) {
      return;
    }

    try {
      const fetchRequest = serializeWorkspaceRequest(started.request);
      const response = await fetch(fetchRequest.url, fetchRequest.init);
      const body = await readWorkspaceJsonSafely(response);

      // Ignore a superseded completion (ID changed or retry started meanwhile).
      if (resourceRef.current.requestToken !== requestToken) {
        return;
      }

      if (!response.ok) {
        commit(resolveCandidateProfileFailure(resourceRef.current, requestToken, body));
        return;
      }

      // The success resolver projects the body and rejects a malformed envelope
      // or a returned application.id that differs from the requested id.
      commit(resolveCandidateProfileSuccess(resourceRef.current, requestToken, body));
    } catch {
      if (resourceRef.current.requestToken !== requestToken) {
        return;
      }

      commit(
        resolveCandidateProfileFailure(
          resourceRef.current,
          requestToken,
          null,
          "Unable to load this candidate's profile. Check your connection and try again."
        )
      );
    }
  }, [applicationId, commit]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void load();

    return () => {
      // Advancing the token invalidates any outstanding response after an ID
      // change or unmount, without leaking data into another route's state.
      resourceRef.current = clearCandidateProfileState(resourceRef.current);
    };
  }, [enabled, load]);

  return {
    phase: resource.phase,
    profile: resource.lastSuccess,
    errorMessage: resource.errorMessage,
    reload: load,
  };
}

export default function RecruiterCandidateProfilePage() {
  const params = useParams<{ id?: string | string[] }>();
  const applicationId = typeof params?.id === "string" ? params.id : "";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const isRecruiter = Boolean(user) && user?.role === "RECRUITER";
  const enabled = !authLoading && isRecruiter && applicationId.trim().length > 0;

  const { phase, profile, errorMessage, reload } = useCandidateProfile(applicationId, enabled);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user]);  // Fixed: removed router

  const header = (
    <WorkspacePageHeader
      titleId="candidate-profile-heading"
      eyebrow="Recruiter workspace"
      title="Candidate profile"
      description="A source-backed view of this application from the recruiter application service."
      breadcrumbs={[
        { label: "Recruiter workspace", href: "/recruiter/dashboard" },
        { label: "Candidates", href: CANDIDATES_PATH },
        { label: "Candidate profile" },
      ]}
      actions={
        <Link href={CANDIDATES_PATH} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
          Back to candidates
        </Link>
      }
    />
  );

  if (authLoading || !user) {
    return (
      <WorkspacePageShell labelledBy="candidate-profile-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="candidate profile" variant="profile" rows={6} />
      </WorkspacePageShell>
    );
  }

  if (!isRecruiter) {
    return (
      <WorkspacePageShell labelledBy="candidate-profile-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Recruiter access is required"
          message="Only recruiter accounts can review candidate profiles."
        />
      </WorkspacePageShell>
    );
  }

  if (phase === "idle" || phase === "loading" || phase === "refreshing") {
    return (
      <WorkspacePageShell labelledBy="candidate-profile-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="candidate profile" variant="profile" rows={6} />
      </WorkspacePageShell>
    );
  }

  // On failure the 7.1 resource has already cleared prior source sections, so no
  // other candidate's content can remain visible behind the error.
  if (phase === "error" || profile === null) {
    return (
      <WorkspacePageShell labelledBy="candidate-profile-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Candidate profile could not be loaded"
          message={errorMessage ?? CANDIDATE_PROFILE_LOAD_FAILURE_MESSAGE}
          onRetry={reload}
          retryLabel="Retry"
          retryAriaLabel="Retry loading this candidate profile"
        />
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell labelledBy="candidate-profile-heading" maxWidth="wide">
      {header}
      <CandidateProfile profile={profile} />
    </WorkspacePageShell>
  );
}
