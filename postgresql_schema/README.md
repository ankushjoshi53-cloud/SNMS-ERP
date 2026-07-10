# SNMS ERP v2.0 - GitHub, Vercel & Neon Integration Guide
## Enterprise Setup for Serverless Battery Manufacturing ERP

This directory contains the production-ready PostgreSQL database schema for **SNMS ERP v2.0**. To make this codebase fully compatible with modern cloud infrastructure, follow this integration guide to link **GitHub** (source control), **Neon** (serverless database), and **Vercel** (hosting serverless functions & client bundle).

---

## 1. Directory Structure

For clean deployment and automated migrations via GitHub Actions, keep your SQL scripts organized in your repository root as follows:

```
├── .github/
│   └── workflows/
│       └── deploy-db.yml         # Automated DB Schema deployment to Neon
├── postgresql_schema/
│   ├── README.md                 # This guide
│   ├── neon_deploy_all.sql       # Consolidated single-file deployment script
│   ├── 001_schema.sql
│   ├── 002_enum_types.sql
│   ├── 003_constraints.sql
│   ├── 004_indexes.sql
│   ├── 005_functions.sql
│   ├── 006_triggers.sql
│   ├── 007_views.sql
│   ├── 008_seed_master.sql
│   ├── 009_sample_data.sql
│   ├── 010_verification.sql
│   └── 011_migration_script.sql
└── .env.example                  # Environment Variables template
```

---

## 2. Neon Database Provisioning

Neon is a serverless, multi-tenant cloud PostgreSQL offering auto-scaling, cold-starts to zero, and instant database branching.

### 2.1 Database Creation
1. Sign in to your [Neon Console](https://console.neon.tech/).
2. Create a new project named `snms-erp-v2`.
3. Select **PostgreSQL 16** as your target database engine.
4. Select your preferred cloud region (e.g., US East, Europe, Asia Pacific).
5. Neon will generate a connection string resembling:
   `postgres://alex:your-password@ep-cool-breeze-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 2.2 Deployment of Schema
- **Option A (Web Console):** Open Neon's internal **SQL Editor** tab, paste the contents of `./postgresql_schema/neon_deploy_all.sql`, and click **Run**.
- **Option B (GitHub Actions Automation):** Set up automated migration pipelines to deploy schema changes directly on repository push (see Section 4).

---

## 3. Vercel Serverless Integration & Node.js Connection

Because Vercel executes serverless functions (which scale up and down dynamically), traditional stateful PostgreSQL connection pools can easily exhaust available database connections.

To resolve this, use the `@neondatabase/serverless` driver, which communicates over WebSockets and includes built-in connection optimization.

### 3.1 Install Driver in Your Full-Stack Application
Run the following inside your project root to support serverless Postgres access:
```bash
npm install @neondatabase/serverless
```

### 3.2 Establish a Serverless Database Client
Create a module (e.g., `src/lib/db.ts`) to connect to your Neon instance dynamically:

```typescript
import { neon, Pool } from '@neondatabase/serverless';

// 1. For single high-speed query execution in serverless edge functions:
export const sql = neon(process.env.DATABASE_URL!);

// 2. For standard connection pooling inside API routes:
let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Optimize pooling sizes for brief serverless execution limits
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}
```

---

## 4. GitHub Actions CI/CD Pipeline (`deploy-db.yml`)

Automate database schema migrations on every push to your main branch. Create the following workflow file under `.github/workflows/deploy-db.yml`:

```yaml
name: Deploy Schema to Neon

on:
  push:
    branches:
      - main
    paths:
      - 'postgresql_schema/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Install PostgreSQL Client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Deploy Consolidated SQL Schema
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql "$DATABASE_URL" -f postgresql_schema/neon_deploy_all.sql
```

> **Security Note:** Go to your **GitHub Repository Settings -> Secrets and Variables -> Actions**, and add `DATABASE_URL` containing your Neon connection string.

---

## 5. Vercel Project Configuration

1. Push your ERP codebase to your GitHub repository.
2. Sign in to your [Vercel Console](https://vercel.com/) and click **New Project**.
3. Import your GitHub repository.
4. Expand **Environment Variables** and add the following keys:
   - `DATABASE_URL` = `postgres://user:pass@ep-cool-breeze-123456.us-east-2.aws.neon.tech/neondb?sslmode=require` (Neon Connection String)
   - `JWT_SECRET` = *[Your Secret Key]* (For security token signing)
   - `NODE_ENV` = `production`
5. Click **Deploy**. Vercel will automatically compile your frontend and deploy your backend API serverless endpoints.
