# Security

## Supported Scope

This project is a lightweight recommendation tool built on static JSON data. It does not require user accounts, API keys, payment credentials, or server-side persistence for normal usage.

## Admin Interface

The `/admin` page and `/api/admin` JSON write API are intended for local maintenance. They are disabled in production by default.

Only enable them for a private deployment or a temporary maintenance window:

```bash
ENABLE_ADMIN_API=1
NEXT_PUBLIC_ENABLE_ADMIN=1
```

Do not enable the admin interface on a public deployment unless you have added authentication and access control.

## Reporting Issues

For security issues, please avoid posting sensitive details publicly. Open a minimal issue describing the affected area, or contact the maintainer through the repository profile.
