# Security reporting

Do not include passwords, session cookies, connection strings, personal employee data or working exploit instructions in a public issue.

If GitHub offers **Report a vulnerability** in this repository's Security tab, use private reporting. Otherwise contact the [maintainer](https://github.com/Themaistro) through an available private channel before sharing sensitive details. This repository does not publish a dedicated security email address or response-time commitment.

Include the affected commit/version, the feature or endpoint, impact, and a minimal reproduction using disposable accounts. Share sensitive evidence only through the private reporting channel.

## Development configuration

Environment files are ignored except for the sanitized `.env.example`. Publisher keys stay on the server; browser clients receive scoped realtime tokens. Database migrations and role provisioning use operator credentials separately from application runtime credentials where configured.

The project is in active development. Local verification and dependency checks are useful evidence, but do not certify a hosted deployment or a particular production configuration.
