# Requirements Document

## Workflow Status

- **Feature:** `recruiter-hiring-workspace`
- **Workflow:** Requirements-first feature workflow
- **Current phase:** Initial requirements created; awaiting user review before design and task creation
- **Implementation status:** No application code, API, schema, authentication, or AI-service changes are authorized by this document

## Introduction

Recruiter Phase 2 adds a bounded Recruiter Hiring Workspace for creating and managing recruiter-owned jobs, reviewing applicants, viewing source-backed candidate profiles, and presenting application-status actions. The workspace must provide a polished, responsive, dark-mode-compatible, accessible experience while preserving the production-ready Recruiter Dashboard Phase 1.

The feature must consume only the verified existing recruiter job and application APIs. These requirements deliberately separate desired user-interface fields and actions from data or mutations that the current contracts do not expose. Missing capabilities are recorded as Integration_Dependencies rather than being treated as available backend behavior.

## Scope

### In scope

- Job Posting for recruiter-owned jobs
- Manage Jobs table and job lifecycle actions
- Candidate List using real application data
- Candidate Profile using real application-detail data
- Application-status action presentation and integration gating
- Reusable, responsive, accessible workspace states

### Explicitly deferred to Phase 3

- Analytics
- Reports
- AI Ranking
- Candidate Comparison
- Executive Dashboard
- Hiring Insights
- Any other job-posting, candidate-detail, analytics, or recruiter capability outside the Phase 2 areas above

### Protected boundaries

The implementation must preserve the existing Recruiter Dashboard and its `KPIStatsCards`, `HiringFunnel`, `CopilotPanel`, `RecentActivityTimeline`, and `RecruiterHeader`. The Phase 1 dashboard continues to use only its existing dashboard and copilot endpoints. The existing student application-submission capability remains an external producer of applications and is outside this Phase 2 scope.

The implementation must not alter the Prisma schema or database models, authentication, AI service, existing backend APIs, Protected_Phase_1, or the student application-submission capability unless a separately identified Critical_Bug receives scope approval.

## Glossary

- **Recruiter_Hiring_Workspace**: The Phase 2 recruiter-facing interface defined by this document.
- **Protected_Phase_1**: The production-ready Recruiter Dashboard and the `KPIStatsCards`, `HiringFunnel`, `CopilotPanel`, `RecentActivityTimeline`, and `RecruiterHeader` components.
- **Phase_2_Capability_Set**: Job Posting, Manage Jobs, Candidate List, Candidate Profile, and Application Management.
- **Deferred_Phase_3_Capability_Set**: Analytics, Reports, AI Ranking, Candidate Comparison, Executive Dashboard, Hiring Insights, and all other recruiter features outside the Phase 2 scope.
- **Recruiter**: An authenticated user whose role is `RECRUITER`.
- **Existing_Recruiter_Job_API**: `GET` and `POST /api/recruiter/jobs`, plus `GET` and `PUT /api/recruiter/jobs/[id]`.
- **Existing_Recruiter_Application_API**: `GET /api/recruiter/applications` and `GET /api/recruiter/applications/[id]`.
- **Supported_Job_Field_Set**: The job fields that the verified create/update contract persists: `title`, `description`, `location`, `salary`, `requirements`, and `status`. Creation derives `company` from the recruiter profile; the update handler does not accept a client-supplied company update.
- **Aspirational_Job_Field_Set**: `employmentType`, `experience`, `skills`, and `benefits`, which are requested Job Posting fields but are not persisted by the current Job model or verified job API contract.
- **Job_Form_Field_Set**: Job Title, Company, Location, Employment Type, Experience, Salary, Skills, Description, Requirements, and Benefits.
- **Job**: A recruiter-owned record returned by the Existing_Recruiter_Job_API.
- **Persisted_Job**: A Job with an API-issued identifier.
- **Draft_Job**: A Persisted_Job whose `status` is `DRAFT`.
- **Job_Status**: The source-backed Job `status` value. The Phase 2 job controls use `DRAFT`, `PUBLISHED`, and `ARCHIVED`.
- **Auto_Save**: Automatic client-initiated persistence of an eligible Draft_Job through the existing job update contract.
- **Job_Collection_Transform**: A deterministic client-side search across Job title, company, and location; filter by Job_Status; sort by Job, Status, Applications, Created, or Updated; and paginate the fetched Job collection.
- **Application**: A recruiter-owned candidate application returned by the Existing_Recruiter_Application_API.
- **Candidate_List_Response**: The paginated response from `GET /api/recruiter/applications`, containing `applications`, `total`, `page`, and `pageSize`.
- **Application_Detail_Response**: The response from `GET /api/recruiter/applications/[id]`, containing the application, job summary, user/student profile, optional resume, and optional analysis fields.
- **ATS_Score**: The `analysis.atsScore` value from an Application_Detail_Response.
- **Application_Status**: The source-backed `application.status` value.
- **Application_Status_Action**: One of Shortlist, Reject, Move to Interview, Offer, or Hire.
- **Application_Status_Mutation_Integration**: An authorized, approved mechanism that can persist an Application_Status change. No such operation exists in the verified Existing_Recruiter_Application_API.
- **Integration_Dependency**: A documented missing data field, endpoint capability, or mutation that blocks a requested outcome without authorizing a backend change.
- **Source_Backend_Field**: A value returned by an existing verified API response for the same Job or Application.
- **Unavailability_Indicator**: Visible text that explains that a value is unavailable in current source data or awaits an Integration_Dependency; the text must not resemble a source-backed value.
- **Notes_Placeholder**: A visible, non-persisted placeholder for recruiter notes because no note model or API field exists.
- **Status_Badge**: A reusable visual label representing a source-backed Job_Status or Application_Status.
- **Confirmation_Dialog**: An accessible dialog that identifies the affected candidate and proposed Application_Status_Action before a status mutation is sent.
- **Action_Feedback**: The visible feedback region associated with an Application_Status_Action.
- **Loading_Skeleton**: A non-final visual placeholder whose structure mirrors the region that is loading and exposes an accessible loading name.
- **Empty_State**: A visible state for an empty successful response that explains the absence of records and provides a scoped next action.
- **Error_State**: A visible state for a failed request that provides the returned safe error message and a retry action when retrying the same request is valid.
- **Dark_Mode**: The host application color mode with a dark background and light foreground content.
- **WCAG_AA**: The Web Content Accessibility Guidelines Level AA contrast threshold: at least 4.5:1 for normal text and 3:1 for non-text interactive indicators.
- **Reduced_Motion_Preference**: The operating-system or browser preference to reduce non-essential motion.
- **Keyboard_Focus_Indicator**: A visible treatment that identifies the currently keyboard-focused interactive control.
- **CSS_Pixel**: A CSS reference pixel used to specify viewport width in responsive acceptance criteria.
- **Critical_Bug**: A reproducible defect in a protected boundary that prevents a supported Phase 2 flow from functioning and cannot be resolved within the approved client-side scope.

## Verified Existing Contracts and Integration Gaps

| Area | Verified current behavior | Requirement consequence |
| --- | --- | --- |
| Job collection | `GET /api/recruiter/jobs` returns the recruiter's jobs, newest first, with an application count. It has no documented search, filter, sort, or pagination parameters. | Manage Jobs search, filtering, sorting, and pagination must be a Job_Collection_Transform over fetched data. |
| Job create | `POST /api/recruiter/jobs` requires a non-empty title and persists title, profile-derived company, description, location, salary, requirements, and status. | Company cannot be represented as a client-persisted field; the Aspirational_Job_Field_Set cannot be represented as persisted values. |
| Job update | `PUT /api/recruiter/jobs/[id]` accepts title, description, location, salary, requirements, and status for the recruiter's own job. | Edit, publish, archive, draft, and eligible Auto_Save use only those fields and status. |
| Application collection | `GET /api/recruiter/applications` supports `jobId`, `status`, `search`, `page`, and `pageSize` (1–50), returns pagination metadata, and defaults to newest-first ordering. It exposes application status/date, job title, user email, and student profile, but not resume or analysis data. | Candidate List filters and pagination can use the existing API. Server-wide sorting, ATS, and resume data are not available in the list response. |
| Application detail | `GET /api/recruiter/applications/[id]` exposes current status, application creation date, job summary, user/student profile, optional resume filename/original text, ATS score, strengths, weaknesses, hidden skills, keyword suggestions, and analysis scores. It does not expose `roadmap`, structured projects, application-status history, or notes. | Candidate Profile may show only source-backed fields and must use explicit unavailable or placeholder states for missing data. |
| Application status mutation | The verified recruiter application routes provide only `GET` operations. | Shortlist, Reject, Move to Interview, Offer, and Hire are integration-gated; Phase 2 cannot truthfully persist these transitions with the current API. |
| Student application submission | An existing student application-submission API creates applications outside the recruiter workspace. | Candidate List and Candidate Profile consume resulting application records without modifying student submission behavior. |
| Auto-save | A Persisted_Job can be updated through the existing `PUT` contract, but no separate Auto_Save endpoint supports unsaved records or unsupported fields. | Auto_Save is limited to a Persisted_Job, a valid title, and the Supported_Job_Field_Set. |

No Critical_Bug is identified by this contract review. The gaps above document scope and dependencies; the gaps do not authorize changes to APIs, authentication, the AI service, the Prisma schema, or database models.

## Requirements

### Requirement 1: Phase 2 Scope and Boundary Preservation

**User Story:** As a recruiter, I want a dedicated hiring workspace, so that I can work with jobs and applicants without changing the established recruiter dashboard.

#### Acceptance Criteria

1. THE Recruiter_Hiring_Workspace SHALL provide the Phase_2_Capability_Set.
2. THE Recruiter_Hiring_Workspace SHALL expose visible entry points only for the Phase_2_Capability_Set.
3. THE Recruiter_Hiring_Workspace SHALL enable actions only for the Phase_2_Capability_Set.
4. WHEN a Phase 2 capability reads or writes recruiter data, THE Recruiter_Hiring_Workspace SHALL use only operations defined by the Existing_Recruiter_Job_API or Existing_Recruiter_Application_API.
5. WHEN a Recruiter uses a Phase 2 route, THE Recruiter_Hiring_Workspace SHALL preserve the behavior and visual output of Protected_Phase_1.
6. IF a requested Phase 2 outcome needs a missing data field, endpoint operation, or mutation, THEN THE Recruiter_Hiring_Workspace SHALL identify an Integration_Dependency.
7. IF a requested Phase 2 outcome needs a missing data field, endpoint operation, or mutation, THEN THE Recruiter_Hiring_Workspace SHALL display the requested outcome as unavailable.
8. IF a requested Phase 2 outcome needs a missing data field, endpoint operation, or mutation, THEN THE Recruiter_Hiring_Workspace SHALL prevent execution of the requested outcome.
9. IF a requested Phase 2 outcome needs a missing data field, endpoint operation, or mutation, THEN THE Recruiter_Hiring_Workspace SHALL send no data-write request for the requested outcome.
10. IF a Critical_Bug is identified in a protected boundary, THEN THE Recruiter_Hiring_Workspace SHALL record the protected boundary, preconditions, input, reproduction steps, expected behavior, and observed behavior as reproducible evidence.
11. IF a Critical_Bug is identified in a protected boundary, THEN THE Recruiter_Hiring_Workspace SHALL request separate approval before changing Protected_Phase_1.

### Requirement 2: Job Posting Form and Validation

**User Story:** As a recruiter, I want to create a job from a complete, clear posting form, so that candidates can be considered for a well-defined role.

#### Acceptance Criteria

1. WHEN a Recruiter opens Job Posting, THE Recruiter_Hiring_Workspace SHALL display Job Title, Company, Location, Employment Type, Experience, Salary, Skills, Description, Requirements, and Benefits.
2. WHEN a Recruiter attempts to save a Job, THE Recruiter_Hiring_Workspace SHALL trim leading and trailing whitespace from Job Title before validating the Job Title.
3. WHEN a Recruiter attempts to save a Job with a Job Title that is empty after whitespace trimming, THE Recruiter_Hiring_Workspace SHALL display a title-required validation message.
4. WHILE a Job Title is empty after whitespace trimming, THE Recruiter_Hiring_Workspace SHALL prevent a create or update request for the Job.
5. WHEN a Recruiter saves a new Job with a valid Job Title, THE Recruiter_Hiring_Workspace SHALL submit a `POST /api/recruiter/jobs` payload containing only `title`, `description`, `location`, `salary`, `requirements`, and `status`.
6. WHEN a Recruiter saves a Persisted_Job with a valid Job Title, THE Recruiter_Hiring_Workspace SHALL submit a `PUT /api/recruiter/jobs/[id]` payload containing only `title`, `description`, `location`, `salary`, `requirements`, and `status`.
7. WHEN the Company field is displayed for a Job, THE Recruiter_Hiring_Workspace SHALL identify Company as recruiter-profile-derived and not client-persisted.
8. WHILE Job Posting displays Employment Type, Experience, Skills, or Benefits, THE Recruiter_Hiring_Workspace SHALL visibly identify each field as not persisted by the current job contract.
9. WHEN a Recruiter saves a Job with entered Employment Type, Experience, Skills, or Benefits values, THE Recruiter_Hiring_Workspace SHALL display the applicable not-persisted disclosure before presenting a save-success confirmation.
10. IF the Existing_Recruiter_Job_API returns a validation or save error, THEN THE Recruiter_Hiring_Workspace SHALL display an Error_State.
11. IF the Existing_Recruiter_Job_API returns a validation or save error, THEN THE Recruiter_Hiring_Workspace SHALL retain every entered Job_Form_Field_Set value.

### Requirement 3: Draft Saving Within the Existing Job Contract

**User Story:** As a recruiter, I want eligible draft changes to save safely, so that I can continue editing a persisted job without losing supported information.

#### Acceptance Criteria

1. WHERE Auto_Save is enabled, WHILE a Persisted_Job has Job_Status `DRAFT` and a Job Title that is nonblank after whitespace trimming, WHEN a Supported_Job_Field_Set member changes, THE Recruiter_Hiring_Workspace SHALL submit only `title`, `description`, `location`, `salary`, `requirements`, and `status` through `PUT /api/recruiter/jobs/[id]`.
2. WHILE a Job lacks a Persisted_Job identifier, has a Job_Status other than `DRAFT`, or has a Job Title that is blank after whitespace trimming, THE Recruiter_Hiring_Workspace SHALL keep Auto_Save unavailable.
3. WHEN Employment Type, Experience, Skills, or Benefits changes, THE Recruiter_Hiring_Workspace SHALL exclude the changed field from every Auto_Save request.
4. WHEN Employment Type, Experience, Skills, or Benefits changes, THE Recruiter_Hiring_Workspace SHALL display an Unavailability_Indicator for persistence of the changed field.
5. WHEN an eligible Auto_Save request is pending, THE Recruiter_Hiring_Workspace SHALL identify the Draft_Job as saving.
6. WHEN an eligible Auto_Save request succeeds, THE Recruiter_Hiring_Workspace SHALL replace the saving state with saved feedback that identifies only returned Supported_Job_Field_Set values.
7. IF an eligible Auto_Save request fails, THEN THE Recruiter_Hiring_Workspace SHALL replace the saving state with an Error_State that identifies the failed Auto_Save.
8. IF an eligible Auto_Save request fails, THEN THE Recruiter_Hiring_Workspace SHALL retain every changed Job_Form_Field_Set value.

### Requirement 4: Manage Jobs

**User Story:** As a recruiter, I want to search, organize, and change the lifecycle state of my jobs, so that I can manage active and historical postings efficiently.

#### Acceptance Criteria

1. WHEN Manage Jobs loads, THE Recruiter_Hiring_Workspace SHALL retrieve the recruiter-owned Job collection through `GET /api/recruiter/jobs` with no query parameters.
2. WHEN a Job collection is available, THE Recruiter_Hiring_Workspace SHALL display a table with Job, Status, Applications, Created, Updated, and Actions columns.
3. WHEN a Job row is displayed, THE Recruiter_Hiring_Workspace SHALL display the source-backed application count and Job_Status for the displayed Job.
4. WHEN a Recruiter changes a Manage Jobs search, filter, sort, or page selection, THE Recruiter_Hiring_Workspace SHALL apply a deterministic Job_Collection_Transform only to the last successfully retrieved Job collection.
5. WHEN a Recruiter applies a Manage Jobs status filter, THE Recruiter_Hiring_Workspace SHALL match the selected filter against exact source-backed Job_Status values.
6. WHILE no Manage Jobs sort is selected or compared sort values are equal, THE Recruiter_Hiring_Workspace SHALL preserve the source order of the last successfully retrieved Job collection.
7. WHEN a Recruiter changes the selected Manage Jobs page, THE Recruiter_Hiring_Workspace SHALL display only Job rows belonging to the selected page of the transformed Job collection.
8. WHEN a Recruiter chooses Edit for a Job, THE Recruiter_Hiring_Workspace SHALL retrieve the recruiter-owned Job through `GET /api/recruiter/jobs/[id]` before displaying persisted Job values for editing.
9. WHEN a Recruiter confirms Publish, Archive, or Draft for a Persisted_Job, THE Recruiter_Hiring_Workspace SHALL submit `PUBLISHED`, `ARCHIVED`, or `DRAFT`, respectively, as the Job_Status through `PUT /api/recruiter/jobs/[id]`.
10. WHEN a Job lifecycle update succeeds, THE Recruiter_Hiring_Workspace SHALL show only the returned Job_Status in the corresponding Status_Badge.
11. IF a Manage Jobs retrieval or lifecycle update fails, THEN THE Recruiter_Hiring_Workspace SHALL retain the last displayed source-backed Job data and display an Error_State.
12. WHEN a successful Manage Jobs collection contains zero Jobs, THE Recruiter_Hiring_Workspace SHALL display an Empty_State that identifies a zero-record result.

### Requirement 5: Candidate List

**User Story:** As a recruiter, I want a paginated list of applicants, so that I can find and open real candidate records for my jobs.

#### Acceptance Criteria

1. WHEN Candidate List loads or supported filters change, THE Recruiter_Hiring_Workspace SHALL request `GET /api/recruiter/applications` using only the verified `jobId`, `status`, `search`, `page`, and `pageSize` query parameters.
2. WHEN a Candidate_List_Response is available, THE Recruiter_Hiring_Workspace SHALL display a table with Candidate, ATS, Applied Date, Resume, Status, and Actions columns.
3. WHEN an Application includes `studentProfile.fullName`, THE Recruiter_Hiring_Workspace SHALL display the source-backed full name in the Candidate column.
4. IF an Application lacks `studentProfile.fullName` and includes a source-backed user email, THEN THE Recruiter_Hiring_Workspace SHALL display the user email in the Candidate column.
5. IF an Application lacks `studentProfile.fullName` and a source-backed user email, THEN THE Recruiter_Hiring_Workspace SHALL display an Unavailability_Indicator in the Candidate column.
6. WHEN a retrieved Application_Detail_Response for a displayed Application includes an ATS_Score or resume filename, THE Recruiter_Hiring_Workspace SHALL display the exact source-backed ATS_Score or resume filename in the applicable table cell.
7. WHILE no retrieved Application_Detail_Response provides an ATS_Score or resume filename for a displayed Application, THE Recruiter_Hiring_Workspace SHALL display an Unavailability_Indicator in the applicable table cell.
8. WHEN a Candidate_List_Response is available, THE Recruiter_Hiring_Workspace SHALL use the returned `total`, `page`, and `pageSize` values to render pagination controls and the current page.
9. WHEN a Recruiter selects Candidate, ATS, Applied Date, Resume, or Status with an ascending or descending direction, THE Recruiter_Hiring_Workspace SHALL apply a deterministic comparison for the selected displayed field only to Applications in the retrieved Candidate_List_Response page.
10. WHILE the Existing_Recruiter_Application_API provides no sort parameter, THE Recruiter_Hiring_Workspace SHALL label Candidate List sorting as page-scoped.
11. WHEN compared Candidate List sort values are equal, THE Recruiter_Hiring_Workspace SHALL preserve the input order from the retrieved Candidate_List_Response page.
12. WHEN a Recruiter chooses the candidate-detail action, THE Recruiter_Hiring_Workspace SHALL retrieve the selected Application through `GET /api/recruiter/applications/[id]`.
13. IF Candidate List retrieval fails before the first successful Candidate_List_Response, THEN THE Recruiter_Hiring_Workspace SHALL display an Error_State with no synthetic Candidate rows.
14. IF Candidate List retrieval fails after a successful Candidate_List_Response, THEN THE Recruiter_Hiring_Workspace SHALL retain the last successful Candidate_List_Response until the Recruiter retries or changes an accepted filter or pagination value.

### Requirement 6: Candidate Profile

**User Story:** As a recruiter, I want a source-backed candidate profile, so that I can review the application and resume-analysis information currently available to me.

#### Acceptance Criteria

1. WHEN a Recruiter opens a Candidate Profile, THE Recruiter_Hiring_Workspace SHALL retrieve the Application_Detail_Response through `GET /api/recruiter/applications/[id]`.
2. WHEN an Application_Detail_Response is received, THE Recruiter_Hiring_Workspace SHALL map Candidate Profile source-backed content only from resume filename, resume original text, analysis fields, college, degree, current Application_Status, and application creation date.
3. WHEN an Application_Detail_Response contains a resume, THE Recruiter_Hiring_Workspace SHALL display the exact source-backed resume filename and original text in the Resume section.
4. IF an Application_Detail_Response contains no resume, THEN THE Recruiter_Hiring_Workspace SHALL display an Empty_State in the Resume section.
5. WHEN an Application_Detail_Response contains analysis data, THE Recruiter_Hiring_Workspace SHALL display the source-backed ATS_Score, hidden skills, keyword suggestions, strengths, weaknesses, experience score, and education score with labels that identify analysis data.
6. WHEN an Application_Detail_Response contains a student profile, THE Recruiter_Hiring_Workspace SHALL display the source-backed college and degree in the Education section.
7. WHEN an Application_Detail_Response contains an Application_Status, THE Recruiter_Hiring_Workspace SHALL display the current source-backed Application_Status in the application-status section.
8. WHEN an Application_Detail_Response contains an application creation date, THE Recruiter_Hiring_Workspace SHALL display the source-backed application creation date as the Timeline entry.
9. WHILE the Existing_Recruiter_Application_API exposes no roadmap, structured project data, or application-status history, THE Recruiter_Hiring_Workspace SHALL display Unavailability_Indicators for Roadmap, Projects, and additional Timeline or status-history content rather than source-backed-looking content.
10. WHILE the Existing_Recruiter_Application_API exposes no recruiter-note data, THE Recruiter_Hiring_Workspace SHALL display a Notes_Placeholder identified as non-persisted rather than saved recruiter data.
11. IF Candidate Profile retrieval fails or returns an inaccessible Application, THEN THE Recruiter_Hiring_Workspace SHALL clear previously displayed candidate source values before displaying an Error_State.
12. IF Candidate Profile retrieval fails or returns an inaccessible Application, THEN THE Recruiter_Hiring_Workspace SHALL display an Error_State.

### Requirement 7: Application Status Actions and Integration Gate

**User Story:** As a recruiter, I want to manage an applicant's hiring status, so that I can communicate a clear hiring decision when an authorized status-update capability is available.

#### Acceptance Criteria

1. WHEN a source-backed Application is displayed, THE Recruiter_Hiring_Workspace SHALL display Shortlist, Reject, Move to Interview, Offer, and Hire as Application_Status_Actions.
2. WHEN a source-backed Application_Status is displayed, THE Recruiter_Hiring_Workspace SHALL render the Application_Status with a Status_Badge.
3. WHILE the Existing_Recruiter_Application_API provides only `GET` operations and no Application_Status_Mutation_Integration, THE Recruiter_Hiring_Workspace SHALL visibly mark Shortlist, Reject, Move to Interview, Offer, and Hire as unavailable and non-selectable.
4. WHILE the Existing_Recruiter_Application_API provides only `GET` operations and no Application_Status_Mutation_Integration, THE Recruiter_Hiring_Workspace SHALL explain the missing mutation Integration_Dependency in Action_Feedback.
5. WHILE the Existing_Recruiter_Application_API provides only `GET` operations and no Application_Status_Mutation_Integration, THE Recruiter_Hiring_Workspace SHALL send no Application status-mutation request.
6. WHERE a separately approved Application_Status_Mutation_Integration is available, WHEN a Recruiter selects an Application_Status_Action, THE Recruiter_Hiring_Workspace SHALL open a Confirmation_Dialog that identifies the candidate and target status.
7. WHERE a separately approved Application_Status_Mutation_Integration is available, IF a Recruiter cancels a Confirmation_Dialog, THEN THE Recruiter_Hiring_Workspace SHALL send zero data-write requests and preserve the source-backed Application_Status.
8. WHERE a separately approved Application_Status_Mutation_Integration is available, WHEN a Recruiter confirms an Application_Status_Action, THE Recruiter_Hiring_Workspace SHALL submit one authorized status-mutation request for the selected Application.
9. WHERE a separately approved Application_Status_Mutation_Integration is available, WHEN an authorized status-mutation response succeeds, THE Recruiter_Hiring_Workspace SHALL update the Status_Badge only from the returned source-backed Application_Status.
10. WHERE a separately approved Application_Status_Mutation_Integration is available, IF an authorized status-mutation response fails, THEN THE Recruiter_Hiring_Workspace SHALL preserve the prior source-backed Application_Status and display an Error_State.

### Requirement 8: Loading, Empty, Error, and Feedback States

**User Story:** As a recruiter, I want clear feedback while workspace data loads, is absent, or fails, so that I can understand the current state and recover safely.

#### Acceptance Criteria

1. WHEN a workspace data request is pending, THE Recruiter_Hiring_Workspace SHALL display a Loading_Skeleton with an accessible name that identifies the affected region.
2. WHEN a successful workspace request returns no records, THE Recruiter_Hiring_Workspace SHALL display an Empty_State with a next action limited to the Phase_2_Capability_Set.
3. IF a workspace request fails, THEN THE Recruiter_Hiring_Workspace SHALL display an Error_State.
4. IF a failed workspace request can validly repeat the same accepted request values, THEN THE Recruiter_Hiring_Workspace SHALL provide a retry action.
5. WHEN a Recruiter activates a valid retry action, THE Recruiter_Hiring_Workspace SHALL send one repeat request using the same accepted request values.
6. WHEN a supported workspace mutation request succeeds, THE Recruiter_Hiring_Workspace SHALL provide a visible success confirmation that identifies the completed action and reflects returned source-backed state.
7. IF a supported workspace mutation request fails, THEN THE Recruiter_Hiring_Workspace SHALL provide a visible failure confirmation that identifies the action and preserves or restores the prior source-backed state.

### Requirement 9: Reusable, Responsive, Accessible Presentation

**User Story:** As a recruiter using different devices and input methods, I want a polished and accessible workspace, so that I can complete supported hiring tasks reliably.

#### Acceptance Criteria

1. THE Recruiter_Hiring_Workspace SHALL reuse the host application patterns for Status_Badges, tables and lists, Loading_Skeletons, Empty_State regions, Error_State regions, and Confirmation_Dialog behavior.
2. WHEN the viewport is at least 320 CSS_Pixel wide, THE Recruiter_Hiring_Workspace SHALL keep workspace controls reachable without page-level horizontal scrolling.
3. WHERE Dark_Mode is active, THE Recruiter_Hiring_Workspace SHALL use the host application's dark-mode text, surface, and interactive-state patterns that communicate status or state with text or icons in addition to color.
4. WHEN a Recruiter navigates with a keyboard, THE Recruiter_Hiring_Workspace SHALL provide keyboard access for every enabled workspace control.
5. WHEN an enabled workspace control receives keyboard focus, THE Recruiter_Hiring_Workspace SHALL display a Keyboard_Focus_Indicator.
6. WHEN a Confirmation_Dialog opens, THE Recruiter_Hiring_Workspace SHALL move keyboard focus into the Confirmation_Dialog.
7. WHEN a Confirmation_Dialog closes and the opening control remains available, THE Recruiter_Hiring_Workspace SHALL return keyboard focus to the opening control.
8. WHERE a Reduced_Motion_Preference is active, THE Recruiter_Hiring_Workspace SHALL suppress non-essential workspace animations.
9. THE Recruiter_Hiring_Workspace SHALL ensure that workspace animations are non-essential and are never the sole signal of workspace state.

### Requirement 10: Implementation Quality Gate

**User Story:** As a project maintainer, I want the implemented workspace validated against the existing application, so that the Phase 2 feature can be released without breaking the build or Phase 1.

#### Acceptance Criteria

1. WHEN implementation of the Recruiter_Hiring_Workspace is complete, THE Recruiter_Hiring_Workspace SHALL complete `npm run build` with exit status `0`.
2. WHEN implementation validation runs, THE Recruiter_Hiring_Workspace SHALL execute client-side tests that cover deterministic Job_Collection_Transform and page-scoped Candidate List sorting.
3. WHEN implementation validation runs, THE Recruiter_Hiring_Workspace SHALL execute client request-serialization tests with mocked successful, failed, and empty API responses.
4. WHEN implementation validation runs, THE Recruiter_Hiring_Workspace SHALL execute representative contract tests for the Existing_Recruiter_Job_API and Existing_Recruiter_Application_API operations invoked by the Recruiter_Hiring_Workspace.
5. WHEN implementation validation runs, THE Recruiter_Hiring_Workspace SHALL execute a regression smoke test that verifies Protected_Phase_1 remains reachable and unchanged in supported flows.

## Integration Dependencies and Blockers

| ID | Dependency | Current blocker | Required Phase 2 behavior until resolved |
| --- | --- | --- | --- |
| D1 | Application_Status_Mutation_Integration | No recruiter application endpoint supports `PATCH`, `PUT`, or another status mutation. | Display all requested status actions as unavailable, explain the blocker, send no mutation, and preserve the source-backed status. |
| D2 | Aspirational job field persistence | The Job model and verified job endpoints do not persist employment type, experience, skills, or benefits. Company is profile-derived rather than a client-persisted field. | Render requested form fields with clear persistence disclosure; do not state that unsupported values were saved. |
| D3 | Candidate-list ATS and resume projection | The list endpoint does not return analysis or resume fields. | Show source-backed values only when an Application_Detail_Response has been retrieved; otherwise show an Unavailability_Indicator. |
| D4 | Candidate roadmap, projects, history, and notes | The application-detail endpoint omits roadmap, structured projects, application-status history, and notes. | Use explicit unavailable states and a non-persisted Notes_Placeholder. |
| D5 | Server-side job query and candidate sort | Job collection has no query parameters; application collection has no sort parameter. | Apply Job_Collection_Transform locally; constrain candidate sorting to the retrieved page and disclose the scope. |
| D6 | Auto_Save boundary | `PUT /api/recruiter/jobs/[id]` works only for a Persisted_Job and the Supported_Job_Field_Set. | Permit Auto_Save only within that contract; leave unsaved jobs and unsupported fields outside automatic persistence. |

Resolving an Integration_Dependency requires a separately approved scope change. This requirements document does not prescribe, create, or modify a backend endpoint, data model, authentication behavior, or AI behavior.

## Correctness Properties for Eventual Implementation

The following properties describe testable behavior for the future implementation. Property-based tests apply to deterministic client-side transformations and request serialization with mocked API responses. Representative integration or contract tests apply to the existing endpoints. No property test should attempt live status mutations because the current API does not offer them.

1. **CP-1 — Invalid-title request exclusion** *(property-based; Requirements 2.2–2.4)*: For every form state whose Job Title becomes empty after whitespace trimming, a save attempt produces a title-validation result and no `POST` or `PUT` request intent.
2. **CP-2 — Supported job-field serialization** *(property-based; Requirements 2.5–2.9 and 3.1–3.4)*: For every generated job form state, each create or update payload contains only the Supported_Job_Field_Set. The payload never treats a client-provided Company or an Aspirational_Job_Field_Set member as persisted data.
3. **CP-3 — Draft-save outcome fidelity** *(property-based with mocked `PUT`; Requirement 3)*: For every eligible Draft_Job edit, a successful mocked response changes the saved indicator only for returned supported values; a failed response preserves the edited client input and exposes an Error_State.
4. **CP-4 — Manage Jobs transform determinism** *(property-based; Requirements 4.4–4.7)*: For every fetched Job collection and valid search, filter, sort, and page selection, applying the same Job_Collection_Transform twice yields the same ordered visible Job identifiers, contains no duplicate identifiers, and never introduces an identifier absent from the fetched collection.
5. **CP-5 — Job lifecycle status mapping** *(property-based with mocked `PUT`; Requirements 4.9–4.10)*: For each supported lifecycle action, the request status is exactly `PUBLISHED`, `ARCHIVED`, or `DRAFT`, and a successful returned status is the only status shown in the row's Status_Badge.
6. **CP-6 — Candidate query boundary** *(property-based; Requirements 5.1 and 5.8)*: For every valid filter and pagination state, the generated list request contains only `jobId`, `status`, `search`, `page`, and `pageSize`; the visible pagination state equals the `total`, `page`, and `pageSize` values returned by the mocked Candidate_List_Response.
7. **CP-7 — Candidate source-data fidelity** *(property-based with mocked list and detail responses; Requirements 5.3–5.7)*: Every displayed candidate name, ATS score, resume filename, application status, and applied date is either exactly sourced from the applicable response field or replaced by an Unavailability_Indicator. No synthetic ATS score, resume filename, or candidate identity is generated.
8. **CP-8 — Candidate-profile projection** *(property-based with mocked detail responses; Requirement 6)*: Each populated Candidate Profile section maps only to fields allowed by the Application_Detail_Response; absent resume, analysis, roadmap, projects, history, and notes values produce the required Empty_State, Unavailability_Indicator, or Notes_Placeholder without leaking data from another Application.
9. **CP-9 — Current status-action safety gate** *(property-based; Requirements 7.3–7.5)*: Under the current capability configuration with no Application_Status_Mutation_Integration, every Application_Status_Action is unavailable, reports the Integration_Dependency, and produces no mutation request for every Application and action combination.
10. **CP-10 — Future status-action confirmation semantics** *(property-based with a mocked approved adapter; Requirements 7.6–7.10; blocked by D1)*: For every candidate and target status, cancellation emits no mutation request; success updates the Status_Badge only from the returned status; failure preserves the prior source-backed status and exposes an Error_State. This property becomes executable only after an approved mutation integration exists.
11. **CP-11 — Keyboard-dialog round trip** *(component integration test; Requirements 9.4–9.7)*: Opening a Confirmation_Dialog moves keyboard focus into the Confirmation_Dialog, and closing the Confirmation_Dialog returns focus to the originating control for each Application_Status_Action.
12. **CP-12 — Phase 1 isolation regression** *(representative smoke test; Requirements 1.5 and 10.5)*: Loading Phase 2 routes does not alter the supported rendering and navigation of Protected_Phase_1.
13. **CP-13 — Production build gate** *(single build test; Requirement 10.1)*: The completed implementation exits successfully from `npm run build`.

## Review Requested

Please review the scope, field-persistence disclosures, and Integration_Dependencies—especially D1 (application status mutation), D2 (job field persistence), and D4 (candidate profile data gaps). After approval or feedback, the workflow can proceed to the design phase; no design or task document has been created yet.
