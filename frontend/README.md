# Frontend

React + Vite single-page app that integrates Amazon Cognito authentication, a drag-and-drop task board, and GSAP animations.

## Local Development

```bash
npm install
npm run dev
```

Environment variables are documented in `../docs/FRONTEND_CONFIG.md`.

## Build

```bash
npm run build
```

Upload the generated `dist/` folder to AWS Amplify (or S3 + CloudFront) as described in `../docs/DEPLOY_AWS_CONSOLE.md`.
