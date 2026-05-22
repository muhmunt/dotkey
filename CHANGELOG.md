# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-22

### Added
- Backend API: auth (JWT + TOTP 2FA + device flow), projects, environments, variables, history, rollback
- AES-256-GCM encryption for all secret values at rest
- Team management: owner / admin / developer / read-only roles
- Environment lock to prevent accidental production edits
- CI/CD project tokens (non-expiring, SHA-256 hashed)
- Activity feed — project-wide audit log
- Global search across projects and variable keys (⌘K)
- Reveal lock — 2FA code required to view secret values
- Variable diff between environments
- Next.js 14 dashboard with full feature parity
- CLI tool (`dotkey`) — pull, push, diff, history, rollback, sync
- Self-hosting via Docker Compose
- MkDocs Material documentation site
- In-app keyboard shortcuts (?)
