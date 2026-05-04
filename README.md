# Kaapi-Frontend

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
![GitHub issues](https://img.shields.io/github/issues-raw/ProjectTech4DevAI/kaapi-frontend)
[![Discord](https://img.shields.io/discord/717975833226248303.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/BRYzSYha)

This is a thin frontend UI for [Kaapi backend](https://github.com/ProjectTech4DevAI/kaapi-backend) — a platform that acts as a middleware layer, enabling platforms like Avni, Glific, and Dalgo to seamlessly integrate AI functionality.

---

## 📋 Table of Contents

- [Pre-requisite](#pre-requisite)
  - [Software Dependencies](#software-dependencies)
    - [npm (via asdf)](#npm-via-asdf)
  - [Kaapi Backend](#kaapi-backend)
  - [Kaapi Guardrails Service](#kaapi-guardrails-service)
- [Clone Frontend Repo](#clone-frontend-repo)
  - [Git commands to clone](#git-commands-to-clone)
- [Installation](#installation)
  - [Start frontend server](#start-frontend-server)
- [Available Scripts](#available-scripts)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Deploying Release on EC2 with CD](#deploying-release-on-ec2-with-cd)
- [Learn More](#learn-more)

---

## Pre-requisite

### Software Dependencies

#### npm (via asdf)

```bash
asdf plugin-add nodejs
asdf install
```

## Clone Frontend Repo

### Git commands to clone

```bash
git clone git@github.com:ProjectTech4DevAI/kaapi-frontend.git
```

---

### Kaapi Backend

You need to set up the [Kaapi backend](https://github.com/ProjectTech4DevAI/kaapi-backend) service and follow the instructions there.

> 💡 Note: Ensure the backend is running and accessible before starting the frontend.

### Kaapi Guardrails Service

You need to set up the [Kaapi Guardrails](https://github.com/ProjectTech4DevAI/kaapi-guardrails) service and follow the instructions there.

> 💡 Note: The Guardrails service must be running and accessible whenever you use the Guardrails module in the frontend.

---

## Installation

1. Copy `.env.example` to `.env` in the project root:

   ```bash
   cp .env.example .env
   ```

2. **Do not modify `.env`** unless absolutely required.
3. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   ```

---

### Start frontend server

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to open the app.

## Available Scripts

```bash
npm install      # Install dependencies (also sets up pre-commit hooks via husky)
npm run dev      # Run app in development mode
npm run build    # Create optimized production build
npm run start    # Start the production server
npm run lint     # Run ESLint on the entire project
npm test         # Run tests
npm run test:coverage  # Run tests with coverage report
```

---

## Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality before every commit.

### What runs on commit

- **ESLint** is executed on all staged `*.ts`, `*.tsx`, `*.js`, and `*.jsx` files. Any lint errors must be fixed before the commit is accepted.

### Setup

Hooks are installed automatically when you run:

```bash
npm install
```

This works because the `prepare` script in `package.json` runs `husky` after every install.

### Skipping the hook (not recommended)

If you need to bypass the hook in exceptional cases:

```bash
git commit --no-verify -m "your message"
```

---

## Deploying Release on EC2 with CD

Deployments are automated via a GitHub Actions CD pipeline that SSHes into the EC2 instance, pulls the latest code, builds, and restarts the server.

### Branch Strategy

| Trigger                               | Environment |
| ------------------------------------- | ----------- |
| Push to `main`                        | Staging     |
| Tag matching `v*.*.*` (e.g. `v1.0.0`) | Production  |

### Pipeline Steps

**Staging** — on every push to `main`, the pipeline automatically:

1. SSHes into the EC2 instance
2. Runs `git pull` to fetch the latest code
3. Runs `npm run build` to create an optimized production build
4. Restarts the pm2 server to apply the new build

**Production** — on every version tag (e.g. `v1.0.0`, `v2.1.0`), the pipeline automatically:

1. SSHes into the EC2 instance
2. Runs `git fetch --tags` and checks out the tag
3. Runs `npm run build` to create an optimized production build
4. Restarts the pm2 server to apply the new build

---

## Learn More

- 🌐 [Kaapi](https://projecttech4dev.org/kaapi/)
- 📄 [One Pager](https://docs.google.com/document/d/15ulZt-tNnMlK3jjk2Ey2FfJ6Q3iX_8O3qfBE7Lt0spY/edit?usp=sharing)
- 📄 [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- 📄 [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

### Chat With Us

- 💬 [Discord](https://discord.gg/s7e2UBFku)
