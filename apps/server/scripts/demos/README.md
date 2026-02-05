# Demo Scripts

This directory contains one-off scripts used for testing and demonstrating agent messaging functionality.

These scripts are **not production code** and should not be imported by the application.

## Purpose

- Testing agent-to-agent messaging flows
- Demonstrating inbox/thread functionality
- Manual testing of specific scenarios during development

## Usage

Run individual scripts with tsx:

```bash
pnpm tsx scripts/demos/<script-name>.ts
```

## Note

These scripts were originally in the server root directory and have been moved here to keep the codebase organized. If you need to create new test scripts, please add them to this directory.
