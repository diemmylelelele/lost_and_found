# FoundIt Fulbright — Lost & Found Platform

A web application for Fulbright University Vietnam students to report and recover lost and found items.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Spring Boot 3.2.5, Java 21 |
| Database | PostgreSQL |
| Auth | JWT (JSON Web Tokens) |
| Real-time | WebSocket (STOMP) |

---

## Prerequisites

Make sure you have the following installed before running the project:

| Tool | Minimum Version | Download |
|------|----------------|----------|
| Java JDK | 21 | https://adoptium.net |
| Node.js | 18 | https://nodejs.org |
| PostgreSQL | 14 | https://www.postgresql.org/download |

> Maven is bundled inside the project (`mvnw` / `mvnw.cmd`) — you do not need to install it separately.

---

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd lost_and_found
```

---

## 2. Database Setup

### 2.1 Start PostgreSQL

Make sure your PostgreSQL service is running.

**Windows:** Search for "Services" → find "postgresql-x64-XX" → Start

**macOS:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo service postgresql start
```

### 2.2 Create the database

```bash
psql -U postgres
```

Inside the PostgreSQL prompt:

```sql
CREATE DATABASE founditdb;
\q
```

> Tables are created **automatically** when the backend starts for the first time. No SQL scripts needed.

---

## 3. Backend Setup

### 3.1 Configure the database connection

Open:
```
backend/src/main/resources/application.properties
```

Update the password to match your local PostgreSQL:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/founditdb
spring.datasource.username=postgres
spring.datasource.password=YOUR_POSTGRES_PASSWORD
```

### 3.2 (Optional) Configure Gmail for password reset emails

In the same `application.properties` file, replace the placeholder values:

```properties
spring.mail.username=your-gmail@gmail.com
spring.mail.password=your-gmail-app-password
```

> **How to get a Gmail App Password:**
> Google Account → Security → 2-Step Verification → App Passwords → Generate
>
> If you skip this step, the password reset feature still works — the OTP code will be printed to the **backend console** instead of sent by email.

### 3.3 Run the backend

Open a terminal, go to the `backend/` folder:

```bash
cd backend
```

**Windows:**
```bash
mvnw.cmd spring-boot:run
```

**macOS / Linux:**
```bash
./mvnw spring-boot:run
```

Wait until you see:
```
Started FoundItApplication in X.XXX seconds
```

The backend is now running at **http://localhost:8080**

---

## 4. Frontend Setup

Open a **new terminal** (keep the backend terminal running).

```bash
cd frontend
```

### 4.1 Install dependencies

```bash
npm install
```

### 4.2 Start the development server

```bash
npm run dev
```

The frontend is now running at **http://localhost:5173**

---

## 5. Open the App

Visit **http://localhost:5173** in your browser.

Register a new account to get started.

> Both terminals must stay open while using the app.

---

## Running Summary

You need **two terminals** open at the same time:

| Terminal | Folder | Command | URL |
|----------|--------|---------|-----|
| 1 — Backend | `backend/` | `mvnw.cmd spring-boot:run` | http://localhost:8080 |
| 2 — Frontend | `frontend/` | `npm run dev` | http://localhost:5173 |

---

## Project Structure

```
lost_and_found/
├── backend/
│   ├── src/main/java/com/foundit/
│   │   ├── controller/        # REST API endpoints
│   │   ├── service/           # Business logic
│   │   ├── model/             # Database entities
│   │   ├── dto/               # Request / response objects
│   │   ├── repository/        # Database queries
│   │   └── config/            # Security, WebSocket, CORS
│   ├── src/main/resources/
│   │   └── application.properties
│   └── uploads/               # Uploaded images (auto-created at runtime)
│
└── frontend/
    ├── src/
    │   ├── pages/             # Page-level components
    │   ├── components/        # Reusable UI components
    │   ├── api/               # Axios API calls
    │   └── context/           # Auth context (JWT)
    └── vite.config.js         # Dev server + proxy config
```

---

## Features

- Register / Login with JWT authentication
- Report found or lost items with photo upload
- Browse items — filter by category and location
- Item detail page with Claim and Chat actions
- Real-time chat between users (WebSocket)
- Real-time notifications for matches and messages
- Profile page — edit name, avatar, and password
- Forgot password — OTP reset via email

---

## Troubleshooting

### `ws proxy error: ECONNREFUSED`
The backend is not running. Start it in Terminal 1.

### `password authentication failed for user "postgres"`
The password in `application.properties` does not match your PostgreSQL password. Update `spring.datasource.password`.

### `database "founditdb" does not exist`
Run `CREATE DATABASE founditdb;` in psql (see Step 2.2).

### Port 8080 already in use
Add this line to `application.properties` to use a different port:
```properties
server.port=8081
```
Then also update `vite.config.js` proxy targets from `8080` to `8081`.

### Images not displaying
The `backend/uploads/` directory is created automatically on first upload. Make sure the backend is running when the frontend is open.

### `npm install` fails
Make sure Node.js version is 18 or higher:
```bash
node --version
```
