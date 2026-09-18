# Bakery Management Website

A full-stack bakery management web application with role-based access for customers, drivers, and admins — supporting product browsing, cart management, order placement/tracking, delivery assignment, and PDF invoice generation.

## Features

- **Authentication** — Passwordless login via email OTP, HTTP-only JWT cookie sessions
- **Products** — Browse, search, filter, and paginate; admin CRUD management
- **Cart** — Add, update, remove items per authenticated customer
- **Orders** — Place orders, track status, assign drivers, update delivery status
- **Roles** — `customer`, `driver`, and `admin` with route-level authorization
- **Invoices** — Automatic PDF invoice generation on order placement
- **Email** — OTP delivery via Gmail (Nodemailer)
- **API docs** — Swagger UI

## Tech Stack

- **Backend:** Node.js, Express 5
- **Database:** MySQL (via `mysql2`)
- **Auth:** JWT, bcrypt/bcryptjs, HTTP-only cookies
- **Validation:** Joi
- **File uploads:** Multer
- **PDF generation:** PDFKit
- **Email:** Nodemailer
- **Testing:** Jest, Supertest
- **Frontend:** Static HTML/CSS/JS (`FrontEnd/`)

## Project Structure

```
├── app.js                  # Express app setup
├── server.js               # Entry point
├── src/
│   ├── Controllers/        # Request handlers
│   ├── Services/           # Business logic
│   ├── Repositories/       # Database queries
│   ├── Routes/             # API route definitions
│   ├── Middleware/         # Auth, role checks, upload, error handling
│   ├── Validations/        # Joi schemas
│   ├── ErrorHandling/      # Custom error classes and error codes
│   ├── integrations/       # Email and invoice services
│   └── config/             # App configuration
├── FrontEnd/                # Static frontend (HTML/CSS/JS)
├── uploads/                 # Uploaded files (gitignored)
├── invoices/                # Generated PDF invoices (gitignored)
└── API_ENDPOINTS.md         # Full API reference
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MySQL database

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the project root with the following variables:

```
JWT_SECRET=
JWT_EXPIRES_IN=

DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
PORT=
DATABASE_URL=

GMAIL_USER=
GMAIL_APP_PASSWORD=
```

### Run

```bash
node server.js
```

The server starts on the port defined in `PORT`.

## API Documentation

See [API_ENDPOINTS.md](API_ENDPOINTS.md) for the full endpoint reference, or visit the Swagger UI when the server is running.

## License

This project was created for academic purposes as part of the Web Programming I course.
