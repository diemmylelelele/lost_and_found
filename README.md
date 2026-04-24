# FoundIt! Fulbright

This project aims to build a platform that allows staff and students within the Fulbright community to report lost items or found belongings and reconnect them with their owners. The development will focus on the following core functionalities:

- Reporting lost and found items
- Searching and filtering listings
- Messaging/chat between users
- Smart auto-matching of lost and found items
- Claim submission and verification process

---

## Demo Usage
This is the link to demo [video](https://youtu.be/cgAN8niM9D4?si=iUdNlKG_Fw8qLcqH)

## Completed Features

- User authentication: Register, Login, and Reset Password
- Submit reports for lost or found items
- Browse listings with category filters and keyword search
- Verification-based claim process for valuable items using score-based matching
- Smart auto-matching engine for lost and found items using Jaccard similarity across item name,description, and location. Future improvements include AI-powered image analysis.
- Real-time notifications for item matches and new messages
- Real-time user-to-user chat powered by WebSocket
- Delete posted items with ownership control (users can only delete their own posts, and claimed items - cannot be removed)

## Link GitHub repository

https://github.com/diemmylelelele/lost_and_found.git

---

## How to Run the Project

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Java JDK | 21 |
| Node.js | 18 |
| PostgreSQL | 14 |
|Maven|http://maven.apache.org/install.html|

### 1. Database Setup

Start PostgreSQL and create the database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE founditdb;
\q
```

> Tables are created automatically when the backend starts. No SQL scripts needed.

### 2. Backend

Open `backend/src/main/resources/application.properties` and set your PostgreSQL password:

```properties
spring.datasource.password=YOUR_POSTGRES_PASSWORD
```

Then run:

```bash
cd backend
mvn clean spring-boot:run
```

Wait for:
```
Started FoundItApplication in X.XXX seconds
```

Backend runs at **http://localhost:8080**

### 3. Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### 4. Open the App

Visit **http://localhost:5173** and register a new account to get started.

---

## Database Migrations

If you are pulling new changes, some features require manually adding columns to the database. Run the following commands after pulling:

```bash
psql -h localhost -U admin -d founditdb -c "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_is_anonymous BOOLEAN DEFAULT FALSE;"
```

> `IF NOT EXISTS` ensures the command is safe to run even if the column already exists.
