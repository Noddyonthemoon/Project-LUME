# GitHub Upload Guide

Follow these steps to safely and properly upload **Project LUME** to GitHub.

## Prerequisites

1.  A [GitHub account](https://github.com/join).
2.  [Git installed](https://git-scm.com/downloads) on your machine.
3.  Ensure you have already run `npm install` and your project is working locally.

---

## Step 1: Initialize Git Locally

Open your terminal in the project root directory and run:

```bash
git init
```

## Step 2: Add Files and Commit

Add all your project files to the staging area. The `.gitignore` file we created will automatically exclude sensitive files like `.env.local` and the `node_modules` folder.

```bash
git add .
git commit -m "Initial commit: Project LUME setup"
```

## Step 3: Create a New Repository on GitHub

1.  Go to [github.com/new](https://github.com/new).
2.  **Repository name**: `project-lume` (or any name you prefer).
3.  **Public/Private**: Choose based on your preference.
4.  **DO NOT** initialize the repository with a README, license, or gitignore (we already have them).
5.  Click **Create repository**.

## Step 4: Link Local Repo to GitHub

Copy the URL of your new repository (it looks like `https://github.com/your-username/project-lume.git`) and run:

```bash
# Replace <your-repo-url> with the URL you copied
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

---

## 🔒 Important Security Note

We have configured `.gitignore` to prevent your `.env.local` file from being uploaded. **Never** remove `.env.local` from `.gitignore` or manually upload it. This file contains your Supabase secrets.

If you ever accidentally commit secrets:
1.  Rotate your Supabase keys immediately in the Supabase dashboard.
2.  Use a tool like [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-repo` to remove the sensitive data from your history.

---

## ✅ Best Practices for GitHub

1.  **Meaningful Commits**: Commit small, logical changes with descriptive messages.
2.  **Branches**: Use branches (e.g., `feature/map-update`) for new features instead of working directly on `main`.
3.  **README**: Keep your README updated as your project evolves.
