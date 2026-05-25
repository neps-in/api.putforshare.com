Here's a format optimized for use with **Claude Code** that makes it easy to track, update, and programmatically parse:

```markdown
# PRD: [Project Name]

## Status Dashboard

**Last Updated:** 2024-02-14  
**Overall Progress:** 45%  
**Current Phase:** Development

| Phase        | Progress | Status         |
| ------------ | -------- | -------------- |
| Requirements | 100%     | ✅ Complete    |
| Design       | 100%     | ✅ Complete    |
| Development  | 40%      | 🚧 In Progress |
| Testing      | 0%       | ⏳ Pending     |
| Deployment   | 0%       | ⏳ Pending     |

---

## Requirements

### Functional Requirements

- [x] FR-001: User authentication with OAuth2
- [x] FR-002: Role-based access control
- [ ] FR-003: User profile management
- [ ] FR-004: Dashboard analytics
- [ ] FR-005: Export data to CSV/PDF

### Non-Functional Requirements

- [x] NFR-001: Response time < 200ms
- [ ] NFR-002: Support 10k concurrent users
- [ ] NFR-003: 99.9% uptime SLA

---

## Technical Tasks

### Backend

- [x] BACK-001: Set up PostgreSQL database
- [x] BACK-002: Create user schema
- [x] BACK-003: Implement authentication endpoints
- [ ] BACK-004: Create CRUD APIs for profiles
- [ ] BACK-005: Add rate limiting middleware
- [ ] BACK-006: Implement caching layer

### Frontend

- [x] FRONT-001: Initialize React project
- [x] FRONT-002: Set up routing
- [ ] FRONT-003: Build login/signup pages
- [ ] FRONT-004: Create dashboard components
- [ ] FRONT-005: Implement state management
- [ ] FRONT-006: Add responsive design

### Infrastructure

- [ ] INFRA-001: Set up CI/CD pipeline
- [ ] INFRA-002: Configure staging environment
- [ ] INFRA-003: Set up monitoring (Datadog/New Relic)
- [ ] INFRA-004: Configure auto-scaling

---

## Testing Checklist

### Unit Tests

- [ ] TEST-001: Auth service tests
- [ ] TEST-002: User service tests
- [ ] TEST-003: API endpoint tests
- [ ] TEST-004: Frontend component tests

### Integration Tests

- [ ] TEST-005: End-to-end user flows
- [ ] TEST-006: Database integration
- [ ] TEST-007: Third-party API integration

---

## Decisions & Notes

### 2024-02-14

- ✅ Decided to use PostgreSQL over MongoDB
- ✅ Selected React over Vue for frontend
- 🚧 Still evaluating Redis vs Memcached for caching

### 2024-02-10

- ✅ Completed architecture review
- ⚠️ Identified performance bottleneck in user query

---

## Blocked Items

- [ ] BLOCKED-001: Waiting for API keys from vendor (Owner: @john)
- [ ] BLOCKED-002: Design approval needed for dashboard (Owner: @sarah)
```

## Why This Format Works Well with Claude Code:

1. **Structured IDs** (`FR-001`, `BACK-001`, etc.) - Easy to reference and search
2. **Clear Checkboxes** - Claude Code can parse and update these programmatically
3. **Progress Tracking** - Visual dashboard at the top
4. **Dated Notes** - Maintains decision history
5. **Blocked Items Section** - Highlights what needs attention

## Claude Code Commands You Can Use:

```bash
# Ask Claude Code to update task status
"Mark BACK-004 as complete in the PRD"

# Generate progress report
"Calculate the overall completion percentage from the PRD"

# Add new tasks
"Add a new backend task for email notifications to the PRD"

# Update status dashboard
"Update the status dashboard in the PRD based on completed checkboxes"
```

This format is both human-readable and machine-parseable, making it perfect for collaboration between you and Claude Code!
