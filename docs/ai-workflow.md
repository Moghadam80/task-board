# Development Notes

Cursor and Claude were used as coding and review tools during development. They helped with the Next.js API proxy, authentication and authorization, TipTap validation, the Persian/RTL interface, tests, and documentation. The final code and security decisions remain the developer's responsibility.

## How AI-assisted changes were checked

The assignment requirements and project instructions were reviewed first. Suggested changes were then inspected, especially around task permissions, account deactivation, refresh-token rotation, and database updates. Several review rounds led to fixes in authorization, validation, session handling, editor configuration, and concurrent owner changes.

## Areas to pay special attention to

- **Permissions:** Verify access in NestJS endpoints and database queries, not only in the UI.
- **Sessions:** Test logout, refresh-token rotation, and access after a user is deactivated.
- **Migrations:** Keep TypeORM `synchronize: false`; add migrations for schema changes.
- **Rich text:** Test normal TipTap content and invalid nodes, marks, and links.
- **Interface:** Check keyboard navigation, focus handling, error messages, and long Persian text.
- **Tests:** Include cases that should fail, not only successful requests.