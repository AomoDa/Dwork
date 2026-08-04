# Project Overview: Weekly Calendar & Schedule Tracking System

You are an expert full-stack developer. Your task is to build a complete Weekly Calendar and Schedule Tracking web application. This application allows team members to upload weekly schedule images via unique "magic links," and provides an Admin Console to manage members, view weekly submission statuses, and export data.

## 1. Tech Stack & Environment
- **Frontend:** React 19, React Router DOM v7, Tailwind CSS v4, Lucide React (icons).
- **Backend:** Node.js, Express.js.
- **Database:** SQLite (using `@libsql/client`).
- **Build Tool:** Vite (configured with Express middleware for full-stack dev/prod).
- **Key Libraries:** 
  - `date-fns` & `date-fns-tz` for ISO week handling and timezone logic.
  - `browser-image-compression` for client-side image compression.
  - `jszip` & `file-saver` for exporting images as ZIP files.
  - `qrcode.react` for generating member magic link QR codes.

## 2. Database Schema (SQLite)

The local SQLite database should be stored in a file (e.g., `local.db`). Ensure the following tables are created upon initialization:

1. **`members`**
   - `id` (TEXT PRIMARY KEY)
   - `name` (TEXT NOT NULL)
   - `path` (TEXT NOT NULL UNIQUE) - used for magic links.
   - `isDeleted` (INTEGER DEFAULT 0) - for soft deletion.

2. **`schedules`**
   - `id` (TEXT PRIMARY KEY)
   - `memberId` (TEXT NOT NULL) - Foreign Key to `members`.
   - `date` (TEXT NOT NULL)
   - `timeOfDay` (TEXT NOT NULL)
   - `content` (TEXT NOT NULL)
   - `type` (TEXT NOT NULL)
   - `image` (TEXT) - Stores base64 encoded image data.
   - *Index*: Create an index on `memberId` (`idx_schedules_memberId`).

3. **`config`**
   - `key` (TEXT PRIMARY KEY)
   - `value` (TEXT NOT NULL)
   - *Initial Data*: Insert `adminToken` = `abcd` and `isInitialized` = `true`. Generate dummy members if initializing for the first time.

## 3. Server-Side API (`server.ts`)

Implement an Express server that mounts Vite middleware for development and serves static files in production. Bind to `0.0.0.0:3000`.

**Admin API (Requires `?token=abcd` validation):**
- `GET /api/admin/members`: Fetch all members. If `?all=true`, include soft-deleted, otherwise filter `isDeleted = 0`.
- `PATCH /api/admin/members/:id`: Update `isDeleted` status (soft delete/restore).
- `POST /api/admin/members`: Create a new member, generate a random 6-character `path`.
- `GET /api/admin/schedules`: Fetch all schedules. **Crucial Optimization**: Do NOT return the full `image` string. Instead, return a boolean/integer `hasImage` flag if the image exists, to save bandwidth.
- `GET /api/admin/schedules/:id/image`: Fetch the actual base64 `image` string for a specific schedule.

**Member API (Publicly accessible via `path`):**
- `GET /api/member/:path`: Validate and return member details if `isDeleted = 0`.
- `GET /api/member/:path/schedules`: Return all schedules for this member.
- `POST /api/member/:path/schedules`: Create a new schedule entry.
- `DELETE /api/member/:path/schedules/:id`: Delete a schedule entry.

## 4. Frontend: Admin Console Layout & Pages

**Routing:** `/admin/*`. Redirect `/` to `/admin/weekly?token=abcd`. Validate token context.

**AdminLayout:**
- **Desktop:** Left sidebar with navigation ("周历日程", "成员管理").
- **Mobile:** Top header + Bottom navigation bar replacing the sidebar for space efficiency. Responsive layouts via Tailwind (`md:hidden`, `md:flex`).

**AdminMembers Page (`/admin/members`):**
- Display a list of members.
- If a member is soft-deleted, gray out their row, strike through their name, and change the delete button to "Restore".
- Actions per member: Show QR Code Modal (using `qrcode.react`), Copy Magic URL (`/m/:path`), Delete/Restore.
- "Add Member" button opens a modal to input a name and creates a new user.
- **Mobile Adaptation:** Switch from a 12-column grid to a stacked flex/grid layout on smaller screens.

**AdminWeeklyCalendar Page (`/admin/weekly`):**
- Displays a horizontal, scrollable grid (table). Rows = Members, Columns = ISO Weeks.
- **Default View**: Display 3 weeks total, starting from 2 weeks ago up to the current week (using `date-fns`). Left/Right arrows allow navigating week ranges.
- **Visual Indicators:**
  - Past or current weeks (relative to current date) without an uploaded schedule should have a **yellow background** (`bg-yellow-100`) and a yellow hyphen `-` to clearly indicate missing data. Future weeks without data stay white.
  - If a schedule *is* submitted, do not load the full image thumbnail. Instead, show a visually appealing "Done" icon (e.g., green checkmark `CheckCircle2`) with the text "点击查看" (Click to view) beneath it.
- **Image Modal:** Clicking the "Done" icon should open a modal, triggering a fetch to `/api/admin/schedules/:id/image`, showing a loading spinner while fetching, and then displaying the high-res image.
- **Export Feature:** A button to "Export Table". Opens a modal to pick a week, fetches all images for that week from the backend, and zips them into an archive named `{year}年第{week}周.zip` containing `{MemberName}.jpg` files using `jszip` and `file-saver`.

## 5. Frontend: Member Upload Portal

**Routing:** `/m/:path`

**Member Page:**
- A mobile-first, user-friendly interface for team members.
- Fetch member details and their schedules.
- **Week Selection:** A dropdown or list of available weeks.
  - The calendar should start from a hardcoded `CUTOFF_DATE` of `2026-03-30`. Earlier weeks should not be displayed.
  - Members can only edit weeks up to **next week** (relative to 'Asia/Shanghai' timezone).
- **Image Upload:** 
  - Provide an upload button.
  - **Crucial Rule:** Use `browser-image-compression` to compress the image before sending it to the server. Max size should be `0.2MB` (200KB), max width/height `1920`.
  - Display the uploaded image. Allow users to delete their submission and upload a new one.

## 6. General Guidelines
- Ensure robust timezone handling using `date-fns-tz` specifically anchoring week calculations to `Asia/Shanghai` to prevent day-shifting bugs.
- Implement Toast notifications for user feedback (e.g., "Link copied", "Upload successful").
- Use standard HTML file inputs for camera/gallery access on mobile devices (`accept="image/*"`).
- Keep CSS entirely within Tailwind classes.
