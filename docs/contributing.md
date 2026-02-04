# Contributing Guide

Thank you for your interest in contributing to Generic Corp!

## Code of Conduct

Please read and follow our [Code of Conduct](code-of-conduct.md).

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.15.9
- Docker and Docker Compose
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/generic-corp.git
   cd generic-corp
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/neill-k/generic-corp.git
   ```
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Start infrastructure:
   ```bash
   pnpm docker:up
   ```
6. Set up environment:
   ```bash
   cp apps/server/.env.example apps/server/.env
   ```
7. Initialize database:
   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

## Development Workflow

### Creating a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### Making Changes

1. Write your code
2. Follow the existing code style
3. Add tests for new functionality
4. Update documentation as needed

### Code Style

We use ESLint and Prettier:

```bash
# Check linting
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Format code
pnpm format
```

### Testing

Write tests for all new code:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test path/to/test

# Run with coverage
pnpm test:coverage
```

### Type Checking

Ensure TypeScript compiles without errors:

```bash
pnpm typecheck
```

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(api): add employee search endpoint

Implements full-text search for employees using PostgreSQL's
ts_vector capabilities.

Closes #123
```

```
fix(dashboard): resolve org chart rendering bug

The org chart was not properly handling circular references.
Added cycle detection and error handling.
```

### Pull Requests

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a pull request on GitHub

3. Fill out the PR template completely

4. Ensure CI checks pass

5. Request review from maintainers

#### PR Guidelines

- Keep PRs focused and reasonably sized
- Include tests for new functionality
- Update documentation for user-facing changes
- Reference related issues
- Add screenshots for UI changes

## Project Structure

```
generic-corp/
├── apps/
│   ├── server/           # Backend API
│   ├── dashboard/        # Frontend UI
│   ├── landing/          # Landing page
│   └── analytics-dashboard/
├── packages/
│   ├── core/             # Core logic
│   ├── shared/           # Shared types
│   ├── sdk/              # Plugin SDK
│   ├── plugins-base/     # Base plugins
│   └── enterprise-auth/  # Auth package
├── docs/                 # Documentation
├── plans/                # Architecture docs
└── infrastructure/       # Deployment configs
```

## Development Guidelines

### TypeScript

- Enable strict mode
- Avoid `any` types
- Define interfaces for data structures
- Use generics appropriately

### React

- Use functional components with hooks
- Follow React best practices
- Keep components small and focused
- Use TypeScript for props

### Database

- Use Prisma for all database access
- Write migrations for schema changes
- Test migrations both up and down
- Document complex queries

### API Design

- Follow REST conventions
- Use appropriate HTTP methods
- Return meaningful status codes
- Document endpoints
- Version breaking changes

### Error Handling

- Use custom error classes
- Provide helpful error messages
- Log errors appropriately
- Don't expose sensitive information

## Testing Guidelines

### Unit Tests

Test individual functions and components:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateScore } from './utils';

describe('calculateScore', () => {
  it('should return correct score', () => {
    expect(calculateScore(5, 10)).toBe(50);
  });
});
```

### Integration Tests

Test API endpoints and flows:

```typescript
import request from 'supertest';
import { app } from './app';

describe('POST /api/employees', () => {
  it('should create employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ name: 'Test', email: 'test@example.com' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
  });
});
```

### E2E Tests

Test complete user workflows (optional but encouraged).

## Documentation

### Code Comments

- Document complex logic
- Explain "why" not "what"
- Keep comments up to date
- Use JSDoc for public APIs

### Documentation Updates

Update docs when:
- Adding new features
- Changing APIs
- Updating configuration
- Fixing bugs that affect usage

## Plugin Development

To contribute a plugin:

1. Create plugin in `packages/`
2. Follow plugin development guide
3. Include tests and documentation
4. Submit PR with plugin addition

## Release Process

Maintainers handle releases:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release tag
4. Publish to npm (if applicable)
5. Deploy to production

## Getting Help

- **Questions**: GitHub Discussions
- **Bugs**: GitHub Issues
- **Security**: Email security@genericcorp.dev
- **Chat**: Discord (link in README)

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor spotlight

Thank you for contributing to Generic Corp! 🎉
