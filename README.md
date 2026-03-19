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
- [Clone Frontend Repo](#clone-frontend-repo)
  - [Git commands to clone](#git-commands-to-clone)
- [Installation](#installation)
  - [Start frontend server](#start-frontend-server)
- [Available Scripts](#available-scripts)
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

### Kaapi Guardrails Service _(coming soon)_

The Guardrails UI (currently in development) will require the Kaapi Guardrails service to be running alongside the backend. Setup instructions will be added here once the service is available.

> 🚧 No action needed for now — this is a placeholder for when the Guardrails feature lands in `main`.

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
npm install      # Install dependencies
npm run dev      # Run app in development mode
npm run build    # Create optimized production build
npm run start    # Start the production server
npm run lint     # Run ESLint
```

---

## Deploying Release on EC2 with CD

Deployments are automated via a GitHub Actions CD pipeline that SSHes into the EC2 instance, pulls the latest code, builds, and restarts the server.

### Branch Strategy

| Branch    | Environment |
| --------- | ----------- |
| `main`    | Staging     |
| `release` | Production  |

### Pipeline Steps

On every push to `main` or `release`, the pipeline automatically:

1. SSHes into the EC2 instance
2. Runs `git pull` to fetch the latest code
3. Runs `npm run build` to create an optimized production build
4. Restarts the server to apply the new build

---

## Learn More

- 🌐 [Kaapi](https://projecttech4dev.org/kaapi/)
- 📄 [One Pager](https://docs.google.com/document/d/15ulZt-tNnMlK3jjk2Ey2FfJ6Q3iX_8O3qfBE7Lt0spY/edit?usp=sharing)
- 📄 [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- 📄 [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

### Chat With Us

- 💬 [Discord](https://discord.gg/BRYzSYha)
