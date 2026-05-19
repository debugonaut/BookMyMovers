# Prowider Mini Lead Distribution System

This is a production-ready, highly reliable implementation of the Prowider Mini Lead Distribution System built as a Next.js full-stack application using PostgreSQL and Prisma.

---

## 🛠️ Setup & Running Instructions

### 1. Prerequisites
Ensure you have the following installed on your system:
*   [Node.js](https://nodejs.org/) (v18.x or later recommended)
*   [PostgreSQL](https://www.postgresql.org/) (running locally or a hosted instance)

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Variables Setup
Create a `.env` file in the root of the project with your PostgreSQL database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5455/prowider_leads?schema=public"
```

### 4. Database Setup & Seeding
Run the Prisma migrations to create the database tables and automatically seed initial services, providers, and allocation states:
```bash
npx prisma migrate dev
```

### 5. Running the Application
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

*   **Customer Lead Form**: `/request-service`
*   **Provider Dashboard**: `/dashboard`
*   **Internal Testing Panel**: `/test-tools`

---

## 🧠 Engineering & Architecture Explanations

### 1. Allocation Algorithm
Our lead distribution follows a deterministic, fair, and quota-respecting allocation logic:
1.  **Mandatory Rules Check**: For each new lead, the algorithm first checks if there are any mandatory providers for the selected service:
    *   **Service 1** $\rightarrow$ Provider 1
    *   **Service 2** $\rightarrow$ Provider 5
    *   **Service 3** $\rightarrow$ Provider 1 and Provider 4
    *   If a mandatory provider has remaining monthly quota (under the limit of 10), they are immediately assigned.
2.  **Round-Robin Pool Selection**: If more slots are needed to reach exactly 3 assigned providers, the algorithm queries the service's designated provider pool:
    *   **Service 1 Pool**: Providers 2, 3, 4
    *   **Service 2 Pool**: Providers 6, 7, 8
    *   **Service 3 Pool**: Providers 2, 3, 5, 6, 7, 8
3.  **Rotation Persistence**: We maintain the index of the last-allocated provider for each service in the `AllocationState` database table. The pool is rotated, checking for provider quota availability and duplicate-assignment avoidance, until exactly 3 providers are successfully assigned.

### 2. Concurrency & Race Condition Handling
To prevent race conditions (such as double-assigning providers or exceeding monthly quotas under simultaneous requests), we implement **database-level transaction locks**:
1.  Allocation queries execute inside an atomic Prisma transaction (`prisma.$transaction`).
2.  The transaction places an exclusive lock on the targeted service's index using a **`SELECT FOR UPDATE`** SQL query:
    ```sql
    SELECT id, "lastAllocatedProviderIndex" 
    FROM "AllocationState" 
    WHERE "serviceId" = $1 
    FOR UPDATE
    ```
3.  This serializes parallel lead allocations for the same service. Any overlapping transactions are queued sequentially, ensuring that round-robin index updates and quota counts are atomic and safe.

### 3. Webhook Idempotency
To prevent subscription-renewing webhook events (which reset a provider's monthly quota back to 0) from being executed multiple times:
1.  The reset endpoint writes a unique, client-provided `idempotencyKey` (UUID) to the `WebhookEvent` table.
2.  If the key already exists, the request returns a `200 OK` duplicate status immediately, bypassing execution.
3.  On concurrent webhook races, the database's unique constraint on `idempotencyKey` throws a key violation error, aborting the transaction cleanly and ensuring the quota is only reset once.

### 4. Security & Safety Controls
*   **OWASP Security Headers**: Custom Next.js middleware forces secure HTTP headers on all pages and APIs, including `X-Frame-Options: DENY` (Anti-Clickjacking), `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing), and strict `Permissions-Policy`.
*   **CORS Protection**: Access to the API routes is locked to same-origin requests by default, preventing external malicious scripts from triggering lead generation or resets.
*   **Rate Limiting**: Integrated in-memory sliding window rate limits on APIs (`/api/leads` and `/api/webhook/quota-reset`) returning `HTTP 429 Too Many Requests` on abuse.
