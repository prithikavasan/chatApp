# ChatCode - Production Deployment Manual

This document details the step-by-step procedures to deploy **ChatCode** publicly to production.

---

## 1. Create a MongoDB Atlas Database

1. Sign in to your [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas).
2. Create a new project and build a database deployment (the M0 Free Tier is sufficient for development and small-scale production).
3. Choose a cloud provider (e.g., AWS) and region, then click **Create**.
4. Set up database credentials (create a database user with read/write access to all databases) and write down the username and password.
5. In the **Network Access** tab under Security:
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (adds `0.0.0.0/0`). This is required because Render server IP addresses change dynamically.
6. Navigate back to **Database** and click **Connect**:
   - Choose **Drivers** under Connect to your application.
   - Copy the Connection String URI (e.g. `mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`).
   - Replace `<username>` and `<password>` with the credentials of the user created in step 4.

---

## 2. Configure Cloudinary Media Storage

1. Create a free account on [Cloudinary](https://cloudinary.com).
2. Log in to the Cloudinary Console Dashboard.
3. Locate your Product Environment Credentials:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
4. Copy these values; they must be provided as environment variables to the backend Render service so that users can upload images, videos, documents, PDFs, and voice notes.

---

## 3. Deploy the Backend to Render

### Option A: Blueprint Deployment (Recommended)
1. Commit the code, including the `render.yaml` file, to a GitHub repository.
2. In the Render Dashboard, click **New** -> **Blueprint**.
3. Link your GitHub repository.
4. Render will read the `render.yaml` configurations, create the Web Service, pre-set the health check endpoint `/api/health`, and prompt you to input the values for the blank environment variables (`MONGODB_URI`, `CLIENT_URL`, etc.).

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New** -> **Web Service**.
2. Link your GitHub repository.
3. Configure the following parameters:
   - **Name:** `chatcode-backend`
   - **Region:** Choose the region closest to your users.
   - **Branch:** `main` (or your active release branch).
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Set up the Environment Variables (see Section 5).
5. Click **Deploy Web Service**. Render will spin up the Node environment, run the installer, connect to MongoDB, and listen on a random port assigned automatically by Render (mapped internally from process.env.PORT).

---

## 4. Deploy the Frontend to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Configure the following deployment parameters:
   - **Framework Preset:** `Vite` (Vercel automatically detects this).
   - **Root Directory:** `client` (Click edit and point to the `client` folder).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Environment Variables** and add the variables listed in Section 5.
6. Click **Deploy**. Vercel will bundle the SPA, compile scripts, compress files, upload to their edge CDNs, and provide a public URL (e.g. `https://chatcode.vercel.app`).

---

## 5. Configure Environment Variables

Provide the following configurations on the hosting dashboards.

### Backend Environment Variables (Render Dashboard)
| Variable Name | Description | Source / Example Value |
| :--- | :--- | :--- |
| `PORT` | Local binding port | Set to `5000` (Render overrides this in production) |
| `NODE_ENV` | Environment context indicator | `production` |
| `MONGODB_URI` | MongoDB Atlas Cluster link | Connection string copied from MongoDB Atlas (Section 1) |
| `JWT_SECRET` | Secret key to sign authorization tokens | Any random long alphanumeric string (keep secure) |
| `CLIENT_URL` | URL of the frontend deployment | Your Vercel frontend URL, e.g., `https://chatcode.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Identifier | Copied from Cloudinary Dashboard (Section 2) |
| `CLOUDINARY_API_KEY` | Cloudinary Key | Copied from Cloudinary Dashboard (Section 2) |
| `CLOUDINARY_API_SECRET` | Cloudinary Secret | Copied from Cloudinary Dashboard (Section 2) |

### Frontend Environment Variables (Vercel Dashboard)
| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Absolute URL targeting backend REST | `https://chatcode-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | Absolute URL targeting backend sockets | `https://chatcode-backend.onrender.com` |

---

## 6. Connect Frontend and Backend

- The frontend connects to the backend REST controllers via Axios using `VITE_API_URL`.
- The frontend connects to the backend Socket.IO listeners via `socket.io-client` using `VITE_SOCKET_URL`.
- **CORS Acknowledgment:** When client makes requests, the backend verifies if the request origin matches `process.env.CLIENT_URL`.
  - > [!IMPORTANT]
  - > Ensure `CLIENT_URL` in your Render settings matches the Vercel URL exactly (no trailing slash). If it does not match, CORS errors will block logins, requests, and socket connections.

---

## 7. Enable HTTPS (SSL Secure Encryption)

- Both Vercel and Render deploy resources under SSL (HTTPS) automatically for their default domain names (`.vercel.app` and `.onrender.com`).
- No SSL certificates need to be purchased or generated manually.
- If you bind a custom domain name (e.g., `chatcode.dev`):
  - Render handles Let's Encrypt certificate setups automatically once domain DNS CNAME keys point to Render hosts.
  - Vercel automates SSL certificates once custom domain names are confirmed in settings.

---

## 8. Test Socket.IO Websocket Connections

1. Open your production URL in one browser window and log in as User A.
2. Open the URL in another browser window (or in incognito mode) and log in as User B.
3. Verify the following:
   - **Online Status:** Check if both users see each other as "Online" (green indicator dot) once they become friends.
   - **Typing Indicator:** Type inside the input bar as User A and confirm User B sees "User A is typing...".
   - **Instant Messages:** Send a message and confirm it appears in the chat window of User B instantly, without reloading the page.
   - **Seen Receipts:** Open the conversation as User B, and confirm User A's sent checkmarks turn from double-gray (delivered) to blue double-checks (seen).

---

## 9. Common Deployment Issues and Fixes

### Issue 1: CORS Blocked (REST or Socket connection fails)
- **Error:** `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy.`
- **Cause:** `CLIENT_URL` on Render does not match your Vercel URL, or `VITE_API_URL` on Vercel points to the wrong Render URL.
- **Fix:** Double check spelling on both ends. Ensure there is no trailing slash on `CLIENT_URL` (e.g., use `https://chatcode.vercel.app` instead of `https://chatcode.vercel.app/`). Restart/Redeploy services.

### Issue 2: Socket connections fallback to HTTP Polling
- **Error:** WebSocket connection fails and falls back to polling, showing warnings in browser console.
- **Cause:** CORS headers are mismached, or WebSockets are blocked by client configurations.
- **Fix:** The provided `SocketContext.jsx` includes reconnection parameters and falls back to `polling` automatically. Verify that Socket.io on the backend server is listening correctly on the HTTP server container, not a separate port.

### Issue 3: Page refresh on Vercel returns "404 Not Found"
- **Error:** Direct hits or browser refreshes on routes like `/settings` return a Vercel 404 page.
- **Cause:** Vercel looks for a physical directory index file at `/settings/index.html` on the server.
- **Fix:** Ensure [vercel.json](file:///c:/Users/sundaravasan/OneDrive/Desktop/chatApp/client/vercel.json) is committed in the root of the client folder with rewrites directing virtual paths back to `/index.html`.

### Issue 4: Rate Limiting Blocks Chat Input
- **Error:** Chat updates return `429 Too Many Requests`.
- **Cause:** Express Rate Limiter blocks requests because all incoming requests appear to come from the same server IP (Render proxy).
- **Fix:** Ensure `app.set('trust proxy', 1)` is enabled in [server.js](file:///c:/Users/sundaravasan/OneDrive/Desktop/chatApp/backend/server.js) so Express rate limits are calculated based on the correct client IP address.

---

## 10. Production Checklist

- [ ] MongoDB Atlas Network Access is set to `0.0.0.0/0` (Allow all IP addresses).
- [ ] Database credentials are encrypted and stored in `MONGODB_URI` environment variable.
- [ ] `NODE_ENV` is set to `production` in Render variables.
- [ ] `CLIENT_URL` on Render matches Vercel domain spelling.
- [ ] `VITE_API_URL` on Vercel points to Render URL with trailing `/api`.
- [ ] `VITE_SOCKET_URL` on Vercel points to Render base URL (without `/api`).
- [ ] Cloudinary details are set up correctly for file attachments.
- [ ] `vercel.json` is committed in client folder to allow SPA path routing.
- [ ] Verified that local development files (`.env`) containing secrets are added to `.gitignore` and are not committed to GitHub.
