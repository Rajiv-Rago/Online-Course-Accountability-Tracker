# Block B8 - Visualization & Charts

> **Block ID**: B8
> **Block Name**: Visualization & Charts
> **Directory**: `src/blocks/b8-visualization/`
> **Status**: Specification Complete
> **Last Updated**: 2026-02-19

---

## 1. Purpose

This block is a **read-only** visualization layer that transforms raw study data into meaningful charts, heatmaps, forecasts, and pattern insights. It reads data from sessions, daily stats, courses, and AI analyses to render six distinct chart types plus AI-detected pattern cards. This block never creates, updates, or deletes data in any table. It exists purely to help users understand their study patterns, track progress visually, and receive data-driven insights about their learning behavior.

---

## 2. Table Ownership

### Owns

**None.** This is a read-only block. It does not own or write to any database table.

### Reads

| Table            | Columns Read                                                                                              | Purpose                                                        |
|------------------|-----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| `study_sessions` | `id`, `user_id`, `course_id`, `started_at`, `ended_at`, `duration_minutes`, `created_at`                  | Heatmap data, hours bar chart, session distribution, leaderboard hours |
| `daily_stats`    | `user_id`, `date`, `total_minutes`, `session_count`, `streak_count`, `courses_studied`                    | Heatmap intensity, streak visualization, consistency tracking   |
| `courses`        | `id`, `user_id`, `title`, `status`, `platform`, `progress_percent`, `total_hours`, `completed_hours`, `target_completion_date`, `created_at` | Progress line chart, completion forecast, course filter options  |
| `ai_analyses`    | `id`, `user_id`, `course_id`, `risk_score`, `analysis_text`, `patterns`, `created_at`                     | Risk trend chart, pattern insights                             |

---

## 3. Routes

| Route                              | Page Component              | Auth Required | Description                                       |
|------------------------------------|-----------------------------|:-------------:|---------------------------------------------------|
| `/visualizations`                  | `VisualizationPage`         | Yes           | Main page with all charts in a responsive grid     |
| `/visualizations/heatmap`          | `HeatmapFullPage`           | Yes           | Full-screen interactive study heatmap              |
| `/visualizations/course/[id]`      | `CourseVisualizationPage`   | Yes           | Charts filtered to a single course                 |

**Middleware Behavior**:
- All `/visualizations/*` routes require authentication.
- If `onboarding_completed === false`, redirect to `/onboarding` (handled by global middleware from B1).
- `/visualizations/course/[id]` validates that the course belongs to the authenticated user; returns 404 if not found or not owned.

---

## 4. Files to Create

```
src/blocks/b8-visualization/
  components/
    visualization-page.tsx        # Main page: chart grid layout with filters
    study-heatmap.tsx             # GitHub-style 365-day heatmap (SVG/Canvas)
    heatmap-day-cell.tsx          # Single day cell: color fill + hover tooltip
    heatmap-legend.tsx            # Color scale legend (Less -> More)
    heatmap-month-labels.tsx      # Month labels along top of heatmap
    heatmap-day-labels.tsx        # Day-of-week labels along left side
    heatmap-tooltip.tsx           # Tooltip: date, minutes, session count
    heatmap-full-page.tsx         # Full-screen heatmap view with controls
    progress-line-chart.tsx       # Multi-line progress chart (% over time per course)
    study-hours-bar-chart.tsx     # Stacked bar chart: hours by day/week/month
    completion-forecast.tsx       # Area chart: projected completion with confidence bands
    risk-trend-chart.tsx          # Line chart: risk score over time with color zones
    session-distribution.tsx      # Histogram: session duration buckets
    pattern-insights.tsx          # Container for AI-detected pattern cards
    pattern-insight-card.tsx      # Single pattern card with mini supporting chart
    chart-range-selector.tsx      # Date range picker: 7d, 30d, 90d, 1y, All
    chart-course-filter.tsx       # Course multi-select dropdown for filtering
    chart-period-toggle.tsx       # Toggle: Day / Week / Month for bar chart grouping
    chart-loading-skeleton.tsx    # Skeleton loader matching chart dimensions
    chart-error-state.tsx         # Error state with retry button for failed chart loads
    chart-wrapper.tsx             # Shared wrapper: title, description, export button, loading/error states
    export-chart-button.tsx       # Export chart as PNG via html2canvas
    empty-chart-state.tsx         # No data state (icon + message + suggestion)
    course-visualization-page.tsx # Single-course view with filtered charts
  hooks/
    use-heatmap-data.ts           # Fetch + format 365 days of heatmap data
    use-progress-timeline.ts      # Fetch progress snapshots over time per course
    use-study-hours-chart.ts      # Fetch hours grouped by period (day/week/month)
    use-completion-forecast.ts    # Calculate forecast from velocity data
    use-risk-trend.ts             # Fetch risk score history from ai_analyses
    use-session-distribution.ts   # Fetch session durations and bucket them
    use-chart-range.ts            # Shared date range state (URL search params)
    use-chart-course-filter.ts    # Shared course filter state (URL search params)
    use-pattern-insights.ts       # Detect patterns from session data
  actions/
    visualization-actions.ts      # Server actions: all chart data fetching
  lib/
    chart-config.ts               # Recharts theme, colors, responsive breakpoints
    chart-utils.ts                # Data transformation utilities for chart libraries
    chart-colors.ts               # Course color palette (10 distinct colors, color-blind safe)
    forecast-calculator.ts        # Linear regression + confidence interval calculation
    heatmap-utils.ts              # 365-day grid generation, intensity mapping
    pattern-detector.ts           # Client-side pattern detection algorithms
    date-utils.ts                 # Date range helpers: week boundaries, month boundaries, relative dates
    export-utils.ts               # Chart-to-PNG export via html2canvas
```

---

## 5. Chart Library

**Primary**: [Recharts](https://recharts.org/) (React-native SVG charting library)

**Rationale**:
- Built on React components (not imperative D3 API)
- Excellent Next.js compatibility (SSR-friendly with dynamic import)
- Responsive container support out of the box
- Composable: mix line, bar, area, and reference elements
- Lightweight bundle compared to Chart.js

**Additional**:
- `html2canvas` for PNG export functionality
- Custom SVG rendering for the heatmap (Recharts does not have a native heatmap component)

**Dynamic Import Strategy**:
All Recharts components are loaded via `next/dynamic` with `ssr: false` to prevent hydration mismatches and reduce initial bundle size.

```typescript
// Example pattern used across all chart components
import dynamic from 'next/dynamic';
const RechartsLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { ssr: false }
);
```

---

## 6. Chart Type Specifications

### 6.1 Study Heatmap (GitHub-style)

**Data Source**: `daily_stats` (365 most recent days)

**Layout**:
- Grid: 53 columns (weeks) x 7 rows (days, Mon-Sun)
- Each cell = 1 day
- Color intensity based on minutes studied that day
- Month labels along the top
- Day-of-week labels along the left (Mon, Wed, Fri shown)

**Color Scale** (5 levels):
| Level     | Minutes Studied | Color (Light Mode)      | Color (Dark Mode)       |
|-----------|-----------------|-------------------------|-------------------------|
| Empty     | 0               | `#ebedf0` (gray-100)    | `#161b22` (gray-900)    |
| Light     | 1 - 30          | `#9be9a8` (green-200)   | `#0e4429` (green-900)   |
| Medium    | 31 - 60         | `#40c463` (green-400)   | `#006d32` (green-700)   |
| Dark      | 61 - 120        | `#30a14e` (green-600)   | `#26a641` (green-500)   |
| Intense   | 121+            | `#216e39` (green-800)   | `#39d353` (green-300)   |

**Interactions**:
- Hover: Show tooltip with date, minutes studied, session count
- Click: Navigate to sessions for that day (or show a popover with session list)
- Legend: Color scale bar at bottom-right

**Implementation**:
- Custom SVG grid (not Recharts; heatmap is not a native Recharts chart type)
- Each cell is a `<rect>` element with click/hover handlers
- Responsive: scales cell size based on container width
- Full-screen view at `/visualizations/heatmap` with zoom controls

### 6.2 Progress Over Time (Line Chart)

**Data Source**: `courses` (progress snapshots over time, derived from `study_sessions` + course progress)

**Axes**:
- X-axis: Date range (filtered by chart-range-selector)
- Y-axis: Completion percentage (0% - 100%)

**Lines**:
- One solid line per active/completed course, color-coded
- Dashed line for projected path (extends from last data point to target date)
- Vertical dashed marker at target completion date per course

**Configuration**:
```typescript
{
  type: 'line',
  xAxis: { dataKey: 'date', type: 'category', tickFormatter: formatDate },
  yAxis: { domain: [0, 100], unit: '%' },
  lines: courses.map(c => ({
    dataKey: c.id,
    name: c.title,
    stroke: courseColor(c.id),
    strokeDasharray: undefined,  // solid for actual
  })),
  referenceLines: courses.map(c => ({
    x: c.targetCompletionDate,
    stroke: courseColor(c.id),
    strokeDasharray: '5 5',
    label: `Target: ${c.title}`,
  })),
  tooltip: { formatter: (value) => `${value}%` },
  legend: { verticalAlign: 'bottom' },
}
```

**Interactions**:
- Hover: Show tooltip with date and % for each course
- Click on legend item: Toggle course line visibility
- Course filter: Show/hide courses from chart-course-filter

### 6.3 Study Hours (Bar Chart)

**Data Source**: `study_sessions` grouped by period

**Grouping Options** (toggle via `chart-period-toggle`):
- **Daily**: One bar per day (last N days based on range)
- **Weekly**: One bar per week (Mon-Sun)
- **Monthly**: One bar per month

**Bar Style**: Stacked by course (each course segment is color-coded)

**Overlays**:
- Horizontal dashed line: Daily/weekly/monthly study goal (from `user_profiles`)
- Toggle option: Switch Y-axis between "Hours" and "Session Count"

**Configuration**:
```typescript
{
  type: 'bar',
  xAxis: { dataKey: 'period', tickFormatter: formatPeriod },
  yAxis: { unit: 'h', label: 'Study Hours' },
  bars: courses.map(c => ({
    dataKey: c.id,
    name: c.title,
    fill: courseColor(c.id),
    stackId: 'hours',
  })),
  referenceLine: {
    y: dailyGoalHours,
    stroke: '#ef4444',
    strokeDasharray: '3 3',
    label: 'Goal',
  },
  tooltip: {
    formatter: (value, name) => [`${value}h`, name],
    labelFormatter: formatPeriodFull,
  },
}
```

**Interactions**:
- Hover: Show tooltip with period, total hours, per-course breakdown
- Click bar segment: Navigate to sessions for that course in that period
- Toggle: Hours vs. Session count on Y-axis

### 6.4 Completion Forecast (Area Chart)

**Data Source**: `courses` + `study_sessions` (computed via linear regression)

**Algorithm** (in `forecast-calculator.ts`):
```
Input: Daily cumulative hours for the last 30 days for a specific course

1. Collect data points: [(day_1, cum_hours_1), (day_2, cum_hours_2), ...]
2. Linear regression: fit y = mx + b where m = rate (hours/day)
3. If m <= 0: forecast = "Stalled" (no progress being made)
4. remaining_hours = course.total_hours - course.completed_hours
5. days_to_completion = remaining_hours / m
6. predicted_date = today + days_to_completion
7. Compute residuals from regression line
8. std_dev = standard deviation of residuals
9. Confidence intervals:
   - 70% band: predicted_date +/- (1.04 * std_dev * sqrt(days_to_completion))
   - 90% band: predicted_date +/- (1.645 * std_dev * sqrt(days_to_completion))
10. Status determination:
    - "Ahead of schedule": predicted_date < target_date - 7 days
    - "On track": predicted_date within +/- 7 days of target_date
    - "Behind schedule": predicted_date > target_date + 7 days
    - "Stalled": m <= 0
```

**Visual Elements**:
- Solid line: Actual cumulative hours over time
- Dashed line: Projected path from today to predicted completion
- Light shaded area: 90% confidence interval
- Darker shaded area: 70% confidence interval
- Vertical solid line: Target completion date
- Vertical dashed line: Predicted completion date
- Status badge: "On Track" (green), "Behind" (orange/red), "Ahead" (blue), "Stalled" (gray)

**Configuration**:
```typescript
{
  type: 'composed',
  xAxis: { dataKey: 'date', type: 'category' },
  yAxis: { unit: 'h', label: 'Cumulative Hours' },
  areas: [
    { dataKey: 'ci90Upper', fill: '#dbeafe', stroke: 'none', baseLine: 'ci90Lower' },
    { dataKey: 'ci70Upper', fill: '#93c5fd', stroke: 'none', baseLine: 'ci70Lower' },
  ],
  lines: [
    { dataKey: 'actual', stroke: '#2563eb', strokeWidth: 2 },
    { dataKey: 'projected', stroke: '#2563eb', strokeDasharray: '5 5' },
  ],
  referenceLines: [
    { x: targetDate, stroke: '#16a34a', label: 'Target' },
    { x: predictedDate, stroke: '#f59e0b', strokeDasharray: '5 5', label: 'Predicted' },
  ],
}
```

### 6.5 Risk Score Trend (Line Chart)

**Data Source**: `ai_analyses` (risk_score field over time)

**Axes**:
- X-axis: Date range
- Y-axis: Risk score (0 - 100)

**Color Zones** (horizontal background bands):
| Zone    | Score Range | Color            | Label            |
|---------|-------------|------------------|------------------|
| Green   | 0 - 25      | `#dcfce7` (bg)   | Low Risk         |
| Yellow  | 26 - 50     | `#fef9c3` (bg)   | Moderate Risk    |
| Orange  | 51 - 75     | `#ffedd5` (bg)   | High Risk        |
| Red     | 76 - 100    | `#fecaca` (bg)   | Critical Risk    |

**Views**:
- **Aggregate**: Single line showing average risk across all courses
- **Per-course**: One line per course (color-coded), togglable via legend

**Configuration**:
```typescript
{
  type: 'composed',
  xAxis: { dataKey: 'date' },
  yAxis: { domain: [0, 100], ticks: [0, 25, 50, 75, 100] },
  referenceAreas: [
    { y1: 0, y2: 25, fill: '#dcfce7', fillOpacity: 0.5 },
    { y1: 25, y2: 50, fill: '#fef9c3', fillOpacity: 0.5 },
    { y1: 50, y2: 75, fill: '#ffedd5', fillOpacity: 0.5 },
    { y1: 75, y2: 100, fill: '#fecaca', fillOpacity: 0.5 },
  ],
  lines: courses.map(c => ({
    dataKey: c.id,
    name: c.title,
    stroke: courseColor(c.id),
  })),
}
```

**Interactions**:
- Hover: Show tooltip with date, risk score per course, risk level label
- Click legend item: Toggle course visibility
- Dropdown: Switch between aggregate and per-course view

### 6.6 Session Duration Distribution (Histogram)

**Data Source**: `study_sessions` (duration_minutes)

**Buckets**:
| Bucket    | Range (minutes) | Label    |
|-----------|-----------------|----------|
| Bucket 1  | 0 - 15          | 0-15m    |
| Bucket 2  | 16 - 30         | 16-30m   |
| Bucket 3  | 31 - 45         | 31-45m   |
| Bucket 4  | 46 - 60         | 46-60m   |
| Bucket 5  | 61 - 90         | 61-90m   |
| Bucket 6  | 91 - 120        | 91-120m  |
| Bucket 7  | 121+            | 120m+    |

**Visual Elements**:
- Vertical bars: Session count per bucket
- Vertical dashed line: Average session duration
- Bar color: Primary theme color (or color-coded by course if filtered)

**Configuration**:
```typescript
{
  type: 'bar',
  xAxis: { dataKey: 'bucket', label: 'Duration (minutes)' },
  yAxis: { label: 'Number of Sessions' },
  bars: [
    { dataKey: 'count', fill: '#6366f1', name: 'Sessions' },
  ],
  referenceLine: {
    x: averageBucketIndex,
    stroke: '#ef4444',
    strokeDasharray: '5 5',
    label: `Avg: ${avgDuration}min`,
  },
}
```

**Interactions**:
- Hover: Show tooltip with bucket range and exact session count
- Filter by course: Show distribution for a specific course only

---

## 7. Pattern Insights

Pattern insights are client-side calculations derived from study session data. They surface behavioral trends to help users optimize their study habits.

### Pattern Detection Algorithms (in `pattern-detector.ts`)

```typescript
interface PatternInsight {
  id: string;
  title: string;           // Human-readable insight
  description: string;     // Longer explanation
  confidence: number;      // 0-1 confidence score
  supportingData: {        // Data for mini chart
    labels: string[];
    values: number[];
    chartType: 'bar' | 'line' | 'donut';
  };
  category: 'timing' | 'duration' | 'consistency' | 'productivity';
}
```

### Pattern Types

| Pattern                    | Detection Method                                                                      | Example Output                                       |
|----------------------------|---------------------------------------------------------------------------------------|------------------------------------------------------|
| Best study day             | Group sessions by day-of-week, find day with highest avg minutes                       | "You study best on Tuesdays (avg 72 min/session)"    |
| Best study time            | Group sessions by hour-of-day (buckets of 2h), find peak                               | "Your peak study time is 7-9 PM"                     |
| Optimal session length     | Correlate session duration with next-day study likelihood                               | "Your optimal session length is 45-60 minutes"       |
| Morning vs evening         | Compare avg productivity (minutes) for sessions before/after 12 PM                     | "You're 20% more productive in evening sessions"     |
| Streak momentum            | Analyze study consistency after streaks of different lengths                            | "Your consistency improves after 3-day streaks"      |
| Weekend vs weekday         | Compare avg hours on weekdays vs weekends                                              | "You study 40% more on weekdays than weekends"       |
| Course switching cost      | Measure if sessions are shorter when user switches courses vs staying on one            | "Staying on one course per day boosts focus by 15%"  |
| Frequency preference       | Analyze if user prefers many short sessions or fewer long ones                         | "You prefer 2-3 focused sessions of ~45 min each"    |

### Display Rules

- Only show patterns with confidence >= 0.7 (70%)
- Maximum 4 pattern cards displayed at once
- Requires at least 14 days of data and 10+ sessions to detect patterns
- Each card includes a mini chart (sparkline bar or line) showing supporting data
- Patterns recalculate when date range or course filter changes

---

## 8. UI Mockups

### 8.1 Main Visualization Page

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Dashboard|  Insights & Visualizations                                    |
|  Courses  |  ============================================================|
|  Sessions |                                                               |
|  AI Coach |  Filters:                                                     |
|  Social   |  Course: [All Courses          v]   Range: [30 days     v]    |
|  Charts   |                                                               |
|  Settings |  ------------------------------------------------------------|
|           |                                                               |
|           |  Study Heatmap (Last 12 Months)            [ Full Screen ]    |
|           |  +-------------------------------------------------------+   |
|           |  |      Jan     Feb     Mar     Apr     May     Jun       |   |
|           |  | Mon  ░░░▓▓▓░░░███░░░▓▓▓░░░███▓▓▓░░░▓▓▓███░░░███░░░▓▓ |   |
|           |  | Tue  ▓▓▓░░░███▓▓▓░░░▓▓▓███░░░▓▓▓░░░███░░░▓▓▓░░░███▓▓ |   |
|           |  | Wed  ░░░▓▓▓░░░███▓▓▓░░░▓▓▓░░░███▓▓▓░░░███░░░▓▓▓███░░ |   |
|           |  | Thu  ▓▓▓░░░███░░░▓▓▓███░░░▓▓▓░░░███░░░▓▓▓███░░░▓▓▓░░ |   |
|           |  | Fri  ░░░▓▓▓░░░███░░░▓▓▓███░░░███▓▓▓░░░▓▓▓░░░███▓▓▓░░ |   |
|           |  | Sat  ░░░░░░▓▓▓░░░░░░░░░▓▓▓░░░░░░░░░▓▓▓░░░░░░▓▓▓░░░░░ |   |
|           |  | Sun  ░░░░░░░░░▓▓▓░░░░░░░░░░░░▓▓▓░░░░░░░░░▓▓▓░░░░░░░░ |   |
|           |  |                                                        |   |
|           |  |  Less ░░ ▒▒ ▓▓ ██ More         Total: 312 hours       |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  +---------------------------+ +---------------------------+  |
|           |  | Study Hours               | | Progress Over Time        |  |
|           |  | [Day] [*Week*] [Month]    | |                           |  |
|           |  |                           | |         ___..--""         |  |
|           |  |         ██                | |    __--"                  |  |
|           |  |      ██ ██                | |  _/     ---- React       |  |
|           |  |   ██ ██ ██ ██     ---goal | | /       ---- Python      |  |
|           |  |   ██ ██ ██ ██ ██         | |"        ---- Node.js     |  |
|           |  |   W1 W2 W3 W4 W5         | |  Feb    Mar     Apr      |  |
|           |  |                  [Export] | |                  [Export] |  |
|           |  +---------------------------+ +---------------------------+  |
|           |                                                               |
|           |  +---------------------------+ +---------------------------+  |
|           |  | Completion Forecast       | | Risk Score Trend          |  |
|           |  |                           | |                           |  |
|           |  |       .--""""""--Target   | |  ___                      |  |
|           |  |    .-"  /////////  |      | | /   \___     ___          |  |
|           |  |   /  //////////   |      | |/       \___/   \___      |  |
|           |  |  / /////Predicted |      | |  Low       Med    High   |  |
|           |  | /                  |      | |                           |  |
|           |  |  [On Track]       |      | | [Aggregate v]             |  |
|           |  |                  [Export] | |                  [Export] |  |
|           |  +---------------------------+ +---------------------------+  |
|           |                                                               |
|           |  +---------------------------+                                |
|           |  | Session Distribution      |                                |
|           |  |                           |                                |
|           |  |        ██                 |                                |
|           |  |     ██ ██ ██              |                                |
|           |  |  ██ ██ ██ ██ ██           |                                |
|           |  |  ██ ██ ██ ██ ██ ██        |                                |
|           |  |  15 30 45 60 90 120 min   |                                |
|           |  |        | Avg: 47min       |                                |
|           |  |                  [Export] |                                |
|           |  +---------------------------+                                |
|           |                                                               |
|           |  Pattern Insights                                             |
|           |  ------------------------------------------------------------|
|           |                                                               |
|           |  +---------------------------+ +---------------------------+  |
|           |  | Timing                    | | Duration                  |  |
|           |  |                           | |                           |  |
|           |  | You study best on         | | Your optimal session      |  |
|           |  | Tuesdays at 7 PM          | | length is 45-60 minutes   |  |
|           |  |                           | |                           |  |
|           |  | [mini bar chart showing   | | [mini bar chart showing   |  |
|           |  |  avg mins by day of week] | |  next-day rate by length] |  |
|           |  |                           | |                           |  |
|           |  | Confidence: 87%           | | Confidence: 82%           |  |
|           |  +---------------------------+ +---------------------------+  |
|           |                                                               |
|           |  +---------------------------+ +---------------------------+  |
|           |  | Productivity              | | Consistency               |  |
|           |  |                           | |                           |  |
|           |  | 20% more productive       | | Your consistency          |  |
|           |  | in evening sessions       | | improves after 3-day      |  |
|           |  |                           | | streaks                   |  |
|           |  | [mini bar: morning vs     | | [mini line: consistency   |  |
|           |  |  evening productivity]    | |  after streak lengths]    |  |
|           |  |                           | |                           |  |
|           |  | Confidence: 74%           | | Confidence: 71%           |  |
|           |  +---------------------------+ +---------------------------+  |
|           |                                                               |
+===========================================================================+
```

### 8.2 Full-Screen Heatmap

```
+===========================================================================+
|  [ < Back to Visualizations ]              Study Heatmap     [ Export ]   |
+===========================================================================+
|                                                                           |
|  Year: [< 2025]  [2026 >]                                                |
|                                                                           |
|       Jan      Feb      Mar      Apr      May      Jun      Jul          |
|  Mon  ░░░░▓▓▓▓░░░░████░░░░▓▓▓▓░░░░████▓▓▓▓░░░░▓▓▓▓████░░░░████░░░░▓▓▓▓ |
|  Tue  ▓▓▓▓░░░░████▓▓▓▓░░░░▓▓▓▓████░░░░▓▓▓▓░░░░████░░░░▓▓▓▓░░░░████▓▓▓▓ |
|  Wed  ░░░░▓▓▓▓░░░░████▓▓▓▓░░░░▓▓▓▓░░░░████▓▓▓▓░░░░████░░░░▓▓▓▓████░░░░ |
|  Thu  ▓▓▓▓░░░░████░░░░▓▓▓▓████░░░░▓▓▓▓░░░░████░░░░▓▓▓▓████░░░░▓▓▓▓░░░░ |
|  Fri  ░░░░▓▓▓▓░░░░████░░░░▓▓▓▓████░░░░████▓▓▓▓░░░░▓▓▓▓░░░░████▓▓▓▓░░░░ |
|  Sat  ░░░░░░░░▓▓▓▓░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░▓▓▓▓░░░░░░░░▓▓▓▓░░░░░░░░ |
|  Sun  ░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░ |
|                                                                           |
|       Aug      Sep      Oct      Nov      Dec                            |
|  Mon  ▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓ |
|  Tue  ████░░░░▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓████░░░░▓▓▓▓████ |
|  Wed  ░░░░▓▓▓▓████░░░░▓▓▓▓░░░░████▓▓▓▓░░░░████░░░░▓▓▓▓████░░░░▓▓▓▓████ |
|  Thu  ████░░░░▓▓▓▓░░░░████▓▓▓▓░░░░████░░░░▓▓▓▓████░░░░▓▓▓▓░░░░████▓▓▓▓ |
|  Fri  ▓▓▓▓████░░░░████░░░░▓▓▓▓████░░░░████░░░░▓▓▓▓████░░░░████▓▓▓▓░░░░ |
|  Sat  ░░░░░░░░▓▓▓▓░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░░░░ |
|  Sun  ░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ |
|                                                                           |
|  Less ░░ ▒▒ ▓▓ ██ More                                                   |
|                                                                           |
|  Summary: 312 hours across 487 sessions in 2026                          |
|  Longest streak: 22 days (Feb 1 - Feb 22)                                |
|  Most active day: Tuesdays (avg 48 min)                                  |
|  Most active month: February (38.5 hours)                                |
|                                                                           |
|  +------------------------------------------------------------------+    |
|  |  Hovering: Tuesday, February 17, 2026                            |    |
|  |  67 minutes studied (2 sessions)                                 |    |
|  |  Sessions: React Masterclass (45min), Python Basics (22min)       |    |
|  +------------------------------------------------------------------+    |
|                                                                           |
+===========================================================================+
```

### 8.3 Course-Specific Visualization Page

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Dashboard|  [ < Back ]  React Masterclass - Visualizations              |
|  Courses  |  ============================================================|
|  Sessions |                                                               |
|  AI Coach |  Range: [30 days     v]                                       |
|  Social   |                                                               |
|  Charts   |  +-------------------------------------------------------+   |
|  Settings |  | Progress Over Time                                     |   |
|           |  |                                                        |   |
|           |  |                            .----""" Target: Apr 15     |   |
|           |  |                       .-"" |                           |   |
|           |  |                  .--""     |                           |   |
|           |  |            .--""           |                           |   |
|           |  |       __--"               |                           |   |
|           |  |  __--"                    |                           |   |
|           |  | "                         |                           |   |
|           |  | 0%                                              100%  |   |
|           |  |  Feb 1    Feb 8    Feb 15   Feb 22   Mar 1            |   |
|           |  |  Current: 42%              Status: [On Track]         |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  +---------------------------+ +---------------------------+  |
|           |  | Completion Forecast       | | Risk Score Trend          |  |
|           |  |                           | |                           |  |
|           |  |      ___.---"""Target     | |  25 ----                  |  |
|           |  |   .-"  ////////  |        | |      \                    |  |
|           |  |  /  //////////   |        | |  18   \___  12            |  |
|           |  | /                |        | |            \___           |  |
|           |  |                           | |                           |  |
|           |  | Predicted: Mar 28         | | Current: 12 (Low Risk)    |  |
|           |  | [Ahead of schedule]       | |                           |  |
|           |  +---------------------------+ +---------------------------+  |
|           |                                                               |
|           |  +---------------------------+                                |
|           |  | Session Distribution      |                                |
|           |  | (React Masterclass only)  |                                |
|           |  |                           |                                |
|           |  |     ██                    |                                |
|           |  |  ██ ██ ██                 |                                |
|           |  |  ██ ██ ██ ██              |                                |
|           |  |  30 45 60 90 min          |                                |
|           |  |     | Avg: 52min          |                                |
|           |  +---------------------------+                                |
|           |                                                               |
+===========================================================================+
```

### 8.4 Chart Range Selector

```
+--------------------------------------------------+
|  Date Range:                                      |
|  [ 7d ] [ 30d ] [*90d*] [ 1y ] [ All ]           |
|                                                    |
|  Or custom:                                        |
|  [ Feb 1, 2026 ] to [ Feb 19, 2026 ]  [ Apply ]  |
+--------------------------------------------------+
```

### 8.5 Chart Loading Skeleton

```
+---------------------------+
| Study Hours               |
| [Day] [Week] [Month]     |
|                           |
| ┌─────────────────────┐  |
| │  ░░░░░░░░░░░░░░░░░  │  |
| │  ░░░░░░░░░░░░░░░░░  │  |
| │  ░░░░░░░░░░░░░░░░░  │  |
| │  ░░░░░░░░░░░░░░░░░  │  |
| │  ░░░░░░░░░░░░░░░░░  │  |
| └─────────────────────┘  |
|                           |
+---------------------------+
```

### 8.6 Empty Chart State

```
+---------------------------+
|                           |
|  [bar-chart-icon]         |
|                           |
|  No Study Data Yet        |
|                           |
|  Start logging study      |
|  sessions to see your     |
|  progress visualized      |
|  here.                    |
|                           |
|  [ Log a Session ]        |
|                           |
+---------------------------+
```

### 8.7 Chart Error State

```
+---------------------------+
|                           |
|  [alert-circle-icon]      |
|                           |
|  Failed to Load Chart     |
|                           |
|  Something went wrong     |
|  loading this chart.      |
|                           |
|  [ Retry ]                |
|                           |
+---------------------------+
```

### 8.8 Pattern Insight Card (Detail)

```
+-----------------------------------------------+
|  Timing                                        |
|                                                |
|  You study best on Tuesdays at 7 PM           |
|                                                |
|  Based on your last 30 days, your Tuesday     |
|  evening sessions average 72 minutes vs       |
|  48 minutes on other days.                     |
|                                                |
|  [Mini bar chart]                              |
|   Mon  Tue  Wed  Thu  Fri  Sat  Sun           |
|   ██   ████ ██   ███  ██   █    █             |
|   48   72   45   61   50   22   15            |
|                                                |
|  Confidence: 87%                               |
+-----------------------------------------------+
```

---

## 9. Component Tree

```
VisualizationPage
├── PageHeader ("Insights & Visualizations")
├── FilterBar
│   ├── ChartCourseFilter
│   │   ├── MultiSelect (course list from user's courses)
│   │   └── "All Courses" default option
│   └── ChartRangeSelector
│       ├── SegmentedControl (7d, 30d, 90d, 1y, All)
│       └── CustomDateRange (optional, collapsible)
│           ├── DatePicker (start)
│           ├── DatePicker (end)
│           └── ApplyButton
├── StudyHeatmap
│   ├── HeatmapMonthLabels
│   ├── HeatmapDayLabels
│   ├── HeatmapGrid
│   │   └── HeatmapDayCell (x 365)
│   │       └── HeatmapTooltip (on hover)
│   ├── HeatmapLegend
│   └── FullScreenLink
├── ChartGrid (2-column responsive, 1-column on mobile)
│   ├── ChartWrapper (title="Study Hours")
│   │   ├── ChartPeriodToggle (Day / Week / Month)
│   │   ├── StudyHoursBarChart | ChartLoadingSkeleton | ChartErrorState | EmptyChartState
│   │   └── ExportChartButton
│   ├── ChartWrapper (title="Progress Over Time")
│   │   ├── ProgressLineChart | ChartLoadingSkeleton | ChartErrorState | EmptyChartState
│   │   └── ExportChartButton
│   ├── ChartWrapper (title="Completion Forecast")
│   │   ├── CompletionForecast | ChartLoadingSkeleton | ChartErrorState | EmptyChartState
│   │   └── ExportChartButton
│   ├── ChartWrapper (title="Risk Score Trend")
│   │   ├── ViewToggle (Aggregate / Per-Course)
│   │   ├── RiskTrendChart | ChartLoadingSkeleton | ChartErrorState | EmptyChartState
│   │   └── ExportChartButton
│   └── ChartWrapper (title="Session Distribution")
│       ├── SessionDistribution | ChartLoadingSkeleton | ChartErrorState | EmptyChartState
│       └── ExportChartButton
└── PatternInsights
    ├── SectionHeader ("Pattern Insights")
    ├── PatternInsightCard (x N, max 4)
    │   ├── CategoryBadge
    │   ├── InsightTitle
    │   ├── InsightDescription
    │   ├── MiniChart (bar/line/donut)
    │   └── ConfidenceBadge
    └── InsufficientDataMessage (when < 14 days or < 10 sessions)

HeatmapFullPage
├── BackButton
├── YearSelector (prev / next year)
├── StudyHeatmap (full-width, larger cells)
├── HeatmapSummaryStats
│   ├── TotalHours
│   ├── TotalSessions
│   ├── LongestStreak
│   ├── MostActiveDay
│   └── MostActiveMonth
├── DayDetailPopover (on cell click)
│   ├── Date
│   ├── TotalMinutes
│   └── SessionList (course name + duration)
└── ExportChartButton

CourseVisualizationPage
├── BackButton
├── CourseHeader (title, status, progress %)
├── ChartRangeSelector
├── ProgressLineChart (single course, full width)
├── ChartGrid (2-column)
│   ├── CompletionForecast (single course)
│   ├── RiskTrendChart (single course)
│   └── SessionDistribution (filtered to course)
└── EmptyChartState (when course has no sessions)
```

---

## 10. Hooks

### `use-heatmap-data.ts`

```typescript
// Input: year (number, default current year)
// Returns:
{
  data: HeatmapDay[];              // 365 entries, one per day
  totalHours: number;
  totalSessions: number;
  longestStreak: number;
  mostActiveDay: string;           // Day of week name
  mostActiveMonth: string;         // Month name
  isLoading: boolean;
  error: Error | null;
}

// HeatmapDay shape:
{
  date: string;                    // ISO date (YYYY-MM-DD)
  minutes: number;                 // Total minutes studied
  sessionCount: number;            // Number of sessions
  level: 0 | 1 | 2 | 3 | 4;      // Color intensity level
}

// React Query key: ['heatmap', userId, year]
// Stale time: 10 minutes
```

### `use-progress-timeline.ts`

```typescript
// Input: courseIds (string[]), dateRange (DateRange)
// Returns:
{
  data: ProgressDataPoint[];
  courses: { id: string; title: string; color: string }[];
  isLoading: boolean;
  error: Error | null;
}

// ProgressDataPoint shape:
{
  date: string;                    // ISO date
  [courseId: string]: number;      // Progress percentage per course
}

// React Query key: ['progress-timeline', courseIds, dateRange]
// Stale time: 5 minutes
```

### `use-study-hours-chart.ts`

```typescript
// Input: courseIds (string[]), dateRange (DateRange), period ('day' | 'week' | 'month')
// Returns:
{
  data: StudyHoursDataPoint[];
  courses: { id: string; title: string; color: string }[];
  totalHours: number;
  goalLine: number;                // Goal hours per period
  isLoading: boolean;
  error: Error | null;
}

// StudyHoursDataPoint shape:
{
  period: string;                  // Label (e.g., "Feb 17", "W7", "Feb")
  total: number;                   // Total hours in this period
  [courseId: string]: number;      // Hours per course in this period
}

// React Query key: ['study-hours', courseIds, dateRange, period]
// Stale time: 5 minutes
```

### `use-completion-forecast.ts`

```typescript
// Input: courseId (string)
// Returns:
{
  data: ForecastDataPoint[];       // Historical + projected data points
  predictedDate: string | null;    // ISO date of predicted completion
  targetDate: string | null;       // ISO date of target completion
  status: 'ahead' | 'on_track' | 'behind' | 'stalled';
  confidence70: { earliest: string; latest: string };  // 70% confidence interval dates
  confidence90: { earliest: string; latest: string };  // 90% confidence interval dates
  velocity: number;                // Hours per day (slope of regression)
  isLoading: boolean;
  error: Error | null;
}

// ForecastDataPoint shape:
{
  date: string;
  actual: number | null;           // Actual cumulative hours (null for future)
  projected: number | null;        // Projected cumulative hours (null for past)
  ci70Upper: number | null;        // 70% CI upper bound
  ci70Lower: number | null;        // 70% CI lower bound
  ci90Upper: number | null;        // 90% CI upper bound
  ci90Lower: number | null;        // 90% CI lower bound
}

// React Query key: ['forecast', courseId]
// Stale time: 10 minutes
```

### `use-risk-trend.ts`

```typescript
// Input: courseIds (string[]), dateRange (DateRange)
// Returns:
{
  data: RiskDataPoint[];
  courses: { id: string; title: string; color: string }[];
  currentRisk: { [courseId: string]: number };   // Latest risk score per course
  aggregateRisk: number;           // Average across all courses
  isLoading: boolean;
  error: Error | null;
}

// RiskDataPoint shape:
{
  date: string;
  aggregate: number;               // Average risk score across courses
  [courseId: string]: number;      // Risk score per course
}

// React Query key: ['risk-trend', courseIds, dateRange]
// Stale time: 5 minutes
```

### `use-session-distribution.ts`

```typescript
// Input: courseIds (string[]), dateRange (DateRange)
// Returns:
{
  data: DistributionBucket[];
  averageDuration: number;         // Average session duration in minutes
  totalSessions: number;
  medianDuration: number;
  isLoading: boolean;
  error: Error | null;
}

// DistributionBucket shape:
{
  bucket: string;                  // Label (e.g., "0-15m", "16-30m")
  min: number;                     // Bucket lower bound (minutes)
  max: number;                     // Bucket upper bound (minutes, Infinity for last)
  count: number;                   // Number of sessions in this bucket
  percentage: number;              // Percentage of total sessions
}

// React Query key: ['session-distribution', courseIds, dateRange]
// Stale time: 5 minutes
```

### `use-chart-range.ts`

```typescript
// Returns:
{
  range: '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';
  startDate: Date;
  endDate: Date;
  setRange: (range: string) => void;
  setCustomRange: (start: Date, end: Date) => void;
}

// State is synced with URL search params: ?range=30d or ?start=2026-01-01&end=2026-02-19
// Default: 30d
```

### `use-chart-course-filter.ts`

```typescript
// Returns:
{
  selectedCourseIds: string[];      // Empty array means "all courses"
  setSelectedCourseIds: (ids: string[]) => void;
  courses: { id: string; title: string; color: string }[];  // All user's courses
  isAllSelected: boolean;
}

// State is synced with URL search params: ?courses=id1,id2,id3
// Default: all courses (empty param)
```

### `use-pattern-insights.ts`

```typescript
// Input: dateRange (DateRange), courseIds (string[])
// Returns:
{
  insights: PatternInsight[];       // Max 4, sorted by confidence desc
  hasSufficientData: boolean;      // >= 14 days and >= 10 sessions
  isLoading: boolean;
  error: Error | null;
}

// Computation runs client-side after session data is fetched
// React Query key: ['pattern-insights', dateRange, courseIds]
// Stale time: 10 minutes
```

---

## 11. Server Actions

### `visualization-actions.ts`

| Action                      | Input                                               | Output                    | Description                                              |
|-----------------------------|-----------------------------------------------------|---------------------------|----------------------------------------------------------|
| `getHeatmapData`            | `{ year: number }`                                  | `HeatmapDay[]`            | Get daily study data for a full year                     |
| `getProgressTimeline`       | `{ courseIds: string[], dateRange: DateRange }`      | `ProgressDataPoint[]`     | Get progress snapshots over time per course              |
| `getStudyHoursData`         | `{ courseIds: string[], dateRange: DateRange, period: string }` | `StudyHoursDataPoint[]` | Get study hours grouped by period               |
| `getForecastData`           | `{ courseId: string }`                               | `ForecastRawData`         | Get raw data for forecast computation (last 30d cumulative hours) |
| `getRiskTrendData`          | `{ courseIds: string[], dateRange: DateRange }`      | `RiskDataPoint[]`         | Get risk scores over time from ai_analyses               |
| `getSessionDistribution`    | `{ courseIds: string[], dateRange: DateRange }`      | `SessionDuration[]`       | Get all session durations for bucketing                  |
| `getSessionsForDay`         | `{ date: string }`                                   | `DaySession[]`            | Get sessions for a specific day (heatmap click)          |
| `getUserCourses`            | -                                                    | `CourseOption[]`           | Get list of user's courses for filter dropdown           |

**Note**: All server actions validate that the authenticated user owns the requested data via `auth.uid()`. Course IDs are validated against the user's courses before querying.

---

## 12. Validation Schemas (Zod)

```typescript
// In visualization-actions.ts (inline schemas for server action inputs)

import { z } from 'zod';

export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'Start date must be before end date',
});

export const heatmapInputSchema = z.object({
  year: z.number().int().min(2020).max(2030),
});

export const progressTimelineInputSchema = z.object({
  courseIds: z.array(z.string().uuid()).default([]),
  dateRange: dateRangeSchema,
});

export const studyHoursInputSchema = z.object({
  courseIds: z.array(z.string().uuid()).default([]),
  dateRange: dateRangeSchema,
  period: z.enum(['day', 'week', 'month']),
});

export const forecastInputSchema = z.object({
  courseId: z.string().uuid(),
});

export const riskTrendInputSchema = z.object({
  courseIds: z.array(z.string().uuid()).default([]),
  dateRange: dateRangeSchema,
});

export const sessionDistributionInputSchema = z.object({
  courseIds: z.array(z.string().uuid()).default([]),
  dateRange: dateRangeSchema,
});

export const sessionsForDayInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});
```

---

## 13. Library Configuration

### `chart-config.ts`

```typescript
// Recharts theme configuration
export const chartTheme = {
  light: {
    background: '#ffffff',
    text: '#1f2937',
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltip: {
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#1f2937',
    },
  },
  dark: {
    background: '#0f172a',
    text: '#f1f5f9',
    grid: '#334155',
    axis: '#94a3b8',
    tooltip: {
      background: '#1e293b',
      border: '#334155',
      text: '#f1f5f9',
    },
  },
};

// Responsive breakpoints for chart dimensions
export const chartBreakpoints = {
  sm: { width: 350, height: 200 },
  md: { width: 500, height: 280 },
  lg: { width: 700, height: 350 },
  xl: { width: 900, height: 400 },
};

// Default Recharts props applied to all charts
export const defaultChartProps = {
  margin: { top: 10, right: 30, left: 0, bottom: 0 },
  animationDuration: 300,
  animationEasing: 'ease-in-out' as const,
};
```

### `chart-colors.ts`

```typescript
// 10 distinct, color-blind safe colors for course differentiation
export const courseColors = [
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#16a34a', // green-600
  '#9333ea', // purple-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#c026d3', // fuchsia-600
  '#ca8a04', // yellow-600
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
];

// Assign stable color to a course based on its index in the user's course list
export function getCourseColor(courseIndex: number): string {
  return courseColors[courseIndex % courseColors.length];
}

// Risk score zone colors
export const riskZoneColors = {
  low:      { bg: '#dcfce7', line: '#16a34a' },  // green
  moderate: { bg: '#fef9c3', line: '#ca8a04' },  // yellow
  high:     { bg: '#ffedd5', line: '#ea580c' },  // orange
  critical: { bg: '#fecaca', line: '#dc2626' },  // red
};

// Heatmap intensity colors (light mode)
export const heatmapColorsLight = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
// Heatmap intensity colors (dark mode)
export const heatmapColorsDark  = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
```

---

## 14. Forecast Calculator Detail

### `forecast-calculator.ts`

```typescript
interface ForecastInput {
  dailyCumulativeHours: { date: string; hours: number }[];  // Last 30 days
  totalCourseHours: number;
  completedHours: number;
  targetDate: string;              // ISO date
}

interface ForecastResult {
  predictedDate: string | null;    // null if stalled
  status: 'ahead' | 'on_track' | 'behind' | 'stalled';
  velocity: number;                // hours per day
  confidence70: { earliest: string; latest: string };
  confidence90: { earliest: string; latest: string };
  projectedPoints: { date: string; hours: number; ci70: [number, number]; ci90: [number, number] }[];
}

// Linear regression implementation:
function linearRegression(points: [number, number][]): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  const sumX = points.reduce((s, [x]) => s + x, 0);
  const sumY = points.reduce((s, [, y]) => s + y, 0);
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = points.reduce((s, [x]) => s + x * x, 0);
  const sumY2 = points.reduce((s, [, y]) => s + y * y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = points.reduce((s, [x, y]) => s + (y - (slope * x + intercept)) ** 2, 0);
  const ssTot = points.reduce((s, [, y]) => s + (y - sumY / n) ** 2, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

// Confidence interval calculation:
// std_error = sqrt(sum((actual - predicted)^2) / (n - 2))
// For a future point at distance d from mean:
// CI = predicted +/- t_value * std_error * sqrt(1 + 1/n + (d - mean_x)^2 / sum((x - mean_x)^2))
// t_value for 70% CI ~ 1.04, for 90% CI ~ 1.645 (approximation for large n)
```

---

## 15. State Management

| Concern                  | Strategy                           | Details                                                                  |
|--------------------------|------------------------------------|--------------------------------------------------------------------------|
| Heatmap data             | React Query                        | Key: `['heatmap', userId, year]`, stale: 10min                           |
| Progress timeline        | React Query                        | Key: `['progress-timeline', courseIds, dateRange]`, stale: 5min          |
| Study hours              | React Query                        | Key: `['study-hours', courseIds, dateRange, period]`, stale: 5min        |
| Forecast data            | React Query                        | Key: `['forecast', courseId]`, stale: 10min                              |
| Risk trend               | React Query                        | Key: `['risk-trend', courseIds, dateRange]`, stale: 5min                 |
| Session distribution     | React Query                        | Key: `['session-distribution', courseIds, dateRange]`, stale: 5min       |
| Pattern insights         | React Query (derived client-side)  | Key: `['pattern-insights', dateRange, courseIds]`, stale: 10min          |
| Date range selection     | URL search params                  | `?range=30d` or `?start=...&end=...`, synced via `use-chart-range`      |
| Course filter selection  | URL search params                  | `?courses=id1,id2`, synced via `use-chart-course-filter`                 |
| Period toggle (bar chart)| Local state (`useState`)           | Day / Week / Month toggle, not persisted in URL                          |
| Risk view toggle         | Local state (`useState`)           | Aggregate / Per-course toggle                                            |
| Heatmap year             | URL search params                  | `?year=2026`, only on full-screen heatmap page                           |
| Chart data transformations| `useMemo`                         | Memoize expensive data reshaping for Recharts                            |
| Theme (chart colors)     | Read from `next-themes`            | Charts adapt colors based on light/dark mode                             |

---

## 16. shadcn/ui Components Used

- `Card`, `CardHeader`, `CardContent`, `CardFooter` (chart wrappers)
- `Button` (export, full-screen, retry, period toggles)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` (course filter, range selector)
- `Badge` (status badges: On Track, Behind, Ahead, Stalled)
- `Tabs`, `TabsList`, `TabsTrigger` (period toggle: Day/Week/Month)
- `Tooltip`, `TooltipTrigger`, `TooltipContent` (chart data tooltips, info icons)
- `Popover`, `PopoverTrigger`, `PopoverContent` (heatmap day detail, custom date range)
- `Skeleton` (chart loading skeletons)
- `Separator` (between chart sections)
- `Calendar` (custom date range picker)
- `ToggleGroup`, `ToggleGroupItem` (range selector: 7d/30d/90d/1y/All)
- `ScrollArea` (horizontal scroll on mobile for wide charts)

---

## 17. Error Handling

| Scenario                          | Handling                                                                      |
|-----------------------------------|-------------------------------------------------------------------------------|
| Chart data fetch fails            | Show `ChartErrorState` with retry button inside the chart wrapper             |
| No data for selected range        | Show `EmptyChartState` with message and suggestion to adjust range            |
| No data at all (new user)         | Show `EmptyChartState` with CTA to log first session                          |
| Course not found (course view)    | Return 404 page                                                              |
| Course not owned by user          | Return 404 page (do not reveal course exists)                                 |
| Forecast calculation fails        | Show "Insufficient data" message (need >= 7 data points for regression)       |
| Pattern detection insufficient    | Show "Need more data" message (require 14+ days, 10+ sessions)               |
| PNG export fails                  | Toast error "Export failed, please try again"                                 |
| Recharts render error             | Error boundary wrapping each chart, shows `ChartErrorState` on catch          |
| Network error (any action)        | `ChartErrorState` with "Network error" message and retry button               |
| Invalid date range (custom)       | Client-side validation: end must be after start, max 2 year range             |
| Too much data (performance)       | Server actions aggregate data if range > 1 year to reduce payload size        |

---

## 18. Testing Plan

### Unit Tests

| Test                                                        | File                               |
|-------------------------------------------------------------|------------------------------------|
| Forecast calculator: linear regression with known data      | `forecast-calculator.test.ts`      |
| Forecast calculator: handles zero slope (stalled)           | `forecast-calculator.test.ts`      |
| Forecast calculator: confidence intervals widen over time   | `forecast-calculator.test.ts`      |
| Forecast calculator: status determination (ahead/on-track/behind) | `forecast-calculator.test.ts` |
| Heatmap utils: generates correct 365-day grid               | `heatmap-utils.test.ts`           |
| Heatmap utils: assigns correct intensity levels             | `heatmap-utils.test.ts`           |
| Heatmap utils: handles leap years                           | `heatmap-utils.test.ts`           |
| Chart utils: groups sessions by day correctly               | `chart-utils.test.ts`             |
| Chart utils: groups sessions by week (Mon-Sun)              | `chart-utils.test.ts`             |
| Chart utils: groups sessions by month                       | `chart-utils.test.ts`             |
| Chart utils: stacks hours by course correctly               | `chart-utils.test.ts`             |
| Pattern detector: identifies best study day                 | `pattern-detector.test.ts`        |
| Pattern detector: identifies optimal session length         | `pattern-detector.test.ts`        |
| Pattern detector: returns empty for insufficient data       | `pattern-detector.test.ts`        |
| Pattern detector: confidence scores are 0-1 range           | `pattern-detector.test.ts`        |
| Date utils: correct week boundaries (Monday start)          | `date-utils.test.ts`              |
| Date utils: date range calculation for presets              | `date-utils.test.ts`              |
| Chart colors: stable color assignment per course index      | `chart-colors.test.ts`            |
| Distribution bucketing: correct session counting            | `chart-utils.test.ts`             |
| Distribution bucketing: handles edge cases (0 min, 999 min) | `chart-utils.test.ts`            |
| Validation schemas: accept valid inputs                     | `visualization-validation.test.ts` |
| Validation schemas: reject invalid date ranges              | `visualization-validation.test.ts` |

### Integration Tests

| Test                                                              | File                               |
|-------------------------------------------------------------------|-------------------------------------|
| Heatmap renders with correct number of cells                      | `study-heatmap.test.tsx`           |
| Heatmap tooltip shows correct data on hover                       | `study-heatmap.test.tsx`           |
| Bar chart switches between day/week/month groupings               | `study-hours-bar-chart.test.tsx`   |
| Line chart shows/hides courses on legend click                    | `progress-line-chart.test.tsx`     |
| Forecast chart shows correct status badge                         | `completion-forecast.test.tsx`     |
| Risk chart renders color zones correctly                          | `risk-trend-chart.test.tsx`        |
| Course filter updates all charts when changed                     | `chart-filters.test.tsx`           |
| Range selector updates all charts when changed                    | `chart-filters.test.tsx`           |
| Empty state displays when no data                                 | `empty-states.test.tsx`            |
| Error state displays with retry button on fetch failure           | `error-states.test.tsx`            |
| Loading skeleton displays during data fetch                       | `loading-states.test.tsx`          |
| Pattern insights only show when sufficient data exists            | `pattern-insights.test.tsx`        |
| Course visualization page loads for valid course ID               | `course-visualization.test.tsx`    |
| Export button generates PNG download                              | `export-chart.test.tsx`            |

### E2E Tests

| Test                                                              | File                      |
|-------------------------------------------------------------------|---------------------------|
| User with data sees all 6 chart types on visualization page       | `visualizations.e2e.ts`   |
| User changes date range and charts update                         | `visualizations.e2e.ts`   |
| User clicks heatmap day and sees session details                  | `visualizations.e2e.ts`   |
| User navigates to course-specific visualization                   | `visualizations.e2e.ts`   |
| New user with no data sees empty states                           | `visualizations.e2e.ts`   |
| Full-screen heatmap loads and year navigation works               | `visualizations.e2e.ts`   |

---

## 19. "Do Not Touch" Boundaries

| Boundary                                     | Reason                                                                                        |
|----------------------------------------------|-----------------------------------------------------------------------------------------------|
| Data creation/modification                   | This block is **strictly read-only**. It does NOT create, update, or delete rows in any table. All data is produced by other blocks (B2, B3, B4, B5). |
| Study sessions (CRUD)                        | Owned by Block B3. This block only reads `study_sessions` for chart data.                     |
| Course management (CRUD)                     | Owned by Block B2. This block only reads `courses` for filtering and progress display.        |
| AI analysis / GPT calls                      | Owned by Block B4. This block reads `ai_analyses` for risk scores and patterns but never runs AI analysis itself. |
| Daily stats calculation                      | Owned by the stats calculation block/cron. This block reads the pre-computed `daily_stats`.    |
| Notifications                                | This block does NOT create notifications or send alerts of any kind.                          |
| Social features (buddies, achievements)       | Owned by Block B7. This block does NOT display buddy data or achievements.                    |
| User profile management                      | Owned by Block B1. This block reads user preferences (goals, timezone) for goal lines and date display but never modifies profiles. |

---

## 20. Cross-Block Communication

This block communicates with other blocks **exclusively through the database**:

- **This block READS from other blocks' tables**:
  - `study_sessions` (B3) for all chart data: heatmap, hours, distribution, patterns
  - `daily_stats` (stats block) for heatmap intensity and streak data
  - `courses` (B2) for progress lines, forecast, course filter options, color assignment
  - `ai_analyses` (B4) for risk score trend data

- **Other blocks do NOT need to read from this block** (it owns no tables).

- **This block does NOT import code from other blocks.** No shared components, hooks, or utilities cross block boundaries. All data transformations and chart logic are self-contained within `src/blocks/b8-visualization/lib/`.

---

## 21. Performance Considerations

| Concern                              | Strategy                                                                                |
|--------------------------------------|-----------------------------------------------------------------------------------------|
| Large data sets (365 days heatmap)   | Server-side aggregation; single query with `GROUP BY date` returns max 365 rows          |
| Chart rendering performance          | Recharts with `isAnimationActive={false}` for initial render; enable animation on update |
| Multiple charts on one page          | Each chart fetches independently via React Query; renders with own loading state         |
| Recharts bundle size                 | Dynamic import with `next/dynamic` and `ssr: false` for all Recharts components          |
| Data transformation memos            | `useMemo` for all data reshaping (bucketing, grouping, stacking) to prevent re-computation |
| Heatmap SVG rendering (365 rects)    | Use `React.memo` on `HeatmapDayCell`; avoid re-rendering entire grid on tooltip hover    |
| Mobile responsiveness                | Responsive container sizing; horizontal scroll for wide charts on small screens          |
| Stale data reduction                 | React Query stale times (5-10 min); no unnecessary refetches on tab switches             |
| Export (html2canvas)                 | Run in requestAnimationFrame; show spinner during export; max resolution 2x for quality  |
| URL state sync                       | Debounce URL search param updates to prevent excessive history entries                    |
| Pattern detection computation        | Run in `useMemo` (client-side); data set is already fetched and bounded by date range    |
| Forecast regression                  | Pure computation on max 30 data points; negligible performance impact                    |
