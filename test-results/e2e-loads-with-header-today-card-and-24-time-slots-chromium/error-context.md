# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.js >> loads with header, today card and 24 time slots
- Location: tests/e2e.spec.js:26:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('.schedule-container')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.schedule-container')
    13 × locator resolved to <div class="schedule-container">…</div>
       - unexpected value "hidden"

```

```yaml
- banner:
  - img
  - heading "Daily Scheduler" [level=1]
  - button "‹"
  - text: Friday, September 11, 2026 (viewing)
  - button "›"
  - button "Today"
  - button "Sign in with Google"
  - text: or
  - textbox "email"
  - textbox "password"
  - button "Sign in"
  - combobox "Remind me before start":
    - option "5 min before"
    - option "10 min before"
    - option "15 min before" [selected]
    - option "30 min before"
  - button "Toggle task reminders":
    - img
  - button "Day"
  - button "Week"
  - button "Month"
  - button "Agenda" [pressed]
  - button "Matrix"
  - combobox "Color theme":
    - option "Light" [selected]
    - option "Dark"
    - option "Ocean"
    - option "Forest"
    - option "Sepia"
  - button "Export":
    - img
    - text: Export
  - button "Import":
    - img
    - text: Import
  - button "Clear Done":
    - img
    - text: Clear Done
  - button "Add Task":
    - img
    - text: Add Task
- textbox "Quick add a task... (press Enter)"
- combobox:
  - option "Work" [selected]
  - option "Meeting"
  - option "Personal"
  - option "Break"
  - option "Other"
- combobox:
  - option "Now" [selected]
  - option "12:00 AM"
  - option "12:15 AM"
  - option "12:30 AM"
  - option "12:45 AM"
  - option "1:00 AM"
  - option "1:15 AM"
  - option "1:30 AM"
  - option "1:45 AM"
  - option "2:00 AM"
  - option "2:15 AM"
  - option "2:30 AM"
  - option "2:45 AM"
  - option "3:00 AM"
  - option "3:15 AM"
  - option "3:30 AM"
  - option "3:45 AM"
  - option "4:00 AM"
  - option "4:15 AM"
  - option "4:30 AM"
  - option "4:45 AM"
  - option "5:00 AM"
  - option "5:15 AM"
  - option "5:30 AM"
  - option "5:45 AM"
  - option "6:00 AM"
  - option "6:15 AM"
  - option "6:30 AM"
  - option "6:45 AM"
  - option "7:00 AM"
  - option "7:15 AM"
  - option "7:30 AM"
  - option "7:45 AM"
  - option "8:00 AM"
  - option "8:15 AM"
  - option "8:30 AM"
  - option "8:45 AM"
  - option "9:00 AM"
  - option "9:15 AM"
  - option "9:30 AM"
  - option "9:45 AM"
  - option "10:00 AM"
  - option "10:15 AM"
  - option "10:30 AM"
  - option "10:45 AM"
  - option "11:00 AM"
  - option "11:15 AM"
  - option "11:30 AM"
  - option "11:45 AM"
  - option "12:00 PM"
  - option "12:15 PM"
  - option "12:30 PM"
  - option "12:45 PM"
  - option "1:00 PM"
  - option "1:15 PM"
  - option "1:30 PM"
  - option "1:45 PM"
  - option "2:00 PM"
  - option "2:15 PM"
  - option "2:30 PM"
  - option "2:45 PM"
  - option "3:00 PM"
  - option "3:15 PM"
  - option "3:30 PM"
  - option "3:45 PM"
  - option "4:00 PM"
  - option "4:15 PM"
  - option "4:30 PM"
  - option "4:45 PM"
  - option "5:00 PM"
  - option "5:15 PM"
  - option "5:30 PM"
  - option "5:45 PM"
  - option "6:00 PM"
  - option "6:15 PM"
  - option "6:30 PM"
  - option "6:45 PM"
  - option "7:00 PM"
  - option "7:15 PM"
  - option "7:30 PM"
  - option "7:45 PM"
  - option "8:00 PM"
  - option "8:15 PM"
  - option "8:30 PM"
  - option "8:45 PM"
  - option "9:00 PM"
  - option "9:15 PM"
  - option "9:30 PM"
  - option "9:45 PM"
  - option "10:00 PM"
  - option "10:15 PM"
  - option "10:30 PM"
  - option "10:45 PM"
  - option "11:00 PM"
  - option "11:15 PM"
  - option "11:30 PM"
  - option "11:45 PM"
- complementary:
  - heading "Today" [level=2]:
    - img
    - text: Today
  - text: 01:44:57PM
  - img
  - text: 33% Tasks 3 Done 1 Pending 2 Hours 2.3
  - heading "Weather" [level=2]:
    - img
    - text: Weather
  - text: "☁️ 22°C Overcast H: 28° · L: 19° New York Updated just now"
  - button "Change location"
  - heading "Quote of the Day" [level=2]:
    - img
    - text: Quote of the Day
  - paragraph: "“Simplicity boils down to two steps: identify the essential, eliminate the rest.”"
  - paragraph: — Leo Babauta
  - button "Another quote":
    - img
    - text: Another quote
  - heading "Daily Habits" [level=2]:
    - img
    - text: Daily Habits
  - text: No habits yet. Add one to start a streak!
  - button "Add Habit":
    - img
    - text: Add Habit
  - heading "Focus Timer" [level=2]:
    - img
    - text: Focus Timer
  - text: 25:00 Ready to focus Cycle 1 / 4
  - button "Start"
  - button "Reset"
- main:
  - img
  - text: What's the ONE thing today?
  - textbox "Pick the single most important task for Friday..."
  - button "Set"
  - text: Now 1:00 PM · 45m · until 1:45 PM Lunch break break · low priority
  - button "Focus"
  - button "Edit"
  - button "Done"
  - text: Next Nothing scheduled
  - button "All" [pressed]
  - button "Work"
  - button "Meetings"
  - button "Personal"
  - button "Breaks"
  - button "Other"
  - textbox "Search tasks..."
  - heading "Friday, September 11" [level=3]
  - text: 3 tasks
  - heading "Morning" [level=3]
  - text: 11:00 AM Morning standup meeting meeting 30m Daily team sync
  - checkbox "Mark Morning standup meeting as incomplete" [checked]:
    - img
  - button "Edit Morning standup meeting":
    - img
  - button "Delete Morning standup meeting":
    - img
  - heading "Afternoon" [level=3]
  - text: 12:30 PM Review pull requests work 60m Focus on the auth module
  - checkbox "Mark Review pull requests as complete"
  - button "Edit Review pull requests":
    - img
  - button "Delete Review pull requests":
    - img
  - text: 1:00 PM Lunch break break 45m
  - checkbox "Mark Lunch break as complete"
  - button "Edit Lunch break":
    - img
  - button "Delete Lunch break":
    - img
- dialog "Add New Task":
  - heading "Add New Task" [level=2]
  - text: Task Title
  - textbox "What needs to be done?"
  - text: Date
  - textbox "Pick a date"
  - text: Start Time
  - combobox:
    - option "12:00 AM" [selected]
    - option "12:15 AM"
    - option "12:30 AM"
    - option "12:45 AM"
    - option "1:00 AM"
    - option "1:15 AM"
    - option "1:30 AM"
    - option "1:45 AM"
    - option "2:00 AM"
    - option "2:15 AM"
    - option "2:30 AM"
    - option "2:45 AM"
    - option "3:00 AM"
    - option "3:15 AM"
    - option "3:30 AM"
    - option "3:45 AM"
    - option "4:00 AM"
    - option "4:15 AM"
    - option "4:30 AM"
    - option "4:45 AM"
    - option "5:00 AM"
    - option "5:15 AM"
    - option "5:30 AM"
    - option "5:45 AM"
    - option "6:00 AM"
    - option "6:15 AM"
    - option "6:30 AM"
    - option "6:45 AM"
    - option "7:00 AM"
    - option "7:15 AM"
    - option "7:30 AM"
    - option "7:45 AM"
    - option "8:00 AM"
    - option "8:15 AM"
    - option "8:30 AM"
    - option "8:45 AM"
    - option "9:00 AM"
    - option "9:15 AM"
    - option "9:30 AM"
    - option "9:45 AM"
    - option "10:00 AM"
    - option "10:15 AM"
    - option "10:30 AM"
    - option "10:45 AM"
    - option "11:00 AM"
    - option "11:15 AM"
    - option "11:30 AM"
    - option "11:45 AM"
    - option "12:00 PM"
    - option "12:15 PM"
    - option "12:30 PM"
    - option "12:45 PM"
    - option "1:00 PM"
    - option "1:15 PM"
    - option "1:30 PM"
    - option "1:45 PM"
    - option "2:00 PM"
    - option "2:15 PM"
    - option "2:30 PM"
    - option "2:45 PM"
    - option "3:00 PM"
    - option "3:15 PM"
    - option "3:30 PM"
    - option "3:45 PM"
    - option "4:00 PM"
    - option "4:15 PM"
    - option "4:30 PM"
    - option "4:45 PM"
    - option "5:00 PM"
    - option "5:15 PM"
    - option "5:30 PM"
    - option "5:45 PM"
    - option "6:00 PM"
    - option "6:15 PM"
    - option "6:30 PM"
    - option "6:45 PM"
    - option "7:00 PM"
    - option "7:15 PM"
    - option "7:30 PM"
    - option "7:45 PM"
    - option "8:00 PM"
    - option "8:15 PM"
    - option "8:30 PM"
    - option "8:45 PM"
    - option "9:00 PM"
    - option "9:15 PM"
    - option "9:30 PM"
    - option "9:45 PM"
    - option "10:00 PM"
    - option "10:15 PM"
    - option "10:30 PM"
    - option "10:45 PM"
    - option "11:00 PM"
    - option "11:15 PM"
    - option "11:30 PM"
    - option "11:45 PM"
  - text: Duration
  - combobox:
    - option "15 min"
    - option "30 min" [selected]
    - option "45 min"
    - option "1 hour"
    - option "1.5 hours"
    - option "2 hours"
  - text: Category
  - combobox:
    - option "Work" [selected]
    - option "Meeting"
    - option "Personal"
    - option "Break"
    - option "Other"
  - text: Priority
  - combobox:
    - option "Low"
    - option "Medium" [selected]
    - option "High"
  - text: More Options
  - img
  - text: Ctrl+Enter to save · Esc to close
  - button "Cancel"
  - button "Save Task"
- dialog "Are you sure?":
  - heading "Are you sure?" [level=2]
  - paragraph
  - button "Cancel"
  - button "Delete"
- dialog "New Habit":
  - heading "New Habit" [level=2]
  - text: Habit Name
  - textbox "e.g. Read 20 minutes"
  - text: Category
  - combobox:
    - option "Health" [selected]
    - option "Learning"
    - option "Work"
    - option "Personal"
    - option "Other"
  - text: Target (days/week)
  - combobox:
    - option "1 day"
    - option "2 days"
    - option "3 days"
    - option "4 days"
    - option "5 days" [selected]
    - option "6 days"
    - option "Every day"
  - button "Cancel"
  - button "Add Habit"
- dialog "Focus timer":
  - img
  - text: 25:00 Focusing... Cycle 1 of 4
  - button "Pause"
  - button "Exit"
- status
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.beforeEach(async ({ page }) => {
  4   |   await page.goto('/index.html');
  5   |   // clear all scheduler keys and reload to get fresh state
  6   |   await page.evaluate(() => {
  7   |     Object.keys(localStorage).forEach(k => {
  8   |       if (k.startsWith('daily-scheduler') || k.startsWith('scheduler-')) localStorage.removeItem(k);
  9   |     });
  10  |   });
  11  |   await page.reload();
> 12  |   await expect(page.locator('.schedule-container')).toBeVisible();
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  13  | });
  14  | 
  15  | // Helper to add a task via the modal
  16  | async function addTaskViaModal(page, { title, category = 'work', priority = 'medium' } = {}) {
  17  |   await page.locator('button[onclick="openModal()"]').click();
  18  |   await expect(page.locator('#modalOverlay')).toHaveClass(/open/);
  19  |   await page.locator('#taskTitle').fill(title);
  20  |   await page.locator('#taskCategory').selectOption(category);
  21  |   await page.locator('#taskPriority').selectOption(priority);
  22  |   await page.locator('#modalOverlay').getByRole('button', { name: 'Save Task' }).click();
  23  |   await expect(page.locator('#modalOverlay')).not.toHaveClass(/open/);
  24  | }
  25  | 
  26  | test('loads with header, today card and 24 time slots', async ({ page }) => {
  27  |   await expect(page.locator('h1').first()).toBeVisible();
  28  |   await expect(page.locator('#timerDisplay')).toBeVisible();
  29  |   // 24 hourly slots (0-23)
  30  |   const slots = page.locator('.time-slot');
  31  |   await expect(slots).toHaveCount(24);
  32  |   await expect(page.locator('#themeSelect')).toBeVisible();
  33  |   await expect(page.locator('#dayViewBtn')).toBeVisible();
  34  | });
  35  | 
  36  | test('quick add creates a task', async ({ page }) => {
  37  |   const input = page.locator('#quickInput');
  38  |   await expect(input).toBeVisible();
  39  |   await input.fill('Quick task e2e');
  40  |   await input.press('Enter');
  41  |   await expect(page.locator('.task-item').filter({ hasText: 'Quick task e2e' })).toBeVisible();
  42  | });
  43  | 
  44  | test('modal add with category and priority', async ({ page }) => {
  45  |   await addTaskViaModal(page, { title: 'Modal task E2E', category: 'personal', priority: 'high' });
  46  |   const item = page.locator('.task-item').filter({ hasText: 'Modal task E2E' });
  47  |   await expect(item).toBeVisible();
  48  |   await expect(item.locator('.tag-personal')).toBeVisible();
  49  |   // priority dot
  50  |   await expect(item.locator('.priority-high')).toBeVisible();
  51  | });
  52  | 
  53  | test('toggle task completed', async ({ page }) => {
  54  |   await addTaskViaModal(page, { title: 'Toggle me' });
  55  |   const item = page.locator('.task-item').filter({ hasText: 'Toggle me' });
  56  |   const cb = item.locator('.task-checkbox').first();
  57  |   await cb.click();
  58  |   await expect(item).toHaveClass(/completed/);
  59  |   await cb.click();
  60  |   await expect(item).not.toHaveClass(/completed/);
  61  | });
  62  | 
  63  | test('delete task with confirmation', async ({ page }) => {
  64  |   await addTaskViaModal(page, { title: 'To delete' });
  65  |   const item = page.locator('.task-item').filter({ hasText: 'To delete' });
  66  |   await expect(item).toBeVisible();
  67  |   // hover to reveal actions or click directly
  68  |   await item.hover();
  69  |   await item.getByTitle('Delete').click();
  70  |   // confirm modal appears
  71  |   const confirm = page.locator('#confirmModalOverlay');
  72  |   await expect(confirm).toHaveClass(/open/, { timeout: 3000 });
  73  |   await confirm.getByRole('button', { name: 'Delete' }).click();
  74  |   await expect(item).toHaveCount(0);
  75  |   await expect(page.locator('#toast')).toBeVisible();
  76  | });
  77  | 
  78  | test('category filter hides others', async ({ page }) => {
  79  |   await addTaskViaModal(page, { title: 'Work task filter', category: 'work' });
  80  |   await addTaskViaModal(page, { title: 'Personal filter', category: 'personal' });
  81  |   // click Work filter chip
  82  |   await page.locator('.filter-chip').filter({ hasText: /^Work$/ }).click();
  83  |   await expect(page.locator('.task-item').filter({ hasText: 'Work task filter' })).toBeVisible();
  84  |   await expect(page.locator('.task-item').filter({ hasText: 'Personal filter' })).toHaveCount(0);
  85  |   // reset to All
  86  |   await page.locator('.filter-chip').filter({ hasText: /^All$/ }).click();
  87  |   await expect(page.locator('.task-item').filter({ hasText: 'Personal filter' })).toBeVisible();
  88  | });
  89  | 
  90  | test('search filters by title', async ({ page }) => {
  91  |   await addTaskViaModal(page, { title: 'Alpha searchable' });
  92  |   await addTaskViaModal(page, { title: 'Beta other' });
  93  |   await page.locator('#taskSearch').fill('Alpha');
  94  |   await expect(page.locator('.task-item').filter({ hasText: 'Alpha searchable' })).toBeVisible();
  95  |   await expect(page.locator('.task-item').filter({ hasText: 'Beta other' })).toHaveCount(0);
  96  |   await page.locator('#taskSearch').fill('');
  97  |   await expect(page.locator('.task-item').filter({ hasText: 'Beta other' })).toBeVisible();
  98  | });
  99  | 
  100 | test('switches through all views', async ({ page }) => {
  101 |   await addTaskViaModal(page, { title: 'View test' });
  102 |   // Day is default
  103 |   await expect(page.locator('.schedule-container')).toBeVisible();
  104 |   // Week
  105 |   await page.getByRole('button', { name: 'Week' }).click();
  106 |   await expect(page.locator('#weekContainer')).toHaveClass(/open/);
  107 |   // Month
  108 |   await page.getByRole('button', { name: 'Month' }).click();
  109 |   await expect(page.locator('#calendarContainer')).toHaveClass(/open/);
  110 |   // Agenda
  111 |   await page.getByRole('button', { name: 'Agenda' }).click();
  112 |   await expect(page.locator('#agendaContainer')).toHaveClass(/open/);
```