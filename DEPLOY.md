# Vercel Deployment Guide

To fix the 404 Not Found error:

1.  **Project Settings**:
    - Go to your Vercel Project Settings > **General**.
    - **Root Directory**: Click "Edit" and set it to `client`.
    - **Build Command**: `next build` (Default)
    - **Output Directory**: `.next` (Default)

2.  **Environment Variables**:
    - Go to Settings > **Environment Variables**.
    - Add `NEXT_PUBLIC_API_URL`.
    - Value: `https://your-backend-url.com/api` (Do NOT use localhost).

3.  **Redeploy**:
    - Go to Deployments and redeploy the latest commit.

## Folder Structure Verified
- Frontend Root: `client/`
- Build Output: `.next/`
- Entry Point: `client/src/app/page.tsx`
