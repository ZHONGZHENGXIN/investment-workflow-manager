# GitHub Bulk Upload Instructions

## What's in this folder
This folder contains all the core files needed for the Investment Workflow Manager system, ready for GitHub upload.

## Upload Steps

### Method 1: Drag and Drop (Recommended)
1. Go to https://github.com
2. Create new repository: investment-workflow-manager
3. Set as Public (important for Zeabur free tier)
4. Don't initialize with any files
5. In the empty repository, click "uploading an existing file"
6. Drag ALL files and folders from this directory to the upload area
7. GitHub will show all detected files
8. Commit message: "feat: Initial project upload"
9. Click "Commit changes"

### Method 2: GitHub Desktop
1. Download GitHub Desktop from https://desktop.github.com
2. Create new repository pointing to this folder
3. Commit all files
4. Publish to GitHub as public repository

## After Upload
1. Verify repository structure is correct
2. Ensure repository is set to Public
3. Go to https://zeabur.com for deployment
4. Import the GitHub repository
5. Configure environment variables
6. Deploy!

## Repository Structure
After upload, your repository should look like:
- package.json
- zeabur.json  
- README.md
- .gitignore
- backend/
  - package.json
  - tsconfig.json
  - .env.example
  - .env.production
  - src/
  - prisma/
- frontend/
  - package.json
  - vite.config.ts
  - index.html
  - tsconfig.json
  - .env.example
  - .env.production
  - src/
  - public/

Generated: 08/29/2025 16:22:38
