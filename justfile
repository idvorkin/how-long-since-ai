default:
    @just --list

# Install dependencies
install:
    npm ci

# Run linter
lint:
    npm run lint

# Build the project
build:
    npm run build

# CI: install, lint, and build
ci: install lint build

# Deploy to surge.sh (staging)
deploy-stage:
    npx surge dist $(gh repo view --json name -q .name)-stage.surge.sh

# Deploy to surge.sh (production)
deploy-prod:
    npx surge dist $(gh repo view --json name -q .name).surge.sh

# Run a local server to preview
serve:
    npx serve dist
