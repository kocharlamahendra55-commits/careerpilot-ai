"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  Eye,
  Plus,
  Send,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  addRequiredSkillTag,
  createJobFormState,
  createJobFormStateFromPersistedJob,
  parseRequiredSkills,
  planJobSaveDisclosures,
  removeRequiredSkillTag,
  type JobFormState,
} from "@/features/recruiter-workspace/job-form";
import {
  createJobCreateSaveRequestPlan,
  createJobUpdateSaveRequestPlan,
  type JobSaveRequestPlan,
} from "@/features/recruiter-workspace/job-requests";
import {
  createDraftAutoSaveState,
  getDraftAutoSaveAvailability,
  reduceDraftAutoSaveState,
  resolveDraftAutoSaveFailure,
  resolveDraftAutoSaveSuccess,
  startQueuedDraftAutoSave,
  type DraftAutoSaveState,
} from "@/features/recruiter-workspace/job-save-state";
import { getRecruiterJobFromResponse, readWorkspaceJsonSafely } from "@/features/recruiter-workspace/job-response";
import {
  createMutationErrorState,
  createMutationState,
  createSavedMutationState,
  createSavingMutationState,
  createValidatingMutationState,
  type MutationState,
} from "@/features/recruiter-workspace/resource-state";
import { serializeWorkspaceRequest } from "@/features/recruiter-workspace/request-intents";
import {
  isJobLifecycleStatus,
  type JobLifecycleStatus,
  type RecruiterJob,
  type SupportedJobWriteField,
} from "@/features/recruiter-workspace/types";
import { cn } from "@/lib/utils";
import { FieldPersistenceNotice } from "./FieldPersistenceNotice";
import { JobPreview } from "./JobPreview";
import { JobSaveFeedback } from "./JobSaveFeedback";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";

export type JobFormMode = "create" | "edit";

export interface JobFormProps {
  mode: JobFormMode;
  initialForm: JobFormState;
  /** Required for edit mode and deliberately absent for unsaved create forms. */
  jobId?: string;
  /** The exact source-backed status read by the edit route. */
  sourceStatus?: JobLifecycleStatus | null;
  className?: string;
}

type ReadyJobSavePlan = Extract<JobSaveRequestPlan, { kind: "ready" }>;

interface ExplicitSaveAttempt {
  readonly plan: ReadyJobSavePlan;
  readonly form: JobFormState;
  readonly revision: number;
}

const AUTO_SAVE_DELAY_MS = 700;

const controlClassName =
  "mt-2 block w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-brand-purple/70 focus:ring-2 focus:ring-brand-purple/35 disabled:cursor-not-allowed disabled:opacity-55";

const localFieldNoticeClassName = "mt-2";

/**
 * The client-only Job Posting editor. It accepts only a full form model and
 * executes requests exclusively through the closed recruiter job intent layer.
 */
export function JobForm({
  mode,
  initialForm,
  jobId,
  sourceStatus = null,
  className,
}: JobFormProps) {
  const initialAutoSaveState = useMemo(
    () =>
      createDraftAutoSaveState({
        form: initialForm,
        persistedJobId: mode === "edit" ? jobId ?? null : null,
        sourceStatus: mode === "edit" ? sourceStatus : null,
      }),
    [initialForm, jobId, mode, sourceStatus]
  );
  const autoSaveStateRef = useRef<DraftAutoSaveState>(initialAutoSaveState);
  const [autoSaveState, setAutoSaveState] = useState<DraftAutoSaveState>(
    initialAutoSaveState
  );
  const [explicitMutation, setExplicitMutation] = useState<MutationState>(
    createMutationState
  );
  const [failedExplicitAttempt, setFailedExplicitAttempt] =
    useState<ExplicitSaveAttempt | null>(null);
  const [isExplicitSaving, setIsExplicitSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [createdJob, setCreatedJob] = useState<RecruiterJob | null>(null);
  const explicitSavingRef = useRef(false);
  const formRevisionRef = useRef(0);

  const commitAutoSaveState = useCallback((next: DraftAutoSaveState) => {
    autoSaveStateRef.current = next;
    setAutoSaveState(next);
  }, []);

  useEffect(() => {
    // The edit route supplies a new initial object only after its owned-job GET
    // succeeds. Resetting here cannot populate stale values over a different ID.
    formRevisionRef.current = 0;
    explicitSavingRef.current = false;
    setIsExplicitSaving(false);
    setExplicitMutation(createMutationState());
    setFailedExplicitAttempt(null);
    setSkillInput("");
    setCreatedJob(null);
    commitAutoSaveState(initialAutoSaveState);
  }, [commitAutoSaveState, initialAutoSaveState]);

  const form = autoSaveState.form;
  const isFieldLocked = isExplicitSaving || createdJob !== null;
  const autoSaveAvailability = getDraftAutoSaveAvailability(autoSaveState);
  const disclosurePlan = useMemo(() => planJobSaveDisclosures(form), [form]);

  const changeForm = useCallback(
    (nextForm: JobFormState) => {
      if (createdJob || explicitSavingRef.current) {
        return;
      }

      const nextState = reduceDraftAutoSaveState(autoSaveStateRef.current, {
        type: "form-changed",
        form: nextForm,
      });
      formRevisionRef.current += 1;
      setExplicitMutation(createMutationState());
      setFailedExplicitAttempt(null);
      commitAutoSaveState(nextState);
    },
    [commitAutoSaveState, createdJob]
  );

  const executeAutoSave = useCallback(
    async (
      request: NonNullable<DraftAutoSaveState["inFlight"]>["request"],
      requestToken: number
    ) => {
      try {
        const fetchRequest = serializeWorkspaceRequest(request);
        const response = await fetch(fetchRequest.url, fetchRequest.init);
        const body = await readWorkspaceJsonSafely(response);
        const current = autoSaveStateRef.current;

        if (!response.ok) {
          const failed = resolveDraftAutoSaveFailure(
            current,
            requestToken,
            body,
            "Unable to auto-save this draft."
          );
          if (failed !== current) {
            commitAutoSaveState(failed);
          }
          return;
        }

        const returnedJob = getRecruiterJobFromResponse(body);
        const expectedEditJobId = typeof jobId === "string" ? jobId.trim() : "";
        if (
          mode === "edit" &&
          (returnedJob === null ||
            expectedEditJobId.length === 0 ||
            current.persistedJobId !== expectedEditJobId ||
            returnedJob.id !== expectedEditJobId ||
            returnedJob.id !== current.persistedJobId)
        ) {
          const failed = resolveDraftAutoSaveFailure(
            current,
            requestToken,
            {
              error:
                returnedJob === null
                  ? "The job service returned an incomplete draft record."
                  : "The job service returned a different job record.",
            },
            "Unable to auto-save this draft."
          );
          if (failed !== current) {
            commitAutoSaveState(failed);
          }
          return;
        }

        const resolved = resolveDraftAutoSaveSuccess(current, requestToken, body);
        if (resolved !== current) {
          commitAutoSaveState(resolved);
        }
      } catch {
        const current = autoSaveStateRef.current;
        const failed = resolveDraftAutoSaveFailure(
          current,
          requestToken,
          null,
          "Unable to auto-save this draft. Check your connection and try again."
        );
        if (failed !== current) {
          commitAutoSaveState(failed);
        }
      }
    },
    [commitAutoSaveState, jobId, mode]
  );

  const queuedRevision = autoSaveState.queued?.supportedRevision ?? null;
  const inFlightRequestToken = autoSaveState.inFlight?.requestToken ?? null;

  useEffect(() => {
    if (
      mode !== "edit" ||
      isExplicitSaving ||
      autoSaveState.feedback.phase === "error" ||
      autoSaveState.queued === null ||
      autoSaveState.inFlight !== null
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (explicitSavingRef.current) {
        return;
      }

      const started = startQueuedDraftAutoSave(autoSaveStateRef.current);
      if (!started.request || !started.state.inFlight) {
        return;
      }

      commitAutoSaveState(started.state);
      void executeAutoSave(
        started.state.inFlight.request,
        started.state.inFlight.requestToken
      );
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    autoSaveState.feedback.phase,
    autoSaveState.inFlight,
    autoSaveState.queued,
    commitAutoSaveState,
    executeAutoSave,
    inFlightRequestToken,
    isExplicitSaving,
    mode,
    queuedRevision,
  ]);

  const executeExplicitAttempt = useCallback(
    async (attempt: ExplicitSaveAttempt) => {
      const action = mode === "create" ? "Job creation" : "Job update";
      const fallbackMessage =
        mode === "create" ? "Unable to create this job." : "Unable to save this job.";
      const stateWithoutQueuedAutoSave = reduceDraftAutoSaveState(
        autoSaveStateRef.current,
        { type: "clear-queued" }
      );

      if (stateWithoutQueuedAutoSave !== autoSaveStateRef.current) {
        commitAutoSaveState(stateWithoutQueuedAutoSave);
      }

      explicitSavingRef.current = true;
      setIsExplicitSaving(true);
      setFailedExplicitAttempt(null);
      setExplicitMutation(createSavingMutationState(action));

      try {
        const fetchRequest = serializeWorkspaceRequest(attempt.plan.request);
        const response = await fetch(fetchRequest.url, fetchRequest.init);
        const body = await readWorkspaceJsonSafely(response);

        if (!response.ok) {
          setExplicitMutation(
            createMutationErrorState(action, body, fallbackMessage)
          );
          setFailedExplicitAttempt(attempt);
          return;
        }

        const returnedJob = getRecruiterJobFromResponse(body);
        if (!returnedJob) {
          setExplicitMutation(
            createMutationErrorState(
              action,
              { error: "The job service returned an incomplete job record." },
              fallbackMessage
            )
          );
          setFailedExplicitAttempt(attempt);
          return;
        }

        const expectedEditJobId = typeof jobId === "string" ? jobId.trim() : "";
        if (
          mode === "edit" &&
          (expectedEditJobId.length === 0 ||
            autoSaveStateRef.current.persistedJobId !== expectedEditJobId ||
            returnedJob.id !== expectedEditJobId)
        ) {
          setExplicitMutation(
            createMutationErrorState(
              action,
              { error: "The job service returned a different job record." },
              fallbackMessage
            )
          );
          setFailedExplicitAttempt(attempt);
          return;
        }

        const returnedFields = getReturnedSupportedFieldNames(returnedJob);

        if (mode === "create") {
          setCreatedJob(returnedJob);
        } else {
          const currentForm = autoSaveStateRef.current.form;
          const baseForm =
            formRevisionRef.current === attempt.revision ? attempt.form : currentForm;
          const returnedForm = createJobFormStateFromReturnedJob(baseForm, returnedJob);
          const returnedSourceStatus = isJobLifecycleStatus(returnedJob.status)
            ? returnedJob.status
            : returnedForm.status;

          commitAutoSaveState(
            createDraftAutoSaveState({
              form: returnedForm,
              persistedJobId: jobId ?? returnedJob.id,
              sourceStatus: returnedSourceStatus,
            })
          );
        }

        setExplicitMutation(createSavedMutationState(action, returnedFields));
      } catch {
        setExplicitMutation(
          createMutationErrorState(
            action,
            null,
            mode === "create"
              ? "Unable to create this job. Check your connection and try again."
              : "Unable to save this job. Check your connection and try again."
          )
        );
        setFailedExplicitAttempt(attempt);
      } finally {
        explicitSavingRef.current = false;
        setIsExplicitSaving(false);
      }
    },
    [commitAutoSaveState, jobId, mode]
  );

  const beginExplicitSave = useCallback(
    (statusOverride?: JobLifecycleStatus) => {
      if (
        createdJob ||
        explicitSavingRef.current ||
        autoSaveStateRef.current.inFlight !== null
      ) {
        return;
      }

      if (mode === "edit" && !jobId?.trim()) {
        setExplicitMutation(
          createMutationErrorState(
            "Job update",
            { error: "A valid job identifier is required before saving." },
            "Unable to save this job."
          )
        );
        return;
      }

      const currentForm = autoSaveStateRef.current.form;
      const formToSave =
        statusOverride && currentForm.status !== statusOverride
          ? withJobFormValues(currentForm, { status: statusOverride })
          : currentForm;

      if (formToSave !== currentForm) {
        const nextState = reduceDraftAutoSaveState(autoSaveStateRef.current, {
          type: "form-changed",
          form: formToSave,
        });
        formRevisionRef.current += 1;
        commitAutoSaveState(nextState);
      }

      const plan =
        mode === "create"
          ? createJobCreateSaveRequestPlan(formToSave)
          : createJobUpdateSaveRequestPlan(jobId ?? "", formToSave);

      if (plan.kind === "invalid") {
        setExplicitMutation(
          createValidatingMutationState(
            plan.validation.fieldErrors.title ?? "Review the job form before saving."
          )
        );
        setFailedExplicitAttempt(null);
        return;
      }

      const attempt: ExplicitSaveAttempt = {
        plan,
        form: formToSave,
        revision: formRevisionRef.current,
      };
      void executeExplicitAttempt(attempt);
    },
    [
      commitAutoSaveState,
      createdJob,
      executeExplicitAttempt,
      jobId,
      mode,
    ]
  );

  const retryExplicitSave = useCallback(() => {
    if (
      !failedExplicitAttempt ||
      explicitSavingRef.current ||
      autoSaveStateRef.current.inFlight !== null
    ) {
      return;
    }

    void executeExplicitAttempt(failedExplicitAttempt);
  }, [executeExplicitAttempt, failedExplicitAttempt]);

  const retryAutoSave = useCallback(() => {
    if (explicitSavingRef.current) {
      return;
    }

    const next = reduceDraftAutoSaveState(autoSaveStateRef.current, {
      type: "retry",
    });
    commitAutoSaveState(next);
  }, [commitAutoSaveState]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    beginExplicitSave();
  };

  const addSkillInput = () => {
    const rawEntries = skillInput
      .split(",")
      .map((value) => stripHtmlTags(value))
      .filter((value) => value.trim());

    if (rawEntries.length === 0) {
      return;
    }

    let nextForm = autoSaveStateRef.current.form;
    for (const entry of rawEntries) {
      nextForm = addRequiredSkillTag(nextForm, entry);
    }

    changeForm(nextForm);
    setSkillInput("");
  };

  const handleSkillKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkillInput();
    }
  };

  const activeMutation =
    explicitMutation.phase !== "idle" ? explicitMutation : autoSaveState.feedback;
  const activeRetry =
    explicitMutation.phase === "error"
      ? retryExplicitSave
      : autoSaveState.feedback.phase === "error"
        ? retryAutoSave
        : undefined;
  const isRetrying = explicitMutation.phase === "saving";
  const titleError =
    explicitMutation.phase === "validating" ? explicitMutation.message : null;
  const autoSaveMessage = getAutoSaveMessage(mode, autoSaveAvailability.reason, autoSaveState);

  return (
    <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]", className)}>
      <div className="min-w-0 space-y-6">
        <Card variant="flat" className="border-brand-cyan/15 bg-brand-cyan/[0.035]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan-light">
              <Sparkles aria-hidden="true" size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">A truthful posting workspace</h2>
              <p className="mt-1 text-sm leading-6 text-white/60">
                Build the complete brief here. The current job service persists only the
                fields identified below.
              </p>
            </div>
          </div>
          <FieldPersistenceNotice kind="supported-fields" className="mt-4" />
        </Card>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Card>
            <CardHeader className="items-start gap-3">
              <div>
                <CardTitle>Role details</CardTitle>
                <p className="mt-1.5 text-sm leading-6 text-white/50">
                  Source-backed fields are saved through the existing recruiter job API.
                </p>
              </div>
              <Tags aria-hidden="true" size={18} className="ml-auto shrink-0 text-brand-purple-light" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label htmlFor="job-title" className="text-sm font-medium text-white/85">
                  Job title <span aria-hidden="true" className="text-red-300">*</span>
                </label>
                <input
                  id="job-title"
                  name="title"
                  value={form.title}
                  onChange={(event) =>
                    changeForm(
                      withJobFormValues(autoSaveStateRef.current.form, {
                        title: event.target.value,
                      })
                    )
                  }
                  disabled={isFieldLocked}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? "job-title-error" : "job-title-help"}
                  className={cn(
                    controlClassName,
                    titleError && "border-red-300/70 focus:border-red-300 focus:ring-red-300/25"
                  )}
                  placeholder="e.g. Senior Product Designer"
                />
                {titleError ? (
                  <p id="job-title-error" role="alert" className="mt-2 text-sm text-red-200">
                    {titleError}
                  </p>
                ) : (
                  <p id="job-title-help" className="mt-2 text-xs leading-5 text-white/45">
                    A title is required. Leading and trailing whitespace is removed when saved.
                  </p>
                )}
              </div>

              <div>
                <span className="text-sm font-medium text-white/85">Company</span>
                <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80">
                  {form.companyDisplay ? (
                    form.companyDisplay
                  ) : (
                    <UnavailabilityIndicator
                      dependency="D2"
                      message="Company display is unavailable from the current recruiter profile."
                    />
                  )}
                </div>
                <FieldPersistenceNotice kind="company" className="mt-2" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  id="job-location"
                  label="Location"
                  value={form.location}
                  disabled={isFieldLocked}
                  placeholder="e.g. Bengaluru, India"
                  onChange={(value) =>
                    changeForm(
                      withJobFormValues(autoSaveStateRef.current.form, { location: value })
                    )
                  }
                />
                <TextField
                  id="job-salary"
                  label="Salary"
                  value={form.salary}
                  disabled={isFieldLocked}
                  placeholder="e.g. ₹18–24 LPA"
                  onChange={(value) =>
                    changeForm(
                      withJobFormValues(autoSaveStateRef.current.form, { salary: value })
                    )
                  }
                />
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-white/85">Posting status</legend>
                <p id="job-status-help" className="mt-1 text-xs leading-5 text-white/45">
                  Status is saved by the current job service. Publishing uses the same supported
                  create or update contract.
                </p>
                <select
                  id="job-status"
                  name="status"
                  value={form.status}
                  disabled={isFieldLocked}
                  aria-describedby="job-status-help"
                  onChange={(event) => {
                    const selectedStatus = event.target.value;
                    if (!isJobLifecycleStatus(selectedStatus)) {
                      return;
                    }
                    changeForm(
                      withJobFormValues(autoSaveStateRef.current.form, {
                        status: selectedStatus,
                      })
                    );
                  }}
                  className={controlClassName}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="items-start gap-3">
              <div>
                <CardTitle>Requirements and description</CardTitle>
                <p className="mt-1.5 text-sm leading-6 text-white/50">
                  Required skills are serialized in the supported requirements field. The composer
                  is plain text with a safe, Markdown-like preview.
                </p>
              </div>
              <Eye aria-hidden="true" size={18} className="ml-auto shrink-0 text-brand-cyan-light" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label htmlFor="required-skill-input" className="text-sm font-medium text-white/85">
                  Required skills
                </label>
                <p id="required-skills-help" className="mt-1 text-xs leading-5 text-white/45">
                  Add a skill with Enter, a comma, or the Add button. Tags are saved through the
                  supported requirements field.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="required-skill-input"
                    value={skillInput}
                    disabled={isFieldLocked}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    aria-describedby="required-skills-help"
                    className={cn(controlClassName, "mt-0 min-w-0 flex-1")}
                    placeholder="e.g. Figma, React, user research"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addSkillInput}
                    disabled={isFieldLocked || !skillInput.trim()}
                    className="shrink-0"
                  >
                    <Plus aria-hidden="true" size={16} strokeWidth={2} />
                    Add skill
                  </Button>
                </div>
                {form.requiredSkills.length > 0 ? (
                  <ul aria-label="Required skills" className="mt-3 flex flex-wrap gap-2">
                    {form.requiredSkills.map((skill) => (
                      <li key={skill}>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-cyan/25 bg-brand-cyan/[0.08] px-2.5 py-1.5 text-sm text-cyan-50">
                          {skill}
                          <button
                            type="button"
                            disabled={isFieldLocked}
                            onClick={() =>
                              changeForm(
                                removeRequiredSkillTag(autoSaveStateRef.current.form, skill)
                              )
                            }
                            aria-label={`Remove ${skill} from required skills`}
                            className="rounded-sm text-cyan-100/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X aria-hidden="true" size={15} strokeWidth={2.2} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div>
                <label htmlFor="job-description" className="text-sm font-medium text-white/85">
                  Description
                </label>
                <textarea
                  id="job-description"
                  name="description"
                  rows={10}
                  value={form.description}
                  disabled={isFieldLocked}
                  onChange={(event) =>
                    changeForm(
                      withJobFormValues(autoSaveStateRef.current.form, {
                        description: stripHtmlTags(event.target.value),
                      })
                    )
                  }
                  aria-describedby="job-description-help"
                  className={cn(controlClassName, "min-h-52 resize-y leading-6")}
                  placeholder={"Describe the role, responsibilities, and qualifications.\n\nUse # for a short heading or - for a bullet point."}
                />
                <p id="job-description-help" className="mt-2 text-xs leading-5 text-white/45">
                  This is a plain-text composer. HTML tags are removed, never rendered, and never
                  stored as rich HTML.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Additional role context</CardTitle>
                <p className="mt-1.5 text-sm leading-6 text-white/50">
                  These requested fields stay in this browser form only because the current job
                  contract cannot store them.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="employment-type" className="text-sm font-medium text-white/85">
                    Employment type
                  </label>
                  <select
                    id="employment-type"
                    value={form.employmentType}
                    disabled={isFieldLocked}
                    onChange={(event) =>
                      changeForm(
                        withJobFormValues(autoSaveStateRef.current.form, {
                          employmentType: event.target.value,
                        })
                      )
                    }
                    className={controlClassName}
                  >
                    <option value="">Select employment type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                  <FieldPersistenceNotice
                    kind="local-only"
                    fieldLabel="Employment type"
                    className={localFieldNoticeClassName}
                  />
                </div>

                <div>
                  <label htmlFor="experience-level" className="text-sm font-medium text-white/85">
                    Experience
                  </label>
                  <select
                    id="experience-level"
                    value={form.experience}
                    disabled={isFieldLocked}
                    onChange={(event) =>
                      changeForm(
                        withJobFormValues(autoSaveStateRef.current.form, {
                          experience: event.target.value,
                        })
                      )
                    }
                    className={controlClassName}
                  >
                    <option value="">Select experience level</option>
                    <option value="Entry level">Entry level</option>
                    <option value="Mid level">Mid level</option>
                    <option value="Senior level">Senior level</option>
                    <option value="Lead / manager">Lead / manager</option>
                  </select>
                  <FieldPersistenceNotice
                    kind="local-only"
                    fieldLabel="Experience"
                    className={localFieldNoticeClassName}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-white/85">Work arrangement</legend>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Choose Remote, Hybrid, or Onsite for this local draft context.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Work arrangement">
                  {(["Remote", "Hybrid", "Onsite"] as const).map((arrangement) => (
                    <label
                      key={arrangement}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
                        form.workArrangement === arrangement
                          ? "border-brand-purple/50 bg-brand-purple/10 text-white"
                          : "border-white/10 bg-black/15 text-white/70 hover:border-white/25",
                        isFieldLocked && "cursor-not-allowed opacity-55"
                      )}
                    >
                      <input
                        type="radio"
                        name="work-arrangement"
                        value={arrangement}
                        checked={form.workArrangement === arrangement}
                        disabled={isFieldLocked}
                        onChange={() =>
                          changeForm(
                            withJobFormValues(autoSaveStateRef.current.form, {
                              workArrangement: arrangement,
                            })
                          )
                        }
                        className="h-4 w-4 accent-violet-500"
                      />
                      <span>{arrangement}</span>
                    </label>
                  ))}
                </div>
                <FieldPersistenceNotice
                  kind="local-only"
                  fieldLabel="Work arrangement"
                  className={localFieldNoticeClassName}
                />
              </fieldset>

              <div>
                <label htmlFor="job-benefits" className="text-sm font-medium text-white/85">
                  Benefits
                </label>
                <textarea
                  id="job-benefits"
                  rows={4}
                  value={form.benefits}
                  disabled={isFieldLocked}
                  onChange={(event) =>
                    changeForm(
                      withJobFormValues(autoSaveStateRef.current.form, {
                        benefits: event.target.value,
                      })
                    )
                  }
                  className={cn(controlClassName, "resize-y leading-6")}
                  placeholder="e.g. Health coverage, learning budget, flexible hours"
                />
                <FieldPersistenceNotice
                  kind="local-only"
                  fieldLabel="Benefits"
                  className={localFieldNoticeClassName}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Save this posting</p>
                  <p className="mt-1 text-sm leading-6 text-white/50">{autoSaveMessage}</p>
                </div>
                {mode === "edit" && autoSaveState.inFlight ? (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-brand-purple/25 bg-brand-purple/[0.08] px-2.5 py-1.5 text-xs font-medium text-brand-purple-light">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-purple-light motion-reduce:animate-none" />
                    Auto-saving draft
                  </span>
                ) : null}
              </div>

              <JobSaveFeedback
                mutation={activeMutation}
                disclosures={disclosurePlan}
                onRetry={activeRetry}
                isRetrying={isRetrying}
              />

              {createdJob ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-emerald-300/25 bg-emerald-400/[0.06] p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-50">
                    <Check aria-hidden="true" size={17} strokeWidth={2.2} />
                    This job now has a persisted source record.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-50/75">
                    Continue in the saved job route to view or edit source-backed values. Local-only
                    form context remains intentionally unsaved.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/recruiter/jobs/${encodeURIComponent(createdJob.id)}`}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      View saved job
                    </Link>
                    <Link
                      href={`/recruiter/jobs/${encodeURIComponent(createdJob.id)}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Edit saved job
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => beginExplicitSave("DRAFT")}
                    disabled={isExplicitSaving || autoSaveState.inFlight !== null}
                  >
                    <Archive aria-hidden="true" size={16} strokeWidth={2} />
                    Save draft
                  </Button>
                  <Button
                    type="submit"
                    loading={isExplicitSaving}
                    disabled={autoSaveState.inFlight !== null}
                  >
                    <Check aria-hidden="true" size={16} strokeWidth={2} />
                    Save {formatStatusLabel(form.status)}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => beginExplicitSave("PUBLISHED")}
                    disabled={isExplicitSaving || autoSaveState.inFlight !== null}
                  >
                    <Send aria-hidden="true" size={16} strokeWidth={2} />
                    Publish now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <JobPreview form={form} />
      </aside>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-white/85">
        {label}
      </label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={controlClassName}
        placeholder={placeholder}
      />
    </div>
  );
}

function withJobFormValues(
  form: JobFormState,
  values: Partial<
    Pick<
      JobFormState,
      | "title"
      | "location"
      | "employmentType"
      | "experience"
      | "salary"
      | "requiredSkills"
      | "description"
      | "benefits"
      | "workArrangement"
      | "status"
    >
  >
): JobFormState {
  return createJobFormState({
    title: values.title ?? form.title,
    companyDisplay: form.companyDisplay,
    location: values.location ?? form.location,
    employmentType: values.employmentType ?? form.employmentType,
    experience: values.experience ?? form.experience,
    salary: values.salary ?? form.salary,
    requiredSkills: values.requiredSkills ?? form.requiredSkills,
    description: values.description ?? form.description,
    benefits: values.benefits ?? form.benefits,
    workArrangement: values.workArrangement ?? form.workArrangement,
    status: values.status ?? form.status,
  });
}

function createJobFormStateFromReturnedJob(
  priorForm: JobFormState,
  returnedJob: RecruiterJob
): JobFormState {
  return createJobFormState({
    title: returnedJob.title,
    companyDisplay: returnedJob.company,
    location: returnedJob.location,
    employmentType: priorForm.employmentType,
    experience: priorForm.experience,
    salary: returnedJob.salary,
    requiredSkills: parseRequiredSkills(returnedJob.requirements),
    description: returnedJob.description,
    benefits: priorForm.benefits,
    workArrangement: priorForm.workArrangement,
    status: isJobLifecycleStatus(returnedJob.status)
      ? returnedJob.status
      : priorForm.status,
  });
}

function getReturnedSupportedFieldNames(
  job: RecruiterJob
): readonly SupportedJobWriteField[] {
  const returned: SupportedJobWriteField[] = [
    "title",
    "description",
    "location",
    "salary",
    "requirements",
  ];

  if (isJobLifecycleStatus(job.status)) {
    returned.push("status");
  }

  return Object.freeze(returned);
}

function getAutoSaveMessage(
  mode: JobFormMode,
  reason: ReturnType<typeof getDraftAutoSaveAvailability>["reason"],
  state: DraftAutoSaveState
): string {
  if (mode === "create") {
    return "Auto-save is unavailable until this job has been created as a persisted draft.";
  }

  if (state.inFlight) {
    return "Saving the latest supported draft fields. You can keep editing while this request finishes.";
  }

  switch (reason) {
    case null:
      return "Draft auto-save is ready for supported-field changes. Employment type, experience, work arrangement, and benefits remain local only.";
    case "not-draft":
      return "Auto-save is unavailable because only persisted Draft jobs can be auto-saved.";
    case "title-required":
      return "Auto-save is unavailable until the job title contains non-whitespace text.";
    case "not-persisted":
    default:
      return "Auto-save is unavailable until this job has a persisted Draft record.";
  }
}

function formatStatusLabel(status: JobLifecycleStatus): string {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "PUBLISHED":
      return "published job";
    case "ARCHIVED":
      return "archived job";
  }
}

/** Removes tag-like markup before it can become description rich-text storage. */
function stripHtmlTags(value: string): string {
  return value.replace(/<\/?[a-zA-Z][^>\r\n]*>/g, "");
}
