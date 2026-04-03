# Configuration Files

This directory contains all environment and operational configuration files.

## Structure

```
config/
├── env/          # Application environment files
│   ├── .env.local.example
│   ├── .env.dev.example
│   └── .env.prod.example
└── ops/          # Operational configuration files
    ├── .env.ops.dev.example
    └── .env.ops.prod.example
```

## Application Environment Files (`config/env/`)

These files contain application-specific configuration:

- **`.env.local`** - Local development (database, secrets, etc.)
- **`.env.dev`** - Development environment (API URLs, external services)
- **`.env.prod`** - Production environment (API URLs, external services)

### Setup

```bash
# Copy example files
cp config/env/.env.dev.example config/env/.env.dev
cp config/env/.env.local.example config/env/.env.local

# Fill in actual values
# NEVER commit actual .env files - they're in .gitignore
```

## Operational Configuration Files (`config/ops/`)

These files contain infrastructure and deployment configuration:

- **`.env.ops.dev`** - Development operations (SSH hosts, Docker containers, etc.)
- **`.env.ops.prod`** - Production operations (SSH hosts, Docker containers, etc.)

### Setup

```bash
# Copy example files
cp config/ops/.env.ops.dev.example config/ops/.env.ops.dev

# Fill in actual values
# Used by scripts like db-setup-remote.sh
```

## Usage

### Local Development
```bash
# Uses config/env/.env.local
pnpm start
```

### Remote Database Setup
```bash
# Uses config/ops/.env.ops.dev
pnpm db:reset:remote dev
pnpm db:reset:remote prod
```

### Environment Loading

- **Application**: Nx/Prisma loads from `config/env/.env.*`
- **Scripts**: Custom scripts load from `config/ops/.env.*`

## Security Rules

1. **NEVER** commit actual `.env` files
2. **ALWAYS** use `.example` files as templates
3. **KEEP** secrets out of example files
4. **ROTATE** keys regularly

## Migration from Root `.env*`

If you have existing `.env` files in the project root:

```bash
# Move to new structure
mv .env.dev config/env/
mv .env.prod config/env/
mv .env.local config/env/
mv .env.ops.dev config/ops/

# Update your workflow if needed
# Scripts automatically use new paths
```
