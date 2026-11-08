# ULUGBEK AI Knowledge Base

# SSRF and Network Safety

The fetcher is an untrusted-input network client. Every user-supplied URL and every redirect is hostile until validated.

- Allow only http and https schemes.
- Reject localhost, loopback, link-local, private, multicast, reserved and cloud metadata IP ranges for IPv4 and IPv6.
- Resolve DNS and validate all returned addresses; defend against DNS rebinding by pinning the validated destination for the request where supported.
- Revalidate each redirect and prevent redirects to internal addresses.
- Reject URL user-info, unusual ports unless allowlisted, malformed hostnames and IP-literal tricks.
- Never fetch file://, ftp://, gopher://, data:, javascript: or custom schemes.
- Do not expose internal service ports, environment variables, metadata endpoints or private network topology.
- Enforce egress firewall rules in addition to application validation.
- Test IPv4, IPv6, mixed DNS answers, redirects, encoded addresses and rebinding cases.


---

Status: policy/architecture guidance. This document does not prove runtime capability is implemented. Validate against source code and tests before enabling in production.
