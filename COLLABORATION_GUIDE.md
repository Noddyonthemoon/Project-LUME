# Project LUME: Collaboration Guide

This guide explains how to work on **Project LUME** as a team. It covers the daily workflow for editing, syncing, and pushing changes using Git and GitHub.

---

## 🛠️ 1. Initial Setup for Team Members

If you are joining the project, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/project-lume.git
    cd project-lume
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**:
    Create a `.env.local` file by copying the template:
    ```bash
    cp .env.example .env.local
    ```
    *Ask the project owner for the Supabase keys to fill in this file.*

---

## 🔄 2. The Daily Workflow (Syncing & Editing)

Before you start working, always make sure you have the latest version of the code.

### Step A: Sync with GitHub (Pull)
Run this command to download the latest changes from your teammates:
```bash
git checkout main
git pull origin main
```

### Step B: Create a Feature Branch
Never work directly on the `main` branch. Create a new branch for your specific task:
```bash
# Replace 'feature-name' with something descriptive (e.g., 'fix-sidebar-search')
git checkout -b feature/feature-name
```

### Step C: Editing & Testing
1.  Make your changes in the code.
2.  Run the development server to test:
    ```bash
    npm run dev
    ```
3.  Verify your changes look and work as expected.

---

## 🚀 3. Pushing Changes

Once you are happy with your work, it's time to share it with the team.

### Step A: Commit Your Work
```bash
git add .
git commit -m "Explain what you changed (e.g., 'Implemented sidebar search')"
```

### Step B: Push to GitHub
```bash
git push origin feature/feature-name
```

### Step C: Create a Pull Request (PR)
1.  Go to the repository on GitHub.
2.  You will see a button: **"Compare & pull request"**. Click it.
3.  Add a description of what you did and why.
4.  Click **"Create pull request"**.
5.  Wait for a teammate to review your code. Once approved, it can be merged into `main`.

---

## 🤝 4. Collaboration Best Practices

1.  **Small Commits**: Commit often and keep them small. It's easier to review and undo if something goes wrong.
2.  **Stay Updated**: Run `git pull origin main` frequently to avoid large "merge conflicts" later.
3.  **Communication**: Talk to your team before starting a big change to avoid overlapping work.
4.  **Security**: **NEVER** commit your `.env.local` file. It is already in `.gitignore`, but stay vigilant.

---

## 🆘 Handling Merge Conflicts

If Git says there is a "Merge Conflict":
1.  Open the conflicting files in VS Code.
2.  Look for the markers: `<<<<<<< HEAD`, `=======`, and `>>>>>>>`.
3.  Choose which code to keep (or combine both).
4.  Save the files, then run:
    ```bash
    git add .
    git commit -m "Resolved merge conflict"
    ```
