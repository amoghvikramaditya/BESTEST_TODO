# Serverless Todo App

Minimal serverless Todo application that pairs an AWS-native backend (Cognito, API Gateway, Lambda, DynamoDB) with a modern React + Vite frontend hosted on Amplify.

## Project Structure

- `frontend/` – React application using Vite, Tailwind CSS, GSAP animations, and dnd-kit for drag & drop.
- `backend/` – AWS Lambda handlers (Node.js 20.x) for task CRUD operations and shared DynamoDB utilities.
- `docs/DEPLOY_AWS_CONSOLE.md` – Step-by-step console deployment guide.
- `docs/FRONTEND_CONFIG.md` – Frontend environment variable and Amplify hosting instructions.

## Getting Started Locally

1. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend**
   Each Lambda folder (`backend/lambdas/*`) can be zipped and uploaded directly from the AWS Console. See `docs/DEPLOY_AWS_CONSOLE.md` for deployment details and IAM policy guidance.

## Environment Variables

Create a `.env` file inside `frontend/` (see `docs/FRONTEND_CONFIG.md`):

```
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_AWS_REGION=us-east-1
VITE_API_BASE_URL=
```

Replace the placeholders with values from the AWS resources you provision in the console.

## Testing

- Follow the testing checklist in `docs/DEPLOY_AWS_CONSOLE.md` once the application is deployed.

## License

MIT

