# ReadTheDocs Setup Guide

This repository is configured for ReadTheDocs.io documentation hosting.

## Setup Steps

### 1. Import Project to ReadTheDocs

1. Go to [ReadTheDocs.org](https://readthedocs.org/)
2. Sign in with your GitHub account
3. Click "Import a Project"
4. Select `neill-k/generic-corp` from your repositories
5. Click "Next"

### 2. Configure Project

ReadTheDocs will automatically detect the `.readthedocs.yaml` configuration file.

**Default Settings:**
- **Name**: generic-corp
- **Repository URL**: https://github.com/neill-k/generic-corp
- **Default Branch**: main
- **Documentation Type**: MkDocs
- **Language**: English

### 3. Build Documentation

After importing, ReadTheDocs will automatically:
1. Install Python dependencies from `docs/requirements.txt`
2. Build documentation using MkDocs
3. Publish to https://generic-corp.readthedocs.io

### 4. Enable Builds for Branch

To enable builds for the `core-plugin-architecture` branch:

1. Go to your project settings on ReadTheDocs
2. Navigate to "Versions"
3. Find `core-plugin-architecture` branch
4. Click "Edit"
5. Check "Active"
6. Save

## Local Documentation Preview

### Install MkDocs

```bash
pip install -r docs/requirements.txt
```

### Serve Locally

```bash
mkdocs serve
```

Then open http://127.0.0.1:8000 in your browser.

### Build Static Site

```bash
mkdocs build
```

Output will be in the `site/` directory.

## Configuration Files

### `.readthedocs.yaml`
Main ReadTheDocs configuration file at repository root.

### `mkdocs.yml`
MkDocs configuration file at repository root.

### `docs/requirements.txt`
Python dependencies for building documentation.

## Documentation Structure

```
docs/
├── index.md                    # Home page
├── getting-started/
│   ├── quickstart.md          # Quick start guide
│   ├── installation.md        # Detailed installation
│   └── configuration.md       # Configuration guide
├── architecture.md            # System architecture
├── api-reference.md           # API documentation
├── plugin-development.md      # Plugin development guide
├── deployment.md              # Deployment guide
├── contributing.md            # Contributing guidelines
└── code-of-conduct.md         # Code of conduct
```

## Customization

### Theme

The documentation uses Material for MkDocs theme. Customize in `mkdocs.yml`:

```yaml
theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
```

### Navigation

Update the navigation structure in `mkdocs.yml`:

```yaml
nav:
  - Home: index.md
  - Getting Started:
    - Quick Start: getting-started/quickstart.md
  # ... more pages
```

## Troubleshooting

### Build Fails

Check the build log on ReadTheDocs for errors.

**Common issues:**
- Missing Python dependencies
- Invalid YAML in `mkdocs.yml`
- Broken internal links
- Missing referenced files

### Local Build Fails

```bash
# Clear cache
rm -rf site/

# Rebuild
mkdocs build --clean
```

## Next Steps

1. Push changes to GitHub
2. ReadTheDocs will automatically rebuild on push
3. Check https://generic-corp.readthedocs.io for live docs

## Resources

- [ReadTheDocs Documentation](https://docs.readthedocs.io/)
- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
