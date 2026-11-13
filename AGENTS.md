<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (MyPag-asa)

- Roles live in `user_roles`, staff permissions in `staff_permissions`; check access with the `has_role` / `has_permission` SQL helpers in RLS — never from profile fields or client state.
- Status history, notifications, reference numbers and activity logs are written by database triggers, so every client path that updates a complaint/request gets them for free; don't duplicate them in app code.
- Privileged account actions (creating staff/admin accounts, banning) go through `src/lib/admin.functions.ts`, which re-checks `is_admin` server-side before using the service-role client.
- Signed-in pages live under `src/routes/_authenticated/_shell/` (shared sidebar layout); admin pages under `.../_shell/admin/` with per-page `requirePermission` guards.
- Storage buckets are private (public buckets are blocked); files are shown through signed URLs and paths are stored in the database, not URLs.
- Every public sign-up gets only the resident role; the first administrator is designated once via `/admin-setup` with the owner's `ADMIN_SETUP_CODE` secret (server-checked, closes once any admin exists), so no public visitor can claim admin.
