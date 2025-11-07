# Deploying via AWS Console

Follow this guide to provision the Serverless Todo App entirely through the AWS Console using free-tier friendly services.

## Prerequisites

- AWS account with permissions to manage Cognito, DynamoDB, Lambda, API Gateway, CloudWatch Logs, and Amplify (or S3 + CloudFront if you prefer manual hosting)
- Node.js 18+ installed locally to build the frontend if you plan to upload static assets manually
- The `backend/` directory from this repository available on your local machine for Lambda uploads

## 1. Create the Cognito User Pool

1. Open **Amazon Cognito** → **Create user pool**.
2. Choose **User name** = email (recommended) and enable email as a required attribute (`email`, `name`).
3. Under **Policies**, enable automatic email verification and set the password policy to at least 8 chars, uppercase, and numbers. Symbols are optional.
4. Create an **App client** named `ServerlessTodoWebClient` without a client secret. Enable **Cognito User Pool** identity providers.
5. Configure the following callback/logout URLs (adjust the production URL once Amplify is deployed):
   - Callback: `http://localhost:5173/`, `https://YOUR_FRONTEND_URL/callback`
   - Sign-out: `http://localhost:5173/`, `https://YOUR_FRONTEND_URL/`
6. Note the **User Pool ID** and **App Client ID** for later.

## 2. Provision DynamoDB

1. Open **DynamoDB** → **Create table**.
2. Table name: `Todos`
3. Partition key: `userId (String)`, Sort key: `taskId (String)`
4. Billing mode: **On-demand (PAY_PER_REQUEST)**
5. Add GSIs after creation:
   - `UserStatusIndex`: partition key `userId`, sort key `status`, projection type **INCLUDE** with attributes `taskId`, `createdAt`
   - `CreatedAtIndex`: partition key `userId`, sort key `createdAt`, projection **ALL**

## 3. Deploy Lambda Functions

You will create five Node.js 20.x functions (`CreateTask`, `ListTasks`, `GetTask`, `UpdateTask`, `DeleteTask`). Repeat the steps below for each handler.

1. Open **Lambda** → **Create function** → Author from scratch.
2. Runtime: **Node.js 20.x**; Architecture: `x86_64` (default).
3. Execution role: create a new role with basic Lambda permissions.
4. After the function is created, open the **Code** tab and upload a `.zip` of the relevant folder. Each handler lives in `backend/lambdas/<FunctionName>/`.
   - Zip instructions (macOS/Linux):
     ```bash
     cd backend/lambdas/CreateTask
     zip -r ../CreateTask.zip .
     ```
     Upload `CreateTask.zip` via the console. Repeat for each handler.
5. Set environment variables for every function:
   - `TODOS_TABLE = Todos`
   - `AWS_REGION = us-east-1` (or your chosen region)
6. Attach the IAM policy in `backend/iam-policy.json` to the Lambda role. Replace `${AWS::Region}` and `${AWS::AccountId}` with actual values if you paste it into the inline policy editor.

## 4. Configure API Gateway (HTTP API)

1. Open **API Gateway** → **Create API** → **HTTP API**.
2. Under **Integrations**, add each Lambda function and define the routes:

   | Method | Path              | Lambda     |
   | ------ | ----------------- | ---------- |
   | POST   | `/tasks`          | CreateTask |
   | GET    | `/tasks`          | ListTasks  |
   | GET    | `/tasks/{taskId}` | GetTask    |
   | PUT    | `/tasks/{taskId}` | UpdateTask |
   | DELETE | `/tasks/{taskId}` | DeleteTask |

3. Deploy the API and note the **Invoke URL**.

## 5. Secure Routes with Cognito Authorizer

1. In the HTTP API settings, open **Authorizers** → **Create** → **JWT authorizer**.
2. Provide a name (e.g., `CognitoTodoAuthorizer`) and set the issuer and audience:
   - Issuer URL: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`
   - Audience: `<appClientId>`
3. Attach the authorizer to every route. Require valid JWTs for all methods other than CORS `OPTIONS`.

## 6. Smoke-Test the Backend

Use **curl** or Postman with an access token obtained from Cognito (via hosted UI or Amplify) to verify:

- `POST /tasks` creates a record in DynamoDB
- `GET /tasks` returns only the authenticated user’s tasks
- `PUT`/`DELETE` enforce ownership and respond with 404/401 appropriately

## 7. Host the Frontend with Amplify

1. Open **AWS Amplify** → **Create new app** → **Deploy without Git provider** (or connect Git if preferred).
2. Upload the Vite build output:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

   Upload the contents of `frontend/dist`.

3. Configure the following environment variables in Amplify (Build settings → Environment variables):
   - `VITE_COGNITO_USER_POOL_ID`
   - `VITE_COGNITO_CLIENT_ID`
   - `VITE_API_BASE_URL` (from API Gateway)
   - `VITE_AWS_REGION`
4. Update the Cognito app client callback/logout URLs with the Amplify domain.

## 8. End-to-End Testing Checklist

- ✅ Sign up, confirm email, and sign in via the custom UI
- ✅ Authenticated API calls succeed; unauthenticated calls return 401
- ✅ Create/List/Update/Delete tasks persist correctly in DynamoDB
- ✅ Drag-and-drop reorders and persists `position`
- ✅ Logout clears the session and protects routes
- ✅ Responsive layouts validated on desktop and mobile
- ✅ Accessibility spot checks (tab order, aria labels on drag handles)

## Troubleshooting Tips

- Use CloudWatch Logs for each Lambda if responses are unexpected.
- Ensure that the Lambda execution role includes permissions for both the table and its GSIs.
- Verify that API Gateway routes have the Cognito authorizer attached; otherwise, Lambda receives no `authorizer` claims.
- If Amplify deploys but the app fails to load data, double-check the environment variables and CORS headers.

