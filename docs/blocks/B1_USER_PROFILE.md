# Block B1 - User Profile & Settings

> **Block ID**: B1
> **Block Name**: User Profile & Settings
> **Directory**: `src/blocks/b1-user-profile/`
> **Status**: Specification Complete
> **Last Updated**: 2026-02-19

---

## 1. Purpose

This block owns everything related to the authenticated user's profile, preferences, and account settings. It provides the onboarding experience for new users and the settings interface for returning users. It is the single source of truth for user identity data beyond authentication (which lives in the foundation layer).

---

## 2. Table Ownership

### Owns

#### `user_profiles`

| Column                  | Type                          | Default            | Nullable | Description                                  |
|-------------------------|-------------------------------|--------------------|---------:|----------------------------------------------|
| `id`                    | `uuid` PK                    | `gen_random_uuid()`| No       | Profile ID                                   |
| `user_id`               | `uuid` FK -> `auth.users.id` | -                  | No       | Supabase Auth user reference (unique)        |
| `display_name`          | `text`                        | -                  | No       | User's chosen display name                   |
| `email`                 | `text`                        | -                  | No       | Synced from auth, displayed in settings      |
| `avatar_url`            | `text`                        | `null`             | Yes      | URL to avatar in Supabase Storage            |
| `timezone`              | `text`                        | `'UTC'`            | No       | IANA timezone string (e.g., `America/New_York`) |
| `theme`                 | `text`                        | `'system'`         | No       | One of: `light`, `dark`, `system`            |
| `motivation_style`      | `text`                        | `'balanced'`       | No       | One of: `gentle`, `balanced`, `drill_sergeant` |
| `experience_level`      | `text`                        | `'beginner'`       | No       | One of: `beginner`, `intermediate`, `advanced` |
| `learning_goals`        | `text[]`                      | `'{}'`             | No       | Array of free-text learning goals            |
| `preferred_days`        | `text[]`                      | `'{}'`             | No       | Array of days: `mon`, `tue`, `wed`, etc.     |
| `preferred_time_start`  | `time`                        | `'09:00'`          | Yes      | Preferred study window start                 |
| `preferred_time_end`    | `time`                        | `'17:00'`          | Yes      | Preferred study window end                   |
| `daily_study_goal_mins` | `integer`                     | `60`               | No       | Daily study target in minutes                |
| `weekly_study_goal_mins`| `integer`                     | `300`              | No       | Weekly study target in minutes               |
| `notify_email`          | `boolean`                     | `true`             | No       | Email notifications enabled                  |
| `notify_push`           | `boolean`                     | `true`             | No       | Push notifications enabled                   |
| `notify_slack`          | `boolean`                     | `false`            | No       | Slack notifications enabled                  |
| `notify_discord`        | `boolean`                     | `false`            | No       | Discord notifications enabled                |
| `notify_daily_reminder` | `boolean`                     | `true`             | No       | Daily study reminder                         |
| `notify_streak_warning` | `boolean`                     | `true`             | No       | Streak about to break warning                |
| `notify_weekly_report`  | `boolean`                     | `true`             | No       | Weekly progress report                       |
| `notify_achievement`    | `boolean`                     | `true`             | No       | Achievement unlocked notification            |
| `notify_risk_alert`     | `boolean`                     | `true`             | No       | Course at-risk alert                         |
| `slack_webhook_url`     | `text`                        | `null`             | Yes      | Slack incoming webhook URL                   |
| `discord_webhook_url`   | `text`                        | `null`             | Yes      | Discord incoming webhook URL                 |
| `onboarding_completed`  | `boolean`                     | `false`            | No       | Whether onboarding wizard was completed      |
| `onboarding_step`       | `integer`                     | `0`                | No       | Current onboarding step (0-5, 5 = done)      |
| `created_at`            | `timestamptz`                 | `now()`            | No       | Row creation timestamp                       |
| `updated_at`            | `timestamptz`                 | `now()`            | No       | Last update timestamp (auto via trigger)     |

**RLS Policies**:
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

**Indexes**:
- `UNIQUE` on `user_id`
- `INDEX` on `created_at`

**Triggers**:
- `updated_at` auto-set via `moddatetime` trigger

### Reads

None. This block only accesses its own table.

---

## 3. Routes

| Route                      | Page Component         | Auth Required | Description                          |
|----------------------------|------------------------|:------------:|---------------------------------------|
| `/onboarding`              | `OnboardingPage`       | Yes          | Multi-step onboarding wizard          |
| `/settings`                | `SettingsPage`         | Yes          | Main settings (redirects to /profile) |
| `/settings/profile`        | `SettingsProfilePage`  | Yes          | Profile editing tab                   |
| `/settings/notifications`  | `SettingsNotifsPage`   | Yes          | Notification preferences tab          |
| `/settings/integrations`   | `SettingsIntegrPage`   | Yes          | Slack/Discord webhook config tab      |
| `/settings/account`        | `SettingsAccountPage`  | Yes          | Account management tab                |

**Middleware Behavior**:
- If `onboarding_completed === false`, redirect ALL routes (except `/onboarding`) to `/onboarding`.
- If `onboarding_completed === true` and user navigates to `/onboarding`, redirect to `/settings/profile`.

---

## 4. Files to Create

```
src/blocks/b1-user-profile/
  components/
    onboarding-wizard.tsx          # Multi-step wizard container (5 steps)
    onboarding-step-welcome.tsx    # Step 1: Welcome message + display name input
    onboarding-step-goals.tsx      # Step 2: Learning goals (multi-select tags + custom)
    onboarding-step-schedule.tsx   # Step 3: Preferred days checkboxes + time range + daily goal
    onboarding-step-style.tsx      # Step 4: Motivation style picker (3 cards)
    onboarding-step-complete.tsx   # Step 5: Summary of choices + "Start Learning" CTA
    profile-form.tsx               # Profile edit form (name, avatar, timezone, theme, style)
    avatar-upload.tsx              # Avatar upload with drag-drop, crop preview, size validation
    notification-prefs.tsx         # Notification preferences grid (type x channel matrix)
    integration-settings.tsx       # Slack/Discord webhook URL inputs + test buttons
    account-settings.tsx           # Email change, password change, export data, delete account
    theme-toggle.tsx               # Light/dark/system segmented toggle
    timezone-select.tsx            # Searchable timezone dropdown with current time preview
    settings-sidebar.tsx           # Left sidebar with tab navigation for settings
  hooks/
    use-profile.ts                 # React Query hook: fetch + cache user profile
    use-onboarding.ts              # Onboarding wizard state machine (step, data, navigation)
    use-avatar-upload.ts           # Avatar file upload state + Supabase Storage integration
  actions/
    profile-actions.ts             # Server actions: updateProfile, completeOnboarding, deleteAccount
    notification-actions.ts        # Server actions: updateNotificationPrefs, testWebhook
    account-actions.ts             # Server actions: changeEmail, changePassword, exportData, deleteAccount
  lib/
    profile-validation.ts          # Zod schemas: profileSchema, onboardingStepSchemas, webhookSchema
    timezones.ts                   # Timezone list with labels and UTC offsets
    motivation-styles.ts           # Motivation style definitions (label, description, icon, examples)
```

---

## 5. UI Mockups

### 5.1 Onboarding Wizard

```
+===========================================================================+
|  LOGO   Course Accountability Tracker                                     |
+===========================================================================+
|                                                                           |
|   Step 1          Step 2         Step 3        Step 4        Step 5       |
|   [*Welcome*] --- [ Goals ] --- [Schedule] --- [ Style ] --- [Complete]   |
|   =========       --------       --------       --------      --------    |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|                                                                           |
|              Welcome to Course Accountability Tracker!                    |
|                                                                           |
|              Let's set up your profile so we can help you                 |
|              stay on track with your learning goals.                      |
|                                                                           |
|              What should we call you?                                     |
|                                                                           |
|              +------------------------------------------+                 |
|              | John Doe                                  |                 |
|              +------------------------------------------+                 |
|                                                                           |
|              Experience Level:                                            |
|              +------------------------------------------+                 |
|              | Beginner                             [v] |                 |
|              +------------------------------------------+                 |
|                                                                           |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|                                         [ Next -> ]                       |
|                                                                           |
+---------------------------------------------------------------------------+
```

### 5.2 Onboarding Step 2 - Learning Goals

```
+---------------------------------------------------------------------------+
|                                                                           |
|   Step 1          Step 2         Step 3        Step 4        Step 5       |
|   [Welcome ] --- [*Goals*] --- [Schedule] --- [ Style ] --- [Complete]    |
|   ---------       =======       --------       --------      --------    |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              What are your learning goals?                                |
|                                                                           |
|              Select all that apply, or add your own:                      |
|                                                                           |
|              [x] Career advancement                                       |
|              [x] Learn a new programming language                         |
|              [ ] Get certified                                            |
|              [ ] Build a side project                                     |
|              [ ] Switch careers                                           |
|              [ ] Stay current with technology                             |
|              [ ] Personal interest                                        |
|                                                                           |
|              Custom goal:                                                 |
|              +------------------------------------------+  [ + Add ]     |
|              |                                          |                 |
|              +------------------------------------------+                 |
|                                                                           |
|              Added: [Master system design  x]                             |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              [ <- Back ]                    [ Next -> ]                    |
|                                                                           |
+---------------------------------------------------------------------------+
```

### 5.3 Onboarding Step 3 - Schedule

```
+---------------------------------------------------------------------------+
|                                                                           |
|   Step 1          Step 2         Step 3        Step 4        Step 5       |
|   [Welcome ] --- [ Goals ] --- [*Schedule*]--- [ Style ] --- [Complete]   |
|   ---------       --------       =========      --------      --------   |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              When do you prefer to study?                                 |
|                                                                           |
|              Select your preferred study days:                            |
|                                                                           |
|              [x]Mon  [x]Tue  [x]Wed  [ ]Thu  [x]Fri  [ ]Sat  [ ]Sun     |
|                                                                           |
|              Preferred study window:                                      |
|              +----------+          +----------+                           |
|              | 09:00 AM |   to     | 12:00 PM |                           |
|              +----------+          +----------+                           |
|                                                                           |
|              Daily study goal:                                            |
|              +----------+                                                 |
|              |  60 min  |  (recommended: 30-120 min)                      |
|              +----------+                                                 |
|                                                                           |
|              Weekly study goal:                                           |
|              +----------+                                                 |
|              | 300 min  |  (5 hours/week)                                 |
|              +----------+                                                 |
|                                                                           |
|              Timezone:                                                    |
|              +------------------------------------------+                 |
|              | America/New_York (UTC-5)             [v] |                 |
|              +------------------------------------------+                 |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              [ <- Back ]                    [ Next -> ]                    |
|                                                                           |
+---------------------------------------------------------------------------+
```

### 5.4 Onboarding Step 4 - Motivation Style

```
+---------------------------------------------------------------------------+
|                                                                           |
|   Step 1          Step 2         Step 3        Step 4        Step 5       |
|   [Welcome ] --- [ Goals ] --- [Schedule] --- [*Style*] --- [Complete]    |
|   ---------       --------       --------      ========      --------    |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              How would you like to be motivated?                          |
|                                                                           |
|   +--------------------+ +--------------------+ +--------------------+    |
|   |                    | |   ===============  | |                    |    |
|   |    Gentle          | |    Balanced        | |   Drill Sergeant   |    |
|   |                    | |   (recommended)    | |                    |    |
|   |  Encouraging and   | |  Mix of praise     | |  Direct, no-      |    |
|   |  supportive. Soft  | |  and accountability| |  nonsense style.   |    |
|   |  reminders, lots   | |  Celebrates wins,  | |  Firm deadlines,   |    |
|   |  of praise.        | |  flags concerns.   | |  blunt feedback.   |    |
|   |                    | |                    | |                    |    |
|   |  "Great job        | |  "Solid progress!  | |  "You missed your  |    |
|   |   studying today!" | |   But you're 2     | |   session. No      |    |
|   |                    | |   days behind."    | |   excuses. Go."    |    |
|   |    ( ) Select      | |    (*) Selected    | |    ( ) Select      |    |
|   +--------------------+ +--------------------+ +--------------------+    |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              [ <- Back ]                    [ Next -> ]                    |
|                                                                           |
+---------------------------------------------------------------------------+
```

### 5.5 Onboarding Step 5 - Complete

```
+---------------------------------------------------------------------------+
|                                                                           |
|   Step 1          Step 2         Step 3        Step 4        Step 5       |
|   [Welcome ] --- [ Goals ] --- [Schedule] --- [ Style ] --- [*Complete*]  |
|   ---------       --------       --------      --------      =========   |
|                                                                           |
+---------------------------------------------------------------------------+
|                                                                           |
|              You're all set, John!                                        |
|                                                                           |
|              Here's a summary of your preferences:                        |
|                                                                           |
|              +-----------------------------------------------+            |
|              |  Name:       John Doe                         |            |
|              |  Level:      Beginner                         |            |
|              |  Goals:      Career advancement,              |            |
|              |              Learn a new language,             |            |
|              |              Master system design              |            |
|              |  Days:       Mon, Tue, Wed, Fri               |            |
|              |  Window:     09:00 AM - 12:00 PM              |            |
|              |  Daily Goal: 60 min                           |            |
|              |  Style:      Balanced                         |            |
|              |  Timezone:   America/New_York                 |            |
|              +-----------------------------------------------+            |
|                                                                           |
|              You can change these anytime in Settings.                    |
|                                                                           |
|              +-------------------------------------------+                |
|              |          [ Start Learning -> ]             |                |
|              +-------------------------------------------+                |
|                                                                           |
+---------------------------------------------------------------------------+
```

### 5.6 Settings Page - Profile Tab

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Settings |  Profile Settings                                             |
|           |  ------------------------------------------------------------ |
|  [*] Profile |                                                            |
|  [ ] Notifs  |  Avatar                                                    |
|  [ ] Integr  |  +--------+                                               |
|  [ ] Account |  |  [img]  |   [ Upload New ]  [ Remove ]                  |
|           |  +--------+   Max 2MB. JPG, PNG, or WebP.                     |
|           |                                                               |
|           |  Display Name                                                 |
|           |  +------------------------------------------+                 |
|           |  | John Doe                                  |                 |
|           |  +------------------------------------------+                 |
|           |                                                               |
|           |  Email (read-only here, change in Account tab)                |
|           |  +------------------------------------------+                 |
|           |  | john@example.com                     [!]  |                 |
|           |  +------------------------------------------+                 |
|           |                                                               |
|           |  Timezone                                                     |
|           |  +------------------------------------------+                 |
|           |  | America/New_York (UTC-5)             [v] |                 |
|           |  +------------------------------------------+                 |
|           |                                                               |
|           |  Theme                                                        |
|           |  [ Light ] [*Dark*] [ System ]                                |
|           |                                                               |
|           |  Motivation Style                                             |
|           |  +------------------------------------------+                 |
|           |  | Balanced                             [v] |                 |
|           |  +------------------------------------------+                 |
|           |                                                               |
|           |  Experience Level                                             |
|           |  +------------------------------------------+                 |
|           |  | Beginner                             [v] |                 |
|           |  +------------------------------------------+                 |
|           |                                                               |
|           |  Daily Study Goal                                             |
|           |  +------------------------------------------+                 |
|           |  | 60 minutes                               |                 |
|           |  +------------------------------------------+                 |
|           |                                                               |
|           |           [ Save Changes ]                                    |
|           |                                                               |
+===========================================================================+
```

### 5.7 Settings Page - Notifications Tab

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Settings |  Notification Preferences                                     |
|           |  ------------------------------------------------------------ |
|  [ ] Profile |                                                            |
|  [*] Notifs  |                  Email    Push    Slack   Discord           |
|  [ ] Integr  |                  -----    -----   -----   -------          |
|  [ ] Account |  Daily           [x]      [x]     [ ]     [ ]              |
|           |  Reminder                                                     |
|           |                                                               |
|           |  Streak            [x]      [x]     [ ]     [ ]               |
|           |  Warning                                                      |
|           |                                                               |
|           |  Weekly            [x]      [ ]     [ ]     [ ]               |
|           |  Report                                                       |
|           |                                                               |
|           |  Achievement       [x]      [x]     [ ]     [ ]               |
|           |  Unlocked                                                     |
|           |                                                               |
|           |  Course At-Risk    [x]      [x]     [x]     [ ]               |
|           |  Alert                                                        |
|           |                                                               |
|           |  ------------------------------------------------------------ |
|           |                                                               |
|           |  Channel Toggles (master switches)                            |
|           |  Email:   [x] enabled                                         |
|           |  Push:    [x] enabled                                         |
|           |  Slack:   [ ] disabled  (configure in Integrations tab)        |
|           |  Discord: [ ] disabled  (configure in Integrations tab)        |
|           |                                                               |
|           |           [ Save Preferences ]                                |
|           |                                                               |
+===========================================================================+
```

### 5.8 Settings Page - Integrations Tab

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Settings |  Integrations                                                 |
|           |  ------------------------------------------------------------ |
|  [ ] Profile |                                                            |
|  [ ] Notifs  |  Slack Integration                                         |
|  [*] Integr  |  Send notifications to a Slack channel via webhook.        |
|  [ ] Account |                                                            |
|           |  Webhook URL                                                  |
|           |  +----------------------------------------------+  [ Test ]   |
|           |  | https://hooks.slack.com/services/T00/B00/xxx  |             |
|           |  +----------------------------------------------+             |
|           |  Status: Connected (last test: 2 hours ago)                   |
|           |                                                               |
|           |  ------------------------------------------------------------ |
|           |                                                               |
|           |  Discord Integration                                          |
|           |  Send notifications to a Discord channel via webhook.         |
|           |                                                               |
|           |  Webhook URL                                                  |
|           |  +----------------------------------------------+  [ Test ]   |
|           |  | (not configured)                              |             |
|           |  +----------------------------------------------+             |
|           |  Status: Not connected                                        |
|           |                                                               |
|           |  ------------------------------------------------------------ |
|           |                                                               |
|           |  How to set up webhooks:                                      |
|           |  - Slack: Apps > Incoming Webhooks > Add New                  |
|           |  - Discord: Server Settings > Integrations > Webhooks         |
|           |                                                               |
|           |           [ Save Integrations ]                               |
|           |                                                               |
+===========================================================================+
```

### 5.9 Settings Page - Account Tab

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Settings |  Account Settings                                             |
|           |  ------------------------------------------------------------ |
|  [ ] Profile |                                                            |
|  [ ] Notifs  |  Change Email                                              |
|  [ ] Integr  |  Current: john@example.com                                 |
|  [*] Account |                                                            |
|           |  New Email                                                    |
|           |  +------------------------------------------+                 |
|           |  |                                          |                 |
|           |  +------------------------------------------+                 |
|           |  [ Update Email ]                                             |
|           |                                                               |
|           |  ------------------------------------------------------------ |
|           |                                                               |
|           |  Change Password                                              |
|           |  Current Password                                             |
|           |  +------------------------------------------+                 |
|           |  |                                          |                 |
|           |  +------------------------------------------+                 |
|           |  New Password                                                 |
|           |  +------------------------------------------+                 |
|           |  |                                          |                 |
|           |  +------------------------------------------+                 |
|           |  Confirm New Password                                         |
|           |  +------------------------------------------+                 |
|           |  |                                          |                 |
|           |  +------------------------------------------+                 |
|           |  [ Update Password ]                                          |
|           |                                                               |
|           |  ------------------------------------------------------------ |
|           |                                                               |
|           |  Export Data                                                   |
|           |  Download all your data as JSON.                              |
|           |  [ Export My Data ]                                            |
|           |                                                               |
|           |  ------------------------------------------------------------ |
|           |                                                               |
|           |  Danger Zone                                 +--------------+ |
|           |  Permanently delete your account             | Delete       | |
|           |  and all associated data.                    | Account      | |
|           |  This action cannot be undone.               +--------------+ |
|           |                                                               |
+===========================================================================+
```

---

## 6. Component Tree

```
OnboardingPage
└── OnboardingWizard
    ├── StepIndicator (shows steps 1-5, highlights current)
    ├── OnboardingStepWelcome       (step === 1)
    │   ├── Input (display_name)
    │   └── Select (experience_level)
    ├── OnboardingStepGoals         (step === 2)
    │   ├── CheckboxGroup (predefined goals)
    │   ├── Input + AddButton (custom goals)
    │   └── TagList (selected goals with remove)
    ├── OnboardingStepSchedule      (step === 3)
    │   ├── DayCheckboxes (mon-sun)
    │   ├── TimeRangePicker (start, end)
    │   ├── NumberInput (daily_study_goal_mins)
    │   ├── NumberInput (weekly_study_goal_mins)
    │   └── TimezoneSelect
    ├── OnboardingStepStyle         (step === 4)
    │   └── MotivationStyleCards (3 radio cards)
    ├── OnboardingStepComplete      (step === 5)
    │   ├── SummaryCard (all chosen preferences)
    │   └── StartLearningButton
    └── NavigationButtons (Back / Next / Complete)

SettingsPage
├── SettingsSidebar
│   ├── NavLink (/settings/profile)        "Profile"
│   ├── NavLink (/settings/notifications)  "Notifications"
│   ├── NavLink (/settings/integrations)   "Integrations"
│   └── NavLink (/settings/account)        "Account"
└── <Outlet> (tab content rendered here)

SettingsProfilePage
└── ProfileForm
    ├── AvatarUpload
    │   ├── AvatarPreview (current image or initials)
    │   ├── UploadButton (file input, drag-drop zone)
    │   └── RemoveButton
    ├── Input (display_name, required, min 2 chars)
    ├── Input (email, read-only, links to Account tab)
    ├── TimezoneSelect
    │   ├── SearchInput
    │   └── TimezoneList (grouped by region)
    ├── ThemeToggle
    │   └── SegmentedControl (light | dark | system)
    ├── Select (motivation_style)
    ├── Select (experience_level)
    ├── NumberInput (daily_study_goal_mins)
    ├── NumberInput (weekly_study_goal_mins)
    └── SaveButton (disabled until dirty)

SettingsNotifsPage
└── NotificationPrefs
    ├── NotificationGrid
    │   └── Row (per notification type) x Column (per channel)
    │       └── Toggle (checkbox)
    ├── ChannelMasterSwitches
    │   ├── Toggle (email)
    │   ├── Toggle (push)
    │   ├── Toggle (slack, disabled if no webhook)
    │   └── Toggle (discord, disabled if no webhook)
    └── SaveButton

SettingsIntegrPage
└── IntegrationSettings
    ├── SlackSection
    │   ├── Input (slack_webhook_url, type=url)
    │   ├── TestButton (sends test message)
    │   └── StatusIndicator (connected / not connected / error)
    ├── DiscordSection
    │   ├── Input (discord_webhook_url, type=url)
    │   ├── TestButton (sends test message)
    │   └── StatusIndicator
    ├── SetupInstructions (collapsible)
    └── SaveButton

SettingsAccountPage
└── AccountSettings
    ├── ChangeEmailForm
    │   ├── Input (new_email)
    │   └── SubmitButton
    ├── ChangePasswordForm
    │   ├── Input (current_password, type=password)
    │   ├── Input (new_password, type=password)
    │   ├── Input (confirm_password, type=password)
    │   ├── PasswordStrengthIndicator
    │   └── SubmitButton
    ├── ExportDataSection
    │   └── ExportButton (downloads JSON)
    └── DangerZone
        └── DeleteAccountButton
            └── ConfirmationDialog
                ├── WarningText
                ├── Input (type "DELETE" to confirm)
                └── ConfirmDeleteButton (destructive variant)
```

---

## 7. Hooks

### `use-profile.ts`

```typescript
// Returns:
{
  profile: UserProfile | null;       // Current user profile
  isLoading: boolean;                // Initial fetch loading
  error: Error | null;               // Fetch error
  refetch: () => void;               // Manual refetch
}

// React Query key: ['profile', userId]
// Stale time: 5 minutes
// Refetches on window focus
```

### `use-onboarding.ts`

```typescript
// Returns:
{
  step: number;                       // Current step (1-5)
  data: OnboardingData;              // Accumulated form data across steps
  isFirstStep: boolean;
  isLastStep: boolean;
  goNext: () => void;                // Advance step (validates current)
  goBack: () => void;                // Go to previous step
  setStepData: (data: Partial<OnboardingData>) => void;
  complete: () => Promise<void>;     // Submit all data, mark complete
  isCompleting: boolean;             // Submission in progress
}
```

### `use-avatar-upload.ts`

```typescript
// Returns:
{
  upload: (file: File) => Promise<string>;  // Upload, returns URL
  remove: () => Promise<void>;              // Remove current avatar
  isUploading: boolean;
  progress: number;                          // 0-100
  error: string | null;
}

// Validates: max 2MB, JPG/PNG/WebP only
// Uploads to Supabase Storage bucket: 'avatars'
// Path: avatars/{userId}/{timestamp}.{ext}
```

---

## 8. Server Actions

### `profile-actions.ts`

| Action                | Input                        | Output               | Description                                   |
|-----------------------|------------------------------|-----------------------|-----------------------------------------------|
| `getProfile`          | -                            | `UserProfile`         | Get current user's profile                    |
| `updateProfile`       | `Partial<UserProfile>`       | `UserProfile`         | Update profile fields                         |
| `completeOnboarding`  | `OnboardingData`             | `UserProfile`         | Save all onboarding data, set completed=true  |
| `updateOnboardingStep`| `{ step: number }`           | `void`                | Persist current onboarding step               |

### `notification-actions.ts`

| Action                  | Input                         | Output            | Description                               |
|-------------------------|-------------------------------|--------------------|-------------------------------------------|
| `updateNotificationPrefs` | `NotificationPrefs`        | `UserProfile`      | Update all notification toggles           |
| `testSlackWebhook`     | `{ url: string }`             | `{ success: boolean, error?: string }` | Send test message to Slack   |
| `testDiscordWebhook`   | `{ url: string }`             | `{ success: boolean, error?: string }` | Send test message to Discord |

### `account-actions.ts`

| Action              | Input                                      | Output               | Description                              |
|---------------------|--------------------------------------------|-----------------------|------------------------------------------|
| `changeEmail`       | `{ newEmail: string }`                     | `{ success: boolean }`| Update email (sends verification)        |
| `changePassword`    | `{ currentPassword, newPassword: string }` | `{ success: boolean }`| Update password                          |
| `exportUserData`    | -                                          | `JSON blob`           | Export all user data as JSON             |
| `deleteAccount`     | `{ confirmation: string }`                 | `void`                | Delete account (confirmation="DELETE")    |

---

## 9. Validation Schemas (Zod)

```typescript
// profile-validation.ts

export const displayNameSchema = z.string().min(2).max(50).trim();

export const profileSchema = z.object({
  display_name: displayNameSchema,
  timezone: z.string().min(1),
  theme: z.enum(['light', 'dark', 'system']),
  motivation_style: z.enum(['gentle', 'balanced', 'drill_sergeant']),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  daily_study_goal_mins: z.number().int().min(10).max(480),
  weekly_study_goal_mins: z.number().int().min(30).max(3360),
});

export const onboardingStep1Schema = z.object({
  display_name: displayNameSchema,
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
});

export const onboardingStep2Schema = z.object({
  learning_goals: z.array(z.string().min(1).max(200)).min(1).max(10),
});

export const onboardingStep3Schema = z.object({
  preferred_days: z.array(z.enum(['mon','tue','wed','thu','fri','sat','sun'])).min(1),
  preferred_time_start: z.string().regex(/^\d{2}:\d{2}$/),
  preferred_time_end: z.string().regex(/^\d{2}:\d{2}$/),
  daily_study_goal_mins: z.number().int().min(10).max(480),
  weekly_study_goal_mins: z.number().int().min(30).max(3360),
  timezone: z.string().min(1),
});

export const onboardingStep4Schema = z.object({
  motivation_style: z.enum(['gentle', 'balanced', 'drill_sergeant']),
});

export const webhookUrlSchema = z.object({
  slack_webhook_url: z.string().url().startsWith('https://hooks.slack.com/').nullable(),
  discord_webhook_url: z.string().url().startsWith('https://discord.com/api/webhooks/').nullable(),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

---

## 10. State Management

| Concern               | Strategy                    | Details                                          |
|-----------------------|-----------------------------|--------------------------------------------------|
| Profile data          | React Query                 | Key: `['profile', userId]`, stale: 5min          |
| Form editing          | Local state (`useState`)    | Dirty tracking via comparison to cached profile   |
| Onboarding wizard     | `useReducer` in `use-onboarding.ts` | Persists step to DB on each navigation  |
| Avatar upload          | Local state in hook         | Progress, error, file reference                   |
| Theme                 | `next-themes` provider      | Persisted to profile + localStorage for SSR       |
| Toast notifications    | `sonner` (via shadcn/ui)    | Success/error feedback on save actions            |

---

## 11. shadcn/ui Components Used

- `Button`, `Input`, `Label`, `Select`, `Textarea`
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Switch` (notification toggles)
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Dialog`, `DialogTrigger`, `DialogContent` (delete confirmation)
- `Separator`
- `Badge` (onboarding step indicator)
- `Progress` (avatar upload progress)
- `Tooltip` (help icons)
- `DropdownMenu` (timezone grouped list)
- `RadioGroup`, `RadioGroupItem` (motivation style cards)
- `Checkbox` (days, goals)

---

## 12. Error Handling

| Scenario                    | Handling                                                        |
|-----------------------------|-----------------------------------------------------------------|
| Profile fetch fails          | Show error state with retry button                              |
| Profile update fails         | Toast error, keep form data, re-enable save button              |
| Avatar upload too large      | Client-side validation before upload, show inline error         |
| Avatar upload wrong type     | Client-side validation, show inline error                       |
| Webhook test fails           | Show error status with message from server                      |
| Email change fails           | Toast error with reason (e.g., "Email already in use")          |
| Password change fails        | Toast error with reason (e.g., "Current password incorrect")    |
| Delete account fails         | Toast error, keep dialog open                                   |
| Onboarding step validation   | Inline field errors, prevent navigation to next step            |
| Network error (any action)   | Toast with "Network error, please try again" + retry suggestion |

---

## 13. Testing Plan

### Unit Tests

| Test                                        | File                          |
|---------------------------------------------|-------------------------------|
| Profile Zod schema validates correct data    | `profile-validation.test.ts`  |
| Profile Zod schema rejects invalid data      | `profile-validation.test.ts`  |
| Onboarding step schemas validate each step   | `profile-validation.test.ts`  |
| Webhook URL validation (Slack format)        | `profile-validation.test.ts`  |
| Webhook URL validation (Discord format)      | `profile-validation.test.ts`  |
| Password change schema (mismatch)            | `profile-validation.test.ts`  |

### Integration Tests

| Test                                              | File                     |
|---------------------------------------------------|--------------------------|
| Onboarding wizard completes all 5 steps           | `onboarding.test.tsx`    |
| Onboarding wizard persists data across steps      | `onboarding.test.tsx`    |
| Onboarding redirects to settings when complete    | `onboarding.test.tsx`    |
| Profile form saves and shows success toast        | `profile-form.test.tsx`  |
| Avatar upload and preview updates                 | `avatar-upload.test.tsx` |
| Notification grid toggles save correctly          | `notif-prefs.test.tsx`   |
| Webhook test button sends request and shows result| `integrations.test.tsx`  |
| Delete account requires "DELETE" confirmation     | `account.test.tsx`       |

### E2E Tests

| Test                                              | File                     |
|---------------------------------------------------|--------------------------|
| New user completes onboarding end-to-end          | `onboarding.e2e.ts`     |
| User updates profile and sees changes persisted   | `settings.e2e.ts`       |
| User changes theme and UI responds                | `settings.e2e.ts`       |

---

## 14. "Do Not Touch" Boundaries

| Boundary                              | Reason                                                                 |
|---------------------------------------|------------------------------------------------------------------------|
| Authentication (login/signup/logout)  | Handled by foundation layer using Supabase Auth. This block only manages profile data AFTER authentication. |
| `auth.users` table                    | Owned by Supabase Auth. This block reads `auth.uid()` but never writes to `auth.users` directly. Email/password changes go through Supabase Auth SDK methods. |
| Study sessions                        | Owned by Block B3. This block does not read or write `study_sessions`. |
| Course data                           | Owned by Block B2. This block does not read or write `courses`.        |
| AI/GPT interactions                   | Owned by a separate block. This block does not call OpenAI APIs.       |
| Push notification delivery            | Owned by a notification service block. This block only stores preferences (enabled/disabled toggles). |

---

## 15. Cross-Block Communication

This block communicates with other blocks **exclusively through the database**:

- **Other blocks READ `user_profiles`** to get:
  - `motivation_style` (for AI prompt tuning)
  - `timezone` (for scheduling and display)
  - `preferred_days` / `preferred_time_start` / `preferred_time_end` (for reminders)
  - `daily_study_goal_mins` / `weekly_study_goal_mins` (for progress calculations)
  - `notify_*` flags (for notification delivery decisions)
  - `slack_webhook_url` / `discord_webhook_url` (for webhook delivery)
  - `display_name` / `avatar_url` (for display in other UIs)

- **This block does NOT import code from other blocks.** No shared components, hooks, or utilities are imported across block boundaries.

---

## 16. Performance Considerations

| Concern                     | Strategy                                                             |
|-----------------------------|----------------------------------------------------------------------|
| Profile fetch frequency      | React Query with 5min stale time; refetch on window focus only       |
| Avatar images                | Supabase Storage with CDN; resize to 256x256 on upload              |
| Timezone list rendering      | Virtualized dropdown for 400+ timezone entries                       |
| Settings page bundle         | Each settings tab is a separate route segment (code-split by Next.js)|
| Onboarding persistence       | Debounced auto-save of current step to prevent data loss             |
