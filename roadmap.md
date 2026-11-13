# MyPag-asa roadmap

- [ ] Database schema, roles, permissions, RLS, triggers, storage buckets
- [ ] Design system, logo, hero illustration
- [ ] Public site: landing, announcements list/detail
- [ ] Auth: register (privacy consent), login, logout, forgot/reset password
- [ ] Resident portal: dashboard, complaints (new/list/detail), service requests (new/list/detail), announcements, profile + change password, help, notifications
- [ ] Admin/staff portal: dashboard w/ charts, residents, complaints, requests, announcements (+categories), service categories, staff accounts & permissions, activity logs
- [ ] Notifications bell (unread count, mark read/all)
- [ ] Tests for validation rules; end-to-end check
- [ ] Login page: separate Resident Login / Administrator Login (admin tab verifies role in DB)
- [ ] Administrator account management: create admin (name, email, password, confirm), manage other admins; never public
- [ ] Unauthenticated /admin visits go to the Administrator Login; residents bounced from /admin
- [x] Remix setup: database restored (sign-up hook, live notifications, starter services and categories)
