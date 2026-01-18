# Contributing to memfs

Thank you for your interest in contributing to memfs! This document provides guidelines and information to help you contribute effectively to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js**: Version 4.0.0 or higher (as specified in package.json)
- **Yarn**: This project uses Yarn as the package manager
- **Git**: For version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/memfs.git
   cd memfs
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/streamich/memfs.git
   ```

## Development Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Build the project:
   ```bash
   yarn build
   ```

3. Run tests to ensure everything works:
   ```bash
   yarn test
   ```

## Development Workflow

### Available Scripts

- **`yarn build`** - Compile TypeScript and build the project
- **`yarn test`** - Run the test suite
- **`yarn test:coverage`** - Run tests with coverage report
- **`yarn test:watch`** - Run tests in watch mode
- **`yarn tslint`** - Run TSLint for code linting
- **`yarn prettier`** - Format code with Prettier
- **`yarn prettier:check`** - Check code formatting
- **`yarn typecheck`** - Run TypeScript type checking

### Before Making Changes

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make sure all tests pass:
   ```bash
   yarn test
   ```

3. Ensure code formatting is correct:
   ```bash
   yarn prettier:check
   ```

### During Development

1. **Write tests** for any new functionality
2. **Run tests frequently** to ensure your changes don't break existing functionality:
   ```bash
   yarn test:watch
   ```
3. **Check linting** regularly:
   ```bash
   yarn tslint
   ```
4. **Format your code** before committing:
   ```bash
   yarn prettier
   ```

### Before Submitting

1. Ensure all tests pass:
   ```bash
   yarn test
   ```

2. Check TypeScript compilation:
   ```bash
   yarn typecheck
   ```

3. Verify code formatting:
   ```bash
   yarn prettier:check
   ```

4. Run linting:
   ```bash
   yarn tslint
   ```

## Code Style

This project uses:

- **TypeScript** for type safety
- **Prettier** for code formatting with the following configuration:
  - 120 character line width
  - 2 spaces for indentation
  - Single quotes
  - Trailing commas
  - Semicolons
- **TSLint** for additional code quality checks

Please ensure your code adheres to these standards by running `yarn prettier` before committing.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) format. Your commit messages should follow this pattern:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```
feat: add support for async file operations
fix: resolve memory leak in file handle cleanup
docs: update README with new API examples
test: add tests for edge cases in path resolution
```

## Pull Request Process

1. **Update documentation** if your changes affect the public API
2. **Add or update tests** to cover your changes
3. **Ensure all checks pass** (tests, linting, formatting)
4. **Create a pull request** with:
   - Clear title describing the change
   - Detailed description of what was changed and why
   - Reference to any related issues
   - Screenshots or examples if applicable

### Pull Request Checklist

- [ ] Tests pass (`yarn test`)
- [ ] Code is properly formatted (`yarn prettier:check`)
- [ ] Linting passes (`yarn tslint`)
- [ ] TypeScript compiles without errors (`yarn typecheck`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional commit format

## Reporting Issues

When reporting issues, please include:

1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment information**:
   - Node.js version
   - Operating system
   - memfs version
5. **Code sample** that demonstrates the issue (if applicable)
6. **Error messages** or stack traces

Use the [GitHub Issues](https://github.com/streamich/memfs/issues) page to report bugs or suggest features.

## Getting Help

- **Documentation**: Check the [docs](./docs/) directory for detailed documentation
- **Issues**: Browse [existing issues](https://github.com/streamich/memfs/issues) for similar problems
- **Discussions**: Start a discussion in the [GitHub Issues](https://github.com/streamich/memfs/issues) for questions

## Project Structure

- **`src/`** - Source code
  - **`src/node/`** - Node.js fs API implementation
  - **`src/fsa/`** - File System Access API implementation
  - **`src/crud/`** - CRUD file system abstraction
  - **`src/cas/`** - Content Addressable Storage
- **`docs/`** - Documentation
- **`demo/`** - Example applications and demos
- **`lib/`** - Compiled JavaScript output (generated)

## Resources

- [Node.js fs API Documentation](./docs/node/index.md)
- [File System Access API Documentation](./docs/fsa/fsa.md)
- [API Reference](https://streamich.github.io/memfs/)
- [Test Coverage](https://streamich.github.io/memfs/coverage/lcov-report/)

Thank you for contributing to memfs! 🎉