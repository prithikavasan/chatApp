# ChatCode - "Share. Connect. Code."

ChatCode is a real-time, production-ready MERN stack chat application. Instead of relying on phone numbers or search lists, users connect using unique, random **Chat Codes** (e.g., `CP84562`).

---

## Technical Stack

- **Frontend:** React, Vite, Vanilla CSS (Glassmorphic dark/light UI), Framer Motion, React Router DOM, Axios, React Icons, React Hot Toast.
- **Backend:** Node.js, Express, MongoDB Atlas, Mongoose, Socket.IO, JWT, bcryptjs, Multer, Cloudinary, helmet, express-rate-limit.

---

## Folder Structure

### Backend (`/backend`)
```
backend/
├── config/             # DB initialization (Mongoose connection)
├── controllers/        # Business logic controllers (MVC Pattern)
├── middlewares/        # JWT security, file parsing, error captures
├── models/             # Mongoose DB schema definitions
├── routes/             # REST Endpoints mapping
├── socket/             # Real-time socket connections and state maps
└── utils/              # Media uploaders, token and code generators
```

### Client (`/client`)
```
client/
├── src/
│   ├── assets/         # App icons & graphics
│   ├── components/     # Reusable UI overlays & layout grids
│   ├── contexts/       # Authentication, theme settings, and state stores
│   ├── hooks/          # Shorthand consumers for chat & friends state
│   ├── pages/          # Auth, Dashboard, Profile, and Settings screens
│   ├── routes/         # Routing paths
│   └── services/       # Axios wrappers
├── index.html          # Core template
└── vite.config.js      # Dev server configurations & API proxies
```

---

## API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /register` - Register name, username, email, password. Generates Chat Code.
- `POST /login` - Login with credentials (email or username) & password. Sets auth token.
- `POST /logout` - Log out user and clear session cookies.
- `GET /me` - Authenticate active cookie and fetch current user profile.
- `POST /forgotpassword` - Request a password reset OTP (logs token to console).
- `POST /resetpassword` - Apply new password using the reset OTP.

### 2. User Settings (`/api/users`)
- `PUT /profile` - Update profile name, bio, themes, and profile image (Multer).
- `PUT /change-password` - Change account password.
- `PUT /block/:id` - Toggle block/unblock status on a user ID.
- `GET /blocked` - Get list of blocked user profiles.
- `DELETE /account` - Erase account history and clear cookies.

### 3. Friend System (`/api/friends`)
- `GET /search/:chatCode` - Find a user profile and relationship status by Chat Code.
- `POST /request/:chatCode` - Send a friend request.
- `PUT /request/accept/:requestId` - Accept request (creates conversation).
- `PUT /request/reject/:requestId` - Reject request (deletes log).
- `DELETE /request/cancel/:requestId` - Cancel a sent request.
- `DELETE /remove/:friendId` - Remove friend from contacts.
- `GET /list` - List accepted friends.
- `GET /requests` - Fetch sent and received pending requests.
- `GET /mutual/:friendId` - Count mutual friends.

### 4. Conversations (`/api/conversations`)
- `GET /` - Fetch all conversations with unread counts and sorting.
- `GET /:id` - Get a conversation profile by ID.
- `POST /group` - Create a group chat (name, description, member list).
- `PUT /group/:id/rename` - Rename group (admin only).
- `PUT /group/:id/description` - Edit description (admin only).
- `PUT /group/:id/icon` - Upload group avatar icon (admin only).
- `PUT /group/:id/add` - Add members to group (admin only).
- `PUT /group/:id/remove` - Remove member or leave group.
- `PUT /pin/:id` - Toggle pinned status.
- `PUT /mute/:id` - Toggle mute status.
- `PUT /archive/:id` - Toggle archive status.

### 5. Messaging (`/api/messages`)
- `POST /:conversationId` - Send text/code/files in a conversation.
- `GET /:conversationId` - Get paginated message history.
- `PUT /edit/:id` - Edit message text content.
- `DELETE /delete-me/:id` - Hide message for current user.
- `DELETE /delete-everyone/:id` - Recall message.
- `POST /react/:id` - Toggle reaction emoji.
- `GET /search/:conversationId` - Keyword search inside messages.

### 6. Notifications (`/api/notifications`)
- `GET /` - Get all unread notifications.
- `PUT /mark-all-read` - Mark all notifications as read.
- `PUT /:id/read` - Mark single notification as read.
- `DELETE /` - Clear notification list.

---

## Socket Events

- `register_user` - Connects socket with userId on login.
- `online_users` - Broadcasts list of active online user IDs.
- `join_room` & `leave_room` - Join/leave a conversation's real-time events.
- `send_message` & `receive_message` - Distribute new messages instantly to room members.
- `typing` & `stop_typing` - Typing indicators.
- `message_seen` - Update message read receipt to database and room.
- `message_delivered` - Update message delivery status to database and room.
- `friend_request` - Direct toast notifications on incoming requests.
- `friend_request_accepted` - Sync lists when a request is accepted.

---

## How to Run Locally

### Prerequisites
- Node.js installed.
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or MongoDB Atlas.

### 1. Boot up Backend
```bash
cd backend
npm install
npm run dev
```
The server will connect to your database and listen on port `5000`.

### 2. Boot up Frontend Client
```bash
cd client
npm install
npm run dev
```
The frontend client will run on `http://localhost:5173`. Any requests to `/api` or `/socket.io` will automatically proxy to `http://localhost:5000`.

---

## Deployment Ready

### Database: MongoDB Atlas
1. Create a free cluster on MongoDB Atlas.
2. In network access, allow IP address `0.0.0.0/0`.
3. Copy the Connection URI.

### Backend: Render
1. Connect GitHub repository to Render.
2. Select **Web Service** with build command `npm install` and start command `node server.js` (pointing to `backend/`).
3. Set environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=your_mongodb_atlas_uri`
   - `JWT_SECRET=your_production_secret`
   - `CLIENT_URL=https://your-frontend.vercel.app`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (if media uploading is used).

### Frontend: Vercel
1. Import the client subdirectory (`client/`) to Vercel.
2. Set configuration override settings for Vite assets (usually defaults are fine).
3. Set environment variables:
   - `VITE_API_URL=https://your-backend.onrender.com/api`
   - `VITE_SOCKET_URL=https://your-backend.onrender.com`
