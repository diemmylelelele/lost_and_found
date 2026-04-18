# FoundIt

The scope of this project is to develop a centralized, digital lost-and-found management system specifically for the Fulbright University Vietnam community only.
The development will focus on the following core functionalities:
- Reporting lost and found items
- Searching and filtering items
- Messaging/chat between users
- Smart auto-matching between lost and found items
- Claim and verification process

---

## Completed Features

- Register / Login with JWT authentication
- Report found or lost items 
- Browse items — filter by category, search by keyword
- Item detail page with claim and chat actions
- Simple claim flow for non-valuable items (finder approves)
- Verification-based claim flow for valuable items (score-based matching)
- Smart auto-matching engine between lost and found items (Jaccard similarity on name, description, location)
- Real-time notifications for matches and claim updates (WebSocket + polling)
- Real-time chat between users (WebSocket)
- Delete posted items (blocked if item is already claimed)

---

## How to Run the Project

You need **two terminals** open at the same time.

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Java JDK | 21 |
| Node.js | 18 |
| PostgreSQL | 14 |

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
