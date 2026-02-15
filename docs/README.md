# Opsly Platform Documentation

Comprehensive documentation for the Opsly multi-module SaaS platform.

## Quick Start

- [Architecture Overview](architecture/overview.md) - How the system is structured
- [Environment Setup](setup/environment-variables.md) - Configure your dev environment
- [Deployment Checklist](deployment/checklist.md) - Deploy to Vercel

## Modules

### Core Operations

- [Checkly](modules/checkly/overview.md) - Compliance, checklists, SOPs, incidents, EHO readiness
- [Assetly](modules/assetly/overview.md) - Asset management, maintenance, callouts, temperature monitoring
- [Msgly](modules/msgly/overview.md) - Internal messaging, channels, notifications

### Business Operations

- [Planly](modules/planly/overview.md) - Production planning, order management, customers
  - [Waste Tracking](modules/planly/waste-tracking.md)
  - [Lamination Calculation](modules/planly/lamination-calculation.md)
- [Stockly](modules/stockly/workflows.md) - Inventory, stock management, suppliers
  - [Workflow Analysis](modules/stockly/workflow-analysis.md)
- [Teamly](modules/teamly/overview.md) - People, HR, training, scheduling, payroll
  - [Employees](modules/teamly/employees.md) | [Site Assignment](modules/teamly/site-assignment.md) | [Scheduling](modules/teamly/multi-site-scheduling.md)
  - [Recruitment](modules/teamly/recruitment.md) | [Promotions](modules/teamly/promotions.md) | [Org Chart](modules/teamly/org-chart.md)
  - [Clock In/Out](modules/teamly/clock-in-out.md) | [Executives](modules/teamly/executives.md) | [Data Privacy](modules/teamly/data-privacy.md)

### Customer Facing

- [Customer Portal](modules/customer-portal/overview.md) - Customer ordering, waste logging, messaging, reports

## Features

- [Dashboard & Widgets](features/dashboard/overview.md) - Widget system, KPIs, charts, customization
  - [Mobile Plan](features/dashboard/mobile-plan.md)
- [Task System](features/tasks/workflow.md) - Task templates, automation, generation
  - [Setup](features/tasks/setup.md) | [Template Creation](features/tasks/template-creation.md) | [Best Practices](features/tasks/template-best-practices.md)
  - [Automation](features/tasks/automation.md) | [Generation](features/tasks/generation.md) | [Today's Tasks](features/tasks/todays-tasks.md)
  - [Quick Reference](features/tasks/quick-reference.md) | [File Reference](features/tasks/file-reference.md) | [Functionality Map](features/tasks/functionality-map.md)
  - [Integration](features/tasks/integration.md) | [Architecture](features/tasks/modular-architecture.md)
- [Certificates](features/certificates/overview.md) - Training certificate generation and management
- [Notifications](features/notifications/how-it-works.md) - In-app alerts and notification system
  - [Notification Options](features/notifications/options.md)
- [Knowledge Base](features/knowledge-base/guide.md) - AI assistant knowledge system
- [Archives](features/archives-specification.md) - Archive page specification

## Architecture

- [Architecture Overview](architecture/overview.md) - System design, modules, routing, layouts
- [Codebase Analysis](architecture/codebase-analysis.md) - Full codebase breakdown
- [Codebase Audit](architecture/codebase-audit.md) - Audit findings
- [Complexity Analysis](architecture/complexity-analysis.md) - Code complexity assessment
- [Refactoring Guide](architecture/refactoring-guide.md) - Safe refactoring strategies
- [Billing System](architecture/billing.md) - Billing architecture
- [Pricing Strategy](architecture/pricing-strategy.md) - Pricing model
- [Performance Analysis](architecture/performance-analysis.md) - Performance findings

### Architecture Decision Records

- [ADR-001: Route Structure](decisions/ADR-001-route-structure.md) - /dashboard/\* as primary routes
- [ADR-002: Sidebar System](decisions/ADR-002-sidebar-system.md) - Module-specific sidebars

## Database

- [Performance Optimization](database/performance.md) - DB performance remediation
  - [Performance Changelog](database/performance-changelog.md)
- [Security](database/security.md) - DB security remediation
  - [Security Changelog](database/security-changelog.md)
- [Migration Guide](database/migration-guide.md) - Database migration process
- [Site Filtering](database/site-filtering.md) - Multi-tenant filtering patterns
- [Data Integrity](database/data-integrity.md) - Recipe data integrity
- [Task Data Loss Prevention](database/task-data-loss-prevention.md) - Trigger safeguards
- [Cleanup Guide](database/cleanup-guide.md) - Database cleanup scripts

## Edge Functions

- [Architecture](edge-functions/architecture.md) - Edge function design
- [Setup](edge-functions/setup.md) - Complete setup guide
- [Deployment](edge-functions/deployment.md) - Deployment process
- [Cron Jobs](edge-functions/cron-setup.md) - Scheduled tasks
- [Overdue Tasks](edge-functions/overdue-tasks.md) - Overdue task handling

## UI & Design

- [Style Guide](ui/style-guide.md) - Complete UI design system
- [Light Mode](ui/light-mode.md) - Light mode implementation patterns

## Setup & Configuration

- [Environment Variables](setup/environment-variables.md) - All env vars explained
- [Supabase CLI](setup/supabase-cli.md) - CLI setup and usage
- [PWA Setup](setup/pwa-setup.md) - Progressive Web App configuration
- [PWA Admin](setup/pwa-admin.md) - Admin PWA setup
- [Push Notifications](setup/push-notifications.md) - VAPID keys and push setup
- [Domain Configuration](setup/domain-configuration.md) - Custom domain setup
- [MCP Server](setup/mcp-server.md) - MCP server configuration
- [Demo Readiness](setup/demo-readiness.md) - Demo preparation checklist

## Deployment

- [Deployment Checklist](deployment/checklist.md) - Step-by-step deployment
- [Vercel Configuration](deployment/vercel-configuration.md) - Vercel settings analysis

## Integrations

- [Email Setup](integrations/email-setup.md) - Email configuration
- [Email Confirmations](integrations/email-confirmations.md) - Confirmation emails
- [Email Confirmation System](integrations/email-confirmation-system.md) - System architecture
- [Email Testing](integrations/email-testing.md) - Testing email delivery

## Security

- [Permissions](security/permissions.md) - Universal permissions guide

## Troubleshooting

- [Known Issues](troubleshooting/known-issues.md) - Current known issues
- [Debugging Loops](troubleshooting/debugging-loops.md) - Breaking debugging cycles
- [Service Worker](troubleshooting/service-worker-crash.md) - SW crash analysis
- [Stabilization](troubleshooting/stabilization-plan.md) - Stability improvements

## Specs

- [Comprehensive Summary](specs/comprehensive-summary.md) - Full spec overview
- [v2.1 Final Review](specs/v2.1-final-review.md) - Spec v2.1 review
- [v2 Review](specs/v2-review-and-recommendations.md) - Spec v2 recommendations
