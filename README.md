# 💰 Expense Tracker

A full-stack personal finance management application built with **React (Vite)**, **Spring Boot**, and **MySQL**. Track income and expenses, visualize spending patterns, and manage your financial data with a clean, responsive dashboard.

---

## 📸 Features

- 🔐 **JWT Authentication** — Secure register/login flow with protected routes
- 📊 **Interactive Dashboard** — Real-time income, expense, and balance summaries
- 📈 **Data Visualizations** — Monthly bar charts and category-wise pie charts via Recharts
- 💸 **Transaction Management** — Full CRUD with category and date-based filtering
- 📱 **Mobile Responsive** — Clean, minimal UI built with Tailwind CSS
- 🔒 **Secure by Design** — User-scoped data, auto-logout on token expiry, global 401/403 handling

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 (Vite) | UI framework + fast build tooling |
| Tailwind CSS | Utility-first styling |
| Axios | HTTP client with JWT interceptors |
| Recharts | Data visualization (bar + pie charts) |
| React Router v6 | Client-side routing + protected routes |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Spring Boot 3.2 | REST API framework |
| Spring Security | Authentication + authorization |
| JWT (jjwt 0.11.5) | Stateless token-based auth |
| Spring Data JPA | ORM and database abstraction |
| Lombok | Boilerplate reduction |
| Bean Validation | Input validation |

### Database
| Technology | Purpose |
|------------|---------|
| MySQL 8.0 | Relational database |
| Hibernate | ORM with auto schema generation |

---

## 📁 Project Structure

```
expense-tracker/
├── expense-tracker-backend/
│   └── src/main/java/com/expensetracker/
│       ├── controller/         # REST endpoints
│       ├── service/            # Business logic
│       ├── repository/         # Data access layer
│       ├── model/              # JPA entities
│       ├── dto/                # Data transfer objects
│       └── security/           # JWT filter, config
│
└── expense-tracker-frontend/
    └── src/
        ├── components/         # Reusable UI components
        ├── pages/              # Login, Register, Dashboard
        ├── services/           # Axios API setup
        ├── hooks/              # useAuth custom hook
        ├── App.jsx             # Routes
        └── main.jsx            # Entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- MySQL 8.0+

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/expense-tracker.git
cd expense-tracker
```

---

### 2. MySQL Setup

```sql
CREATE DATABASE expense_tracker;
```

> Tables are auto-created by Hibernate on first run via `spring.jpa.hibernate.ddl-auto=update`

---

### 3. Backend Setup

Navigate to the backend folder and update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/expense_tracker?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=your_mysql_password

jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
jwt.expiration=86400000
```

Then run:

```bash
cd expense-tracker-backend
./mvnw clean install -DskipTests
./mvnw spring-boot:run
```

Backend starts at: **http://localhost:8080**

---

### 4. Frontend Setup

```bash
cd expense-tracker-frontend
npm install
npm run dev
```

Frontend starts at: **http://localhost:5173**

---

## 🔌 API Reference

### Auth Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login + receive JWT | No |

### Transaction Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/transactions` | Get all transactions (with filters) | ✅ Yes |
| POST | `/transactions` | Create transaction | ✅ Yes |
| PUT | `/transactions/{id}` | Update transaction | ✅ Yes |
| DELETE | `/transactions/{id}` | Delete transaction | ✅ Yes |
| GET | `/transactions/summary` | Get income/expense/balance totals | ✅ Yes |

### Query Parameters for GET `/transactions`

| Param | Type | Example |
|-------|------|---------|
| `category` | string | `Food` |
| `type` | string | `INCOME` or `EXPENSE` |
| `startDate` | date | `2025-01-01` |
| `endDate` | date | `2025-12-31` |

### Transaction Model

```json
{
  "id": 1,
  "amount": 5000.00,
  "type": "INCOME",
  "category": "Salary",
  "date": "2025-04-01",
  "description": "April salary"
}
```

---

## 🔐 Authentication Flow

```
Register → Redirect to Login (no auto-login)
    ↓
Login → JWT stored in localStorage
    ↓
All API calls → Authorization: Bearer <token>
    ↓
401/403 received → Clear token → Redirect to /login
    ↓
Logout → Clear token → Redirect to /login
```

---

## 🧪 Test the API with cURL

```bash
# Register
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@test.com","password":"secret123"}'

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"secret123"}'

# Get Transactions (replace TOKEN)
curl http://localhost:8080/transactions \
  -H "Authorization: Bearer TOKEN"

# Add Transaction
curl -X POST http://localhost:8080/transactions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"type":"INCOME","category":"Salary","date":"2025-04-01","description":"April salary"}'
```

---

## ⚙️ Environment Variables

### Backend (`application.properties`)

| Property | Description | Default |
|----------|-------------|---------|
| `server.port` | Backend port | `8080` |
| `spring.datasource.username` | MySQL username | `root` |
| `spring.datasource.password` | MySQL password | `` |
| `jwt.secret` | JWT signing key (Base64) | See config |
| `jwt.expiration` | Token expiry in ms | `86400000` (24h) |
| `cors.allowed-origins` | Frontend origin | `http://localhost:5173` |

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)          │
│  Login/Register → JWT → Dashboard        │
│  Axios Interceptor: auto-attach token    │
│  401/403 → clear token → /login          │
└──────────────────┬──────────────────────┘
                   │ HTTP via Vite Proxy
┌──────────────────▼──────────────────────┐
│         Backend (Spring Boot)            │
│  /auth/**     → Public                  │
│  /transactions/** → JWT Protected       │
│  JwtFilter → SecurityContext            │
└──────────────────┬──────────────────────┘
                   │ JPA / Hibernate
┌──────────────────▼──────────────────────┐
│              MySQL Database              │
│  users ──< transactions (FK: user_id)   │
└─────────────────────────────────────────┘
```

---

## 🙌 Author

**Arnish Mishra**
- GitHub: [@arnish-mishra](https://github.com/arnish-mishra)
- LinkedIn: [linkedin.com/in/arnish-mishra](https://linkedin.com/in/arnish-mishra)
- Email: mishraarnish@gmail.com
