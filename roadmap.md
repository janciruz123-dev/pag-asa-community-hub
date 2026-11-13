# MyPag-asa roadmap

- [x] Database schema, roles, permissions, RLS, triggers, storage buckets
- [x] Design system, logo, hero illustration
- [x] Public site: landing, announcements list/detail
- [x] Auth: register (privacy consent), login, logout, forgot/reset password
- [x] Resident portal: dashboard, complaints (new/list/detail), service requests (new/list/detail), announcements, profile + change password, help, notifications
- [x] Admin/staff portal: dashboard w/ charts, residents, complaints, requests, announcements (+categories), service categories, staff accounts & permissions, activity logs
- [x] Notifications bell (unread count, mark read/all)
- [x] Tests for validation rules; signed-out browser checks (signed-in flows wait on the first real account)
- [x] Login page: separate Resident Login / Administrator Login (admin tab verifies role in DB)
- [x] Administrator account management: create admin (name, email, password, confirm), manage other admins; never public
- [x] Unauthenticated /admin visits go to the Administrator Login; residents bounced from /admin
- [x] Remix setup: database restored (sign-up hook, live notifications, starter services and categories)
- [x] Auth screens: Sign In / Create Resident Account / Admin Sign In
- [x] First admin designated by system owner via private setup code (no first-registrant bootstrap)
- [x] Setup code saved
- [x] Auth polish: header Sign In menu (Resident/Admin), inline errors, sign-out confirm + correct redirect, global session end, setup page steps
- [ ] Owner registers, signs in via Admin Sign In and enters the setup code (waiting on owner)
