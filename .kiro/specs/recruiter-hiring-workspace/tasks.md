# Implementation Plan: Recruiter Hiring Workspace

## Overview

Implement the approved Phase 2 recruiter workspace in TypeScript beneath new recruiter workspace routes and components. The work is client-side only and consumes only the verified existing recruiter job and application `GET`/job `POST`/`PUT` operations. It must not modify backend APIs, Prisma/schema, authentication, AI services, student application submission, `src/app/recruiter/dashboard/page.tsx`, `RecruiterHeader`, `KPIStatsCards`, `HiringFunnel`, `CopilotPanel`, or `RecentActivityTimeline`.

Anticipated new client-side code belongs under `src/features/recruiter-workspace/`, `src/components/recruiter/workspace/`, and the new Phase 2 routes under `src/app/recruiter/jobs/` and `src/app/recruiter/candidates/`. Exact filenames may be consolidated only when their responsibilities and test boundaries remain intact. All property tests use TypeScript, Vitest, and an approved exact-pinned `fast-check` development dependency, with at least 100 generated runs per executable property.

## Tasks

- [x] 1. Establish the isolated Phase 2 workspace foundation and reusable presentation primitives
  - [x] 1.1 Create the client-side workspace types, capability configuration, request-intent allowlist, retry snapshot builder, and resource/mutation state helpers.
    - **Anticipated files:** `src/features/recruiter-workspace/types.ts`, `capabilities.ts`, `request-intents.ts`, `retry.ts`, `resource-state.ts`, plus `package.json` and `package-lock.json` only for an approved exact-pinned property-test dependency.
    - Define transport-focused job/application types and allow only the verified operations: unparameterized job collection GET; job detail GET; job create POST; job update PUT; application collection/detail GET. Allow candidate query keys only as specified by the design.
    - Represent the future application-status adapter as an absent (`undefined`) capability boundary. Do not define an application status URL, HTTP method, request body, fetch call, or test-only mutation workaround.
    - Ensure stale-response tokens, safe error extraction, and retry snapshots can retain last successful data where the design requires it.
    - **Acceptance/validation:** unsupported endpoints, query keys, and mutation methods cannot be constructed by the shared request boundary; no protected Phase 1 file is changed.
    - _Requirements: 1.4, 1.6–1.9, 5.1, 8.4–8.5; Dependencies: D1, D5_

  - [x] 1.2 Implement reusable workspace UI primitives using the existing `Card`, `Button`, `Badge`, global dark-mode, and reduced-motion patterns.
    - **Anticipated files:** `src/components/recruiter/workspace/WorkspacePageShell.tsx`, `WorkspacePageHeader.tsx`, `StatusBadge.tsx`, `LoadingSkeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `UnavailabilityIndicator.tsx`, and an optional local barrel export.
    - Give skeleton regions accessible names and `aria-busy`; give errors `role="alert"` with a valid retry callback; make unavailable text visibly distinct from source values; ensure status uses readable text plus a non-color marker/icon.
    - Keep primitives independent of the protected dashboard composition and do not alter existing shared dashboard components.
    - **Acceptance/validation:** primitives support loading, empty, error, source-backed status, and dependency-unavailable states in dark mode without color-only signaling.
    - _Requirements: 1.5, 8.1–8.7, 9.1, 9.3, 9.8–9.9_

  - [ ]* 1.3 Write the request-surface property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/request-intents.property.test.ts`.
    - **Property 1: Approved request surface.** Generate supported read/write intents and verify that each resolves only to an existing allowed recruiter operation, method, path shape, and query/body allowlist; verify that no application status mutation intent can be emitted.
    - Configure at least 100 runs and use request-intent/fetch spies only—never live endpoints.
    - **Validates:** Requirements 1.4.

  - [ ]* 1.4 Add focused component tests for the reusable workspace primitives.
    - **Anticipated file:** `src/components/recruiter/workspace/__tests__/workspace-primitives.test.tsx`.
    - Verify named loading regions, empty next actions limited to Phase 2, safe error/retry semantics, source-text status badges, and distinct dependency/unavailability labels using the repository's Vitest-compatible component-test harness.
    - If a component-test helper is absent, add only an approved exact-pinned development dependency; do not add runtime dependencies or change application behavior.
    - **Validates:** Requirements 8.1–8.7, 9.1, 9.3.

- [x] 2. Implement Job Posting create/edit flows within the existing job contract
  - [x] 2.1 Implement pure job form validation, supported-write serialization, local-only disclosure planning, and draft auto-save eligibility/state reduction.
    - **Anticipated files:** `src/features/recruiter-workspace/job-form.ts`, `job-requests.ts`, `job-save-state.ts`.
    - Trim Job Title for validation/serialization; block blank-after-trim create/update requests; construct a fresh payload with exactly `title`, `description`, `location`, `salary`, `requirements`, and `status`.
    - Keep Company display context and Employment Type, Experience, Skills, and Benefits separate from source-backed write state. Plan explicit D2 notices before success feedback whenever local-only values are entered.
    - Make auto-save eligible only for a persisted `DRAFT` job with a nonblank title and a supported-field change; queue the latest supported snapshot without including local-only fields and retain all form values after failure.
    - **Acceptance/validation:** no object spread or arbitrary form field reaches POST/PUT; new jobs, invalid titles, non-DRAFT jobs, and local-only-only changes never initiate auto-save.
    - _Requirements: 2.2–2.9, 3.1–3.8; Dependencies: D2, D6_

  - [x] 2.2 Build the Job Posting form and isolated create/edit routes with truthful persistence disclosures.
    - **Anticipated files:** `src/components/recruiter/workspace/JobForm.tsx`, `FieldPersistenceNotice.tsx`, `JobSaveFeedback.tsx`, `src/app/recruiter/jobs/new/page.tsx`, `src/app/recruiter/jobs/[id]/edit/page.tsx`.
    - Render all required Job Form fields. Treat Company as recruiter-profile-derived/read-only context and explicitly mark Employment Type, Experience, Skills, and Benefits as local-only under D2.
    - In create mode, submit only the whitelisted POST body after local title validation. In edit mode, load the owned job through `GET /api/recruiter/jobs/[id]` before showing persisted values and submit the same supported-field whitelist through PUT.
    - Surface saving/saved/error feedback from returned supported values only; show the local-only warning before save-success feedback; preserve every entered form field on validation and API failures.
    - Do not edit `RecruiterHeader`, the recruiter layout, dashboard routes, or API handlers.
    - **Acceptance/validation:** invalid title causes visible validation and zero request; unsupported fields are never claimed as saved; a failed create/update leaves all form inputs intact.
    - _Requirements: 1.1–1.5, 2.1–2.11, 3.1–3.8, 8.1–8.7; Dependencies: D2, D6_

  - [ ]* 2.3 Write the invalid-title property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/job-title.property.test.ts`.
    - **Property 2: Invalid-title request exclusion.** Generate whitespace and text title variants across create and update modes; assert blank-after-trim attempts return title-required feedback and emit no POST/PUT intent.
    - Configure at least 100 runs against the pure validator/intent boundary.
    - **Validates:** Requirements 2.2, 2.3, 2.4.

  - [ ]* 2.4 Write the supported job-write serialization and local-only disclosure property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/job-write.property.test.ts`.
    - **Property 3: Supported job-write serialization and local-only disclosure.** Generate all form fields and create/update/eligible auto-save intents; assert the payload has exactly the six Supported Job fields and that Company, Employment Type, Experience, Skills, and Benefits are omitted while entered local-only values produce the D2 disclosure plan.
    - Configure at least 100 runs with pure serialization and feedback-plan assertions.
    - **Validates:** Requirements 2.5–2.9, 3.1, 3.3, 3.4.

  - [ ]* 2.5 Write the draft auto-save eligibility and response-fidelity property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/draft-autosave.property.test.ts`.
    - **Property 4: Draft auto-save eligibility and response fidelity.** Generate ID/status/title/change combinations and mocked PUT outcomes; assert eligibility if and only if the D6 conditions hold, successful responses update only returned supported values, and failures retain the current complete form plus an auto-save ErrorState.
    - Configure at least 100 runs with mocked promises/state reducers and no live PUT calls.
    - **Validates:** Requirements 3.1, 3.2, 3.5–3.8.

  - [ ]* 2.6 Add Job Posting example, component, and representative existing-contract tests.
    - **Anticipated files:** `src/components/recruiter/workspace/__tests__/JobForm.test.tsx`, `src/features/recruiter-workspace/__tests__/job-requests.contract.test.ts`.
    - Cover full field rendering, Company/D2 disclosure text, explicit-save feedback order, representative 400/500 retention, edit-load-before-display behavior, and only the verified job GET/POST/PUT request shapes through controlled mocks or authenticated test fixtures.
    - **Validates:** Requirements 2.1–2.11, 3.1–3.8, 8.3–8.7.

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Manage Jobs local transforms, table, and job lifecycle confirmations
  - [x] 4.1 Implement the deterministic Manage Jobs transform and lifecycle request/result reducer.
    - **Anticipated files:** `src/features/recruiter-workspace/manage-jobs-transform.ts`, `job-lifecycle.ts`.
    - Preserve the last successful unmodified job collection; perform local search over source-backed title/company/location, exact status filtering, stable sorting, page clamping, and local slicing without query parameters or follow-up collection calls.
    - Sort Job, Status, Applications, Created, and Updated deterministically; preserve source order for no sort/equal values; place missing/invalid sort values after valid values in both directions.
    - Map Publish, Archive, and Draft exactly to `PUBLISHED`, `ARCHIVED`, and `DRAFT`; update display state only from the returned job/status and retain prior source state on failure.
    - **Acceptance/validation:** transformed IDs are a stable subset of the fetched collection, with no duplicates; lifecycle payloads never contain application-status operations.
    - _Requirements: 4.3–4.7, 4.9–4.11; Dependencies: D5_

  - [x] 4.2 Build the Manage Jobs controls, desktop/mobile presentation, and lifecycle flow.
    - **Anticipated files:** `src/components/recruiter/workspace/ManageJobsControls.tsx`, `ManageJobsTable.tsx`, `JobLifecycleDialog.tsx`, `src/app/recruiter/jobs/page.tsx`.
    - Load jobs through exactly one unparameterized `GET /api/recruiter/jobs`; render Job, Status, Applications, Created, Updated, and Actions using source-backed row values.
    - Bind search/filter/sort/page controls only to the local transform and visibly disclose that they apply to loaded jobs. Route Edit to the isolated edit page, whose route performs the required owned-job GET before form population.
    - Require an accessible confirmation before a job lifecycle PUT; use returned status only in the StatusBadge. Preserve the last source-backed table when refresh/lifecycle fails, and show a zero-job EmptyState after a successful empty collection.
    - **Acceptance/validation:** controls never send job collection query parameters; lifecycle action sends only a supported job PUT; table rows stay source-backed on errors.
    - _Requirements: 4.1–4.12, 8.1–8.7, 9.1–9.9; Dependencies: D5_

  - [ ]* 4.3 Write the Manage Jobs transform stability and source-fidelity property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/manage-jobs-transform.property.test.ts`.
    - **Property 5: Manage Jobs transform stability and source fidelity.** Generate job collections with optional fields and local control states; verify repeatability, source membership, no duplicate IDs, stable source-order tie resolution, exact status/application-count projection, and selected-page slicing.
    - Configure at least 100 runs against the pure transform.
    - **Validates:** Requirements 4.3–4.7.

  - [ ]* 4.4 Write the job lifecycle result-fidelity property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/job-lifecycle.property.test.ts`.
    - **Property 6: Job lifecycle result fidelity.** Generate persisted jobs and each lifecycle action with mocked PUT success/failure results; assert exact target status mapping, returned-status-only badge updates, and prior source-state retention plus ErrorState on failure.
    - Configure at least 100 runs with mocked PUT behavior.
    - **Validates:** Requirements 4.9–4.11.

  - [ ]* 4.5 Add Manage Jobs example, component, and representative existing-contract tests.
    - **Anticipated files:** `src/components/recruiter/workspace/__tests__/ManageJobsTable.test.tsx`, `src/features/recruiter-workspace/__tests__/manage-jobs.contract.test.ts`.
    - Cover unparameterized initial request, table headers, loading/empty/error-retention states, no-sort ordering, edit navigation/load ordering, lifecycle confirmation behavior, and existing job GET/PUT response handling.
    - **Validates:** Requirements 4.1–4.12, 8.1–8.7.

- [x] 5. Implement Candidate List filtering, returned pagination, page-scoped sorting, and bounded detail enrichment
  - [x] 5.1 Implement candidate query serialization, current-page sorting, source-fidelity row projection, and a same-ID detail-cache state boundary.
    - **Anticipated files:** `src/features/recruiter-workspace/candidate-query.ts`, `candidate-page-sort.ts`, `candidate-row-projection.ts`, `candidate-detail-cache.ts`.
    - Serialize only nonempty `jobId`, `status`, and `search`, plus positive `page` and pageSize clamped to 1–50. Treat response `total`, `page`, and `pageSize` as the pagination authority.
    - Implement stable ascending/descending comparison for Candidate, ATS, Applied Date, Resume, and Status over the retrieved page only; preserve input order for equal values and keep unavailable values after available values in either direction.
    - Give ATS/resume values to a row only from a successful detail cache entry with the same application ID. Do not issue page-wide detail requests, invent values, or use another candidate's cache entry.
    - **Acceptance/validation:** no sort key enters the API request; a list response cannot produce synthetic candidate identity, ATS, filename, date, or status.
    - _Requirements: 5.1, 5.3–5.11; Dependencies: D3, D5_

  - [x] 5.2 Build the Candidate List route, filters, table/mobile cards, pagination, and one-selected-ID detail launcher.
    - **Anticipated files:** `src/app/recruiter/candidates/layout.tsx`, `src/app/recruiter/candidates/page.tsx`, `src/components/recruiter/workspace/CandidateFilters.tsx`, `CandidateTable.tsx`, `CandidateDetailLauncher.tsx`.
    - Scope the new candidate detail cache/provider to the new `/recruiter/candidates` route subtree so it cannot alter the recruiter dashboard. Request the collection only when an accepted filter/page state changes and retain the last successful page after later failures.
    - Render Candidate, ATS, Applied Date, Resume, Status, and Actions. Display full name, then email, then unavailable; show D3 unavailable indicators until matching detail exists; label sorting as page-scoped; include the reusable disabled D1 status-action surface and its ActionFeedback for each source-backed application without adding a mutation path.
    - Make the detail action initiate exactly one detail GET for the selected ID, show row-local loading/error feedback, store only a matching successful result, and then navigate to the profile. Do not fan out requests across visible rows.
    - **Acceptance/validation:** initial list failure has no synthetic rows; returned pagination controls use response metadata; one action cannot enrich a different candidate row.
    - _Requirements: 1.1–1.5, 5.1–5.14, 8.1–8.5, 9.1–9.9; Dependencies: D3, D5_

  - [ ]* 5.3 Write the candidate query and returned-pagination fidelity property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/candidate-query.property.test.ts`.
    - **Property 7: Candidate query and returned-pagination fidelity.** Generate optional filters and out-of-range page values with mocked successful list responses; assert allowlisted query serialization, empty-option omission, page-size bounds, and visible metadata equal to returned `total`, `page`, and `pageSize`.
    - Configure at least 100 runs with pure serialization/projection and mock request spies.
    - **Validates:** Requirements 5.1, 5.8.

  - [ ]* 5.4 Write the candidate-list source-fidelity and same-record enrichment property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/candidate-row-projection.property.test.ts`.
    - **Property 8: Candidate-list source fidelity and same-record detail enrichment.** Generate missing names/emails and matching/nonmatching detail-cache entries; assert candidate fallback precedence, exact matching ATS/resume projection, list-sourced status/date, and required unavailability for every absent/mismatched value.
    - Configure at least 100 runs against pure row projection.
    - **Validates:** Requirements 5.3–5.7.

  - [ ]* 5.5 Write the candidate current-page sort stability and scope property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/candidate-page-sort.property.test.ts`.
    - **Property 9: Candidate-page sort stability and scope.** Generate returned application pages, all supported sort fields/directions, null values, and ties; assert deterministic ordering, ID conservation/no duplicates, stable tie order, unchanged response pagination metadata, and no rows outside the retrieved page.
    - Configure at least 100 runs against the pure page sorter.
    - **Validates:** Requirements 5.9–5.11.

  - [ ]* 5.6 Add Candidate List example, component, and representative existing-contract tests.
    - **Anticipated files:** `src/components/recruiter/workspace/__tests__/CandidateTable.test.tsx`, `src/features/recruiter-workspace/__tests__/candidate-list.contract.test.ts`.
    - Cover table headers, page-scope disclosure, bounded single-ID launch, loading/empty/initial-error/refresh-error/retry states, filters and returned pagination, and only the verified application collection/detail GET request shapes.
    - **Validates:** Requirements 5.1–5.14, 8.1–8.5.

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Candidate Profile source-backed projection and unavailable states
  - [x] 7.1 Implement the candidate-profile projector and reset-safe detail resource state.
    - **Anticipated files:** `src/features/recruiter-workspace/candidate-profile-projection.ts`, `candidate-profile-state.ts`.
    - Project only matching detail-response resume filename/original text, analysis fields, college, degree, current status, and application creation date. Keep original resume text as escaped text data, not HTML.
    - Map missing resume to a Resume EmptyState; map absent analysis values, education values, roadmap, projects, and additional history to explicit unavailable states; map notes to a clearly non-persisted placeholder.
    - Clear prior candidate source values before loading/retrying a new or inaccessible ID so a failed request cannot leak the prior candidate's data.
    - **Acceptance/validation:** profile mapping does not read list data as a substitute for missing detail fields and never creates roadmap, project, history, notes, or analysis values.
    - _Requirements: 6.1–6.12; Dependencies: D4_

  - [x] 7.2 Build the Candidate Profile route and source-backed profile sections.
    - **Anticipated files:** `src/app/recruiter/candidates/[id]/page.tsx`, `src/components/recruiter/workspace/CandidateProfile.tsx`, `ResumeSection.tsx`, `AnalysisSection.tsx`, `EducationSection.tsx`, `ApplicationTimeline.tsx`, `NotesPlaceholder.tsx`.
    - On a direct profile URL, make one detail GET for that ID; on list navigation, reuse only a matching successful route-subtree cache entry or make one GET. Do not reuse a different ID's data.
    - Render exact source-backed resume filename/text, analysis labels and values, education, the source-backed status badge, the disabled D1 status-action surface with ActionFeedback, and the single Applied timeline event. Persist named D4 unavailable regions and the non-saved notes placeholder.
    - On failed/inaccessible detail retrieval, clear all profile source sections and render ErrorState with a valid same-ID retry.
    - **Acceptance/validation:** missing resume shows the scoped EmptyState; failure cannot leave another candidate's content visible; no Phase 3 candidate capabilities appear.
    - _Requirements: 1.1–1.9, 6.1–6.12, 8.1–8.5, 9.1–9.9; Dependencies: D4_

  - [ ]* 7.3 Write the candidate-profile projection and isolation property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/candidate-profile.property.test.ts`.
    - **Property 10: Candidate-profile projection and isolation.** Generate allowed, absent, malformed, and extra detail fields plus prior-success/new-failure sequences; verify exact permitted field projection, required empty/unavailable/notes states, and removal of all previous source values before ErrorState.
    - Configure at least 100 runs using pure projection/reducer and mocked detail outcomes.
    - **Validates:** Requirements 6.2–6.12.

  - [ ]* 7.4 Add Candidate Profile example, component, and representative existing-contract tests.
    - **Anticipated files:** `src/components/recruiter/workspace/__tests__/CandidateProfile.test.tsx`, `src/features/recruiter-workspace/__tests__/candidate-profile.contract.test.ts`.
    - Cover direct load, matching-cache reuse, null resume, analysis/education labels, D4 unavailable sections, notes placeholder, escaped original text, inaccessible response clearing, and retry of the same application-detail GET.
    - **Validates:** Requirements 6.1–6.12, 8.1–8.5.

- [x] 8. Implement the application-status integration gate without any status mutation
  - [x] 8.1 Build the current disabled Application Status Actions presentation and D1 feedback boundary.
    - **Anticipated file:** `src/components/recruiter/workspace/ApplicationStatusActions.tsx`. Integrate this disabled-only surface into `CandidateProfile.tsx` in Task 7.2 after that route exists.
    - Display Shortlist, Reject, Move to Interview, Offer, and Hire for a source-backed application alongside the exact source-backed StatusBadge.
    - Under the mandatory current capability configuration, render every action disabled/non-selectable, visibly label it unavailable, and expose ActionFeedback explaining that the recruiter application service has no approved status-mutation operation (D1).
    - Keep the future adapter type/injection seam inactive. Do not implement a confirmation dialog flow, action handler, optimistic status update, status-write fetch, backend route, schema change, or API contract test for a fictitious mutation.
    - **Acceptance/validation:** activating/rendering any current action sends zero writes and leaves the source-backed status unchanged.
    - _Requirements: 1.6–1.9, 7.1–7.5; Dependency: D1_

  - [ ]* 8.2 Write the current application-status safety-gate property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/application-status-gate.property.test.ts`.
    - **Property 11: Current application-status safety gate.** Generate source-backed applications and all five actions with the absent adapter configuration; assert disabled/unavailable state, D1 ActionFeedback, and zero mutation-intent or adapter calls.
    - Configure at least 100 runs with spies; no live status operation is allowed.
    - **Validates:** Requirements 1.6–1.9, 7.3–7.5.

  - [ ]* 8.3 **BLOCKED BY D1 — do not execute in Phase 2.** Reserve the future confirmation-semantics property test for a separately approved mutation adapter.
    - **Future anticipated file only after approval:** `src/features/recruiter-workspace/__tests__/application-status-confirmation.property.test.ts`.
    - **Property 12: Future status-action confirmation semantics.** Only after separate D1 scope approval supplies an authorized adapter, test candidate/target identification, cancel = zero adapter calls, one confirmed adapter call, returned-status-only badge update, and failure preservation/ErrorState.
    - This task must not create an endpoint, HTTP method, adapter implementation, production dialog activation, test-only mutation workaround, or application status persistence. Keep it blocked/skipped until the approved capability exists.
    - **Validates:** Requirements 7.6–7.10. **Blocked by:** D1.

- [ ] 9. Complete cross-cutting loading, error, retry, accessibility, responsive, and motion behavior
  - [ ] 9.1 Wire the shared state primitives and retry snapshots through every Phase 2 route/component without changing protected Phase 1.
    - **Anticipated files:** focused edits to the new files from Tasks 2.2, 4.2, 5.2, 7.2, and 8.1; do not edit protected Phase 1 files.
    - Ensure every pending request has a named skeleton; successful zero collections have an appropriately scoped EmptyState; failures retain/clear source data exactly as the design's state matrix requires; and retry repeats the same accepted request snapshot exactly once per activation.
    - Ensure 320px layouts keep controls reachable without document-level horizontal scrolling, mobile cards preserve desktop-table labels/actions, enabled controls have keyboard/focus support, dark-mode status is not color-only, and reduced-motion preferences suppress non-essential motion.
    - Keep the current D1 buttons disabled; do not add a live dialog path. Conditional focus-in/focus-return behavior remains blocked with D1 until an approved adapter can actually open a dialog.
    - **Acceptance/validation:** all Phase 2 loading/empty/error/success/unavailable states are accessible and truthful; retry never changes request values or adds an unsupported request field.
    - _Requirements: 8.1–8.7, 9.1–9.9; Dependencies: D1, D2, D3, D4, D5, D6_

  - [ ]* 9.2 Write the retry request-snapshot fidelity property test.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/retry-snapshot.property.test.ts`.
    - **Property 13: Retry request snapshot fidelity.** Generate retryable read/supported-job-mutation request snapshots and assert each Retry activation emits exactly one identical allowed request with no added filters, pagination values, or write fields.
    - Configure at least 100 runs with request spies and mocked failures; exclude nonexistent application-status mutations.
    - **Validates:** Requirements 8.4, 8.5.

  - [ ]* 9.3 Add accessibility, keyboard, responsive, dark-mode, and reduced-motion component integration tests for the implemented Phase 2 surfaces.
    - **Anticipated files:** `src/components/recruiter/workspace/__tests__/workspace-accessibility.test.tsx`, with route-level test files as needed.
    - Verify labels, title-error `aria-describedby`, `aria-live` save feedback, named busy regions, alert errors, keyboard access/focus indicators for enabled controls, 320px control reachability, source text plus non-color status cues, and reduced-motion behavior.
    - Verify current D1 controls remain non-selectable with readable feedback. Do not fake an enabled application-status dialog; its focus round-trip test stays blocked by D1 and separate approval.
    - **Validates:** Requirements 7.3–7.5, 8.1–8.7, 9.1–9.9.

- [ ] 10. Validate existing contracts, Phase 1 isolation, and the production build
  - [ ]* 10.1 Add representative client contract tests for only the existing recruiter operations used by Phase 2.
    - **Anticipated file:** `src/features/recruiter-workspace/__tests__/recruiter-workspace-contracts.test.ts`.
    - Use authenticated fixtures or controlled route-handler mocks to cover: unparameterized job collection GET; job POST/GET/PUT with the supported field set; candidate collection GET with only allowed query keys and response pagination; and application detail GET source projection/inaccessible errors.
    - Cover successful, empty, validation-failed, and safe-error responses. Do not add, mock as real, or test an application-status mutation endpoint.
    - **Validation:** contract tests prove request serialization and response handling without changing route handlers, database models, auth, AI services, or student submission.
    - _Requirements: 1.4, 2.5–2.11, 4.1, 4.8–4.11, 5.1–5.14, 6.1–6.12, 10.3–10.4; Dependencies: D1–D6_

  - [ ]* 10.2 Add an automated Protected Phase 1 isolation regression smoke test.
    - **Anticipated file:** `src/app/recruiter/__tests__/phase1-isolation.smoke.test.tsx` or an equivalent isolated test location.
    - Assert `/recruiter/dashboard` remains reachable with its existing `RecruiterHeader`, `KPIStatsCards`, `HiringFunnel`, `CopilotPanel`, and `RecentActivityTimeline` composition/navigation, and that visiting Phase 2 routes does not introduce Phase 2 endpoint calls into supported dashboard flows.
    - The test must inspect/use the protected surface without modifying its files or visual behavior.
    - **Validates:** Requirements 1.5, 10.5.

  - [ ] 10.3 Run the mandatory automated quality gate for the completed, non-blocked Phase 2 work.
    - Run the focused Vitest unit/component/property suites once, including at least 100 runs for each executable property (Properties 1–11 and 13); leave Property 12 blocked/skipped because D1 is unresolved.
    - Run the representative existing-contract and Phase 1 isolation tests, then `npm run lint` and `npm run build`; resolve all failures and require `npm run build` to exit with status 0.
    - **Acceptance/validation:** the final validation report distinguishes D1's deliberately blocked future test from a failure and confirms no backend/API/schema/auth/AI/Phase 1 modification was introduced.
    - _Requirements: 10.1–10.5; Dependencies: D1_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are test-related and optional for task selection; Properties 1–11 and 13 are required release validation when their implementation tasks are completed. Property 12 is additionally blocked by D1 and must remain unimplemented/skipped until separately approved.
- The plan intentionally contains no task to create or alter an application-status mutation, backend API, Prisma schema/model, authentication flow, AI service, student application submission capability, or protected Phase 1 component/route.
- D1 is implemented only as disabled, non-selectable actions and truthful feedback. D2 preserves local-only job inputs with disclosures. D3 confines ATS/resume enrichment to same-ID cached detail responses. D4 uses explicit unavailable/placeholder profile states. D5 constrains job transforms and candidate sorting to the documented local/page scopes. D6 confines auto-save to eligible persisted drafts and supported fields.
- The dependency graph schedules only safe parallel work. Tasks that edit the same route/component surface are deliberately placed in later waves; checkpoint and parent tasks are excluded.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1", "4.1", "5.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "4.2", "4.3", "4.4", "5.2", "5.3", "5.4", "5.5", "8.2"] },
    { "id": 3, "tasks": ["2.6", "4.5", "5.6", "7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["7.4", "9.2", "9.3", "10.1", "10.2"] },
    { "id": 7, "tasks": ["8.3", "10.3"] }
  ]
}
```