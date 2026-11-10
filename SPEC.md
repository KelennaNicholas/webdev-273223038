# Study Groups - The Research Club

<!-- Exercise 2. Write the non-goals first. Every acceptance criterion must be checkable in under a minute.
     Keep these headings exactly as they are: the self-checks look for them by name.
     The full target is on the course site under Resources → The course project. -->

## Project option
<!-- One line: lab booking, study groups, club events, or the own project the lecturer approved. -->
Study Groups

## Goals
- Help students find and join study groups for subjects they want to learn.
- Let group members coordinate study sessions and share their own study notes.

## Non-goals
 - Non-profit i.e no payment required for anything.
 - It will not require a mobile app
 - The app will not provide AI tutoring or generate study materials; members share their own notes.
## Constraints
- The project must run in GitHub Codespaces with Node.js 22 and Python 3.12.
- The project must be usable in a web browser; using a mobile app must not be required.

## The model feature
<!-- Which model, which modality, and what it does for a user.
     Name three things or the check fails: the input it receives, the output it produces,
     and what happens when the model is slow, rate-limited or wrong. -->
- Model: Google Gemini API, called by the server with `GEMINI_API_KEY`.
- Input: Public study-group names, subjects, and descriptions, plus the student's selected subject of interest; do not send private messages, notes, or account details.
- Output: A ranked list of matching group IDs and short reasons for the matches; verify every ID against the current groups before showing it.
- When it fails: Stop waiting at a fixed timeout, show deterministic subject-match results instead, and keep the rest of the app usable.

## Auth
<!-- Local sign-in plus at least one provider. Say how an account signing in both ways stays one account. -->
- Local: Students register and sign in with email and password; store only a password hash.
- Provider: Google OAuth sign-in, configured with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Linking: A student signed into an existing account can link Google after successfully authenticating with Google; never merge accounts based only on matching email addresses.

## MCP tools
<!-- At least three tools your own MCP server exposes over this project's data.
     Each tool calls the same service functions the HTTP API calls, so the same rules apply.
     A description shorter than 20 characters is not a description. -->
| Tool | What it does | Who may call it |
| --- | --- | --- |
| `search_study_groups` | Finds available study groups by subject and returns their names, descriptions, and group IDs. | Any signed-in student; only groups visible to that student are returned. |
| `join_study_group` | Adds the signed-in student to an open group and returns the membership result. | Any signed-in student; the same eligibility rules as the web app apply. |
| `list_group_sessions` | Lists scheduled study sessions for a group, including each session's date and time. | Signed-in members of that group only. |

## UI
<!-- Stack, and the three or more screens. The graded checklist lives in docs/UI.md. -->
Responsive browser app: React with TypeScript and Vite for the frontend; Node.js 22 with Express for the API; SQLite for persistence. Screens: sign-in and registration; searchable study-groups list; group details with membership, scheduled sessions, and shared notes; member messages; and voice/video call. No mobile app is required.

## Architecture
<!-- Exercise 3. One request traced through every layer, naming the file for each one,
     plus one place where your own code does not match this layering. -->

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->
- [AC-1] A student who registers with a valid email and password sees account confirmation and can sign in with those credentials.
- [AC-2] A student who signs in with the configured identity provider sees their study-group home and is connected to the same account if they linked it to an existing account.
- [AC-3] A signed-in student who creates a study group sees it in the group list, and the group is saved with that student as its creator.
- [AC-4] A student who searches for a subject sees groups matching that subject and no unrelated groups.
- [AC-5] A student who joins an open study group sees it in their memberships, and a membership record is saved for that group and student.
- [AC-6] A group member who schedules a study session sees its date, time, and group on the group's schedule, and the session is saved for that group.
- [AC-7] A group member who sends an in-app message to another member sees it in the conversation, and the recipient can see the same message.
- [AC-8] A group member who uploads study notes sees the note in the group's shared files, and another group member can open or download it.
- [AC-9] A non-member who tries to open a group's shared notes sees an access-denied response and cannot see or download the notes.
- [AC-10] A member who starts a voice or video call with another member sees the call as active, and the other member can join it.
- [AC-11] A signed-in member who uses an MCP tool to perform an available study-group action sees the same permitted result as through the HTTP API, and cannot access data forbidden to them.
- [AC-12] A member who requests a feature never sees a payment prompt or paid-only option, and no payment is required to use any feature.
- [AC-13] A member who requests the model feature while its provider is unavailable or times out sees the deterministic fallback within the configured timeout.

### Slice 1: sign-in and the study groups list

- [AC-14] A student who signs in successfully sees the study-groups list.
- [AC-15] A signed-in student who opens the study-groups list sees each available group's name and subject.
- [AC-16] A signed-in student who opens the study-groups list when no groups are available sees a clear empty-state message.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-1 |  |

## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->
The slice implementation provides sign-in followed by a study-groups list, renders each group's name and subject, and includes an empty-state message. The agent's tests did not fully verify those user-visible outcomes: AC-14 checks only the login API response, AC-15 checks only the first group's name and subject in the API response, and AC-16 does not test an empty database or the empty-state message. These criteria are implemented but are not yet fully demonstrated by automated tests; the spec was not changed.
