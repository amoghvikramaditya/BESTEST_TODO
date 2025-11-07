# Frontend Configuration

This document walks through configuring the React frontend to work locally and in AWS Amplify.

## 1. Environment Variables

Create `frontend/.env` (or configure the variables in Amplify) with the following keys:

```
VITE_COGNITO_USER_POOL_ID=<Your Cognito User Pool ID>
VITE_COGNITO_CLIENT_ID=<Your App Client ID>
VITE_AWS_REGION=us-east-1
VITE_API_BASE_URL=<https://your-api-id.execute-api.<region>.amazonaws.com>
```

- `VITE_API_BASE_URL` should be the base invoke URL from API Gateway (no trailing slash).
- Use the same region that hosts Cognito, API Gateway, and DynamoDB.

> **Note:** `.env` files are git-ignored. Keep secrets out of version control.

## 2. Local Development

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Ensure the Cognito app client callback/logout URLs include this origin.

## 3. Amplify Hosting

When connecting to Amplify:

1. Add the same environment variables in the Amplify console (`VITE_*`).
2. Update the Cognito app client settings with the Amplify domain for callback and sign-out URLs.
3. Trigger a redeploy to rebuild the Vite app using the injected values.

## 4. Optional Enhancements

- Configure a custom domain in Amplify and update Cognito URLs accordingly.
- Add analytics (e.g., Amazon Pinpoint) by integrating the Amplify Analytics package and setting the relevant environment variable.
- If you require offline support, add a service worker (e.g., using Vite PWA plugin) and ensure tokens are handled securely.

