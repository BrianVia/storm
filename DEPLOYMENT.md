# Deployment Guide

This fork of storm has been configured to publish packages to the BrianVia GitHub package registry.

## Changes Made

The following files were updated to point to the `BrianVia/storm` fork:

1. **go.mod** - Updated module path from `github.com/relvacode/storm` to `github.com/BrianVia/storm`
2. **Dockerfile** - Updated build path to use `github.com/BrianVia/storm/cmd/storm`

## Automatic Deployment

The `.github/workflows/release.yaml` workflow is already configured to automatically publish to your repository. It uses `${{ github.repository }}` which resolves to `BrianVia/storm` when running in this fork.

When you create a release on GitHub, the workflow will automatically:

1. **Compile Frontend** - Builds the Angular frontend application
2. **Release Go Binaries** - Creates platform-specific binaries for:
   - Linux (amd64, arm, arm64)
   - Windows (amd64)
   - macOS/Darwin (amd64, arm64)
3. **Build Docker Image** - Pushes multi-platform Docker images to GitHub Container Registry

## Publishing a Release

### Create a Release

1. Ensure all changes are committed and pushed to the repository
2. Go to your repository on GitHub: https://github.com/BrianVia/storm
3. Click on "Releases" → "Create a new release"
4. Create a new tag (e.g., `v1.0.0`)
5. Add release notes
6. Click "Publish release"

### What Gets Published

The GitHub Actions workflow will automatically:

- Attach compiled binaries to the release (e.g., `storm-v1.0.0-linux-amd64`, `storm-v1.0.0-windows-amd64.exe`, etc.)
- Push Docker images to GitHub Container Registry:
  - `ghcr.io/brianvia/storm:latest`
  - `ghcr.io/brianvia/storm:<version>` (e.g., `v1.0.0`)

### Supported Platforms

Docker images are built for:
- linux/amd64
- linux/arm64
- linux/arm/v7

## Using the Published Packages

### Docker

Pull and run the latest version:

```bash
docker pull ghcr.io/brianvia/storm:latest
docker run -p 8080:8080 ghcr.io/brianvia/storm:latest
```

Or use a specific version:

```bash
docker pull ghcr.io/brianvia/storm:v1.0.0
docker run -p 8080:8080 ghcr.io/brianvia/storm:v1.0.0
```

### Binary Downloads

Download the appropriate binary for your platform from the GitHub release page:

```bash
# Example for Linux amd64
wget https://github.com/BrianVia/storm/releases/download/v1.0.0/storm-v1.0.0-linux-amd64
chmod +x storm-v1.0.0-linux-amd64
./storm-v1.0.0-linux-amd64
```

## Required Secrets

The workflow uses `secrets.GITHUB_TOKEN` which is automatically provided by GitHub Actions. No additional secrets need to be configured.

## Permissions

The Docker image build job requires the following permissions (already configured in the workflow):
- `packages: write` - To push to GitHub Container Registry
- `contents: read` - To read repository contents
