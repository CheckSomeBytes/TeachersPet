# Contributing to TeachersPet

Thank you for considering contributing to TeachersPet! This document outlines the development workflow and guidelines.

## Development Workflow

### Branch Strategy

We use a modified Git Flow workflow:

- `master` - Production-ready code (stable releases)
- `develop` - Integration branch for features (beta releases)
- `feature/*` - New features and enhancements
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency production fixes

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/TeachersPet.git`
3. Add upstream remote: `git remote add upstream https://github.com/CheckSomeBytes/TeachersPet.git`
4. Create a branch from `develop`: `git checkout -b feature/your-feature-name develop`

### Making Changes

1. Make your changes in your feature branch
2. Test thoroughly:
   ```bash
   npm run dev          # Test in development mode
   npm run build        # Build the app
   npm run package      # Create Windows installer
   ```
3. Commit your changes with clear, descriptive messages
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request to the `develop` branch

### Pull Request Process

1. Ensure your code builds without errors
2. Update documentation if you're changing functionality
3. Fill out the pull request template completely
4. Request review from maintainers
5. Address any feedback from code review
6. Once approved, a maintainer will merge your PR

### Coding Standards

- Use TypeScript for type safety
- Follow the existing code style
- Keep components focused and single-purpose
- Use Zustand store for state management (avoid prop drilling)
- Comment complex logic
- Test across all 5 preset themes

### Testing Your Changes

Before submitting a PR, verify:
- [ ] App runs in dev mode (`npm run dev`)
- [ ] App builds successfully (`npm run build`)
- [ ] App packages without errors (`npm run package`)
- [ ] All themes display correctly
- [ ] Link checking works
- [ ] Window automation works (if applicable)
- [ ] Profile switching works
- [ ] Config import/export works

## Release Process

### Beta Releases
Beta releases are created from the `develop` branch and marked as pre-releases:
```bash
git checkout develop
git tag -a v1.3.0-beta.1 -m "Beta release 1.3.0"
git push origin v1.3.0-beta.1
```

### Production Releases
Production releases are created from `master` after merging `develop`:
```bash
# Merge develop to master
git checkout master
git merge develop --no-ff -m "Release v1.3.0"

# Tag the release
git tag -a v1.3.0 -m "Release version 1.3.0"

# Push to trigger build
git push origin master
git push origin v1.3.0
```

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Documentation improvements
- General questions

Thank you for contributing! 🎉
