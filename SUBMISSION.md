# Prowider Mini Lead Distribution System
## Technical Submission Documentation & Implementation Report

---

## 1. Setup and Running Instructions

### Prerequisites
*   **Node.js**: Version 18.x or later (recommended).
*   **PostgreSQL**: A local instance running on your machine, or a hosted PostgreSQL instance (e.g. Supabase, Neon).

### Installation and Launch Steps
1.  **Clone/Extract Project & Install Dependencies**:
    Navigate to the project root directory and install node modules:
    ```bash
    npm install
    ```

2.  **Environment Variables Configuration**:
    Create a `.env` file in the project root directory and define the connection string to your PostgreSQL database.
    ```env
    # Example format:
    DATABASE_URL="postgresql://username:password@localhost:5432/prowider_db?schema=public"
    ```

3.  **Database Migration & Seeding**:
    Generate the database schema and populate it with initial data (Services, Providers, and Allocation States) using Prisma Migrations:
    ```bash
    npx prisma migrate dev
    ```
    *Note: The migration script automatically runs the seed file (`prisma/seed.ts`), initializing Services 1-3, Providers 1-8, and setting up their default monthly quotas (10) and round-robin allocation state.*

4.  **Start the Local Development Server**:
    Launch the Next.js development server:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

5.  **Page Endpoints**:
    *   **Customer Request Form**: `http://localhost:3000/request-service`
    *   **Live Provider Dashboard**: `http://localhost:3000/dashboard`
    *   **Internal Testing Panel**: `http://localhost:3000/test-tools`

---

## 2. Short Explanation of the Allocation Algorithm

The system distributes customer leads to exactly three distinct providers using a fair, quota-aware round-robin routing logic.

### Algorithm Steps:
1.  **Quota Verification**: Every provider starts with a monthly quota limit of `10` leads. Once a provider has received 10 leads, they are skipped in future assignments for that month until their quota is reset.
2.  **Mandatory Assignment**: The selected service's mandatory providers are checked first:
    *   **Service 1 (Mumbai)**: Provider 1 (Mandatory)
    *   **Service 2 (Delhi)**: Provider 5 (Mandatory)
    *   **Service 3 (Bangalore)**: Provider 1 & Provider 4 (Mandatory)
    If a mandatory provider has remaining quota, they are assigned to the lead.
3.  **Round-Robin Pool Selection**: If the lead still requires more assignments to reach the required **exactly 3 providers**, the algorithm queries the round-robin pool corresponding to the service:
    *   **Service 1 Pool**: Providers 2, 3, and 4
    *   **Service 2 Pool**: Providers 6, 7, and 8
    *   **Service 3 Pool**: Providers 2, 3, 5, 6, 7, and 8
    Using the last allocated pool index stored in the database (`AllocationState.lastAllocatedProviderIndex`), the pool is cycled. The algorithm checks each provider's quota and duplicate status, assigning available pool providers and advancing the index.
4.  **Strict 3-Provider Enforcment**: If the pool runs out of eligible providers (due to exhausted quotas) and cannot assign exactly three providers, the transaction throws a custom `NOT_ENOUGH_PROVIDERS` error, rolling back the database state entirely to prevent partial or invalid allocations.

---

## 3. How Concurrency was Handled

In a high-traffic environment, concurrent lead submissions for the same service could read identical allocation state simultaneously, resulting in out-of-order round-robin selection, double-assigned providers, or exceeding provider quotas.

To resolve these race conditions and guarantee transactional safety, we implemented the following strategies:

### 1. Row-Level Database Locking (`FOR UPDATE`)
All allocation queries are wrapped in an atomic database transaction (`prisma.$transaction`). Instead of doing standard database reads, we acquire an exclusive row-level lock on the specific service's round-robin index using raw SQL:
```sql
SELECT id, "lastAllocatedProviderIndex" 
FROM "AllocationState" 
WHERE "serviceId" = $1 
FOR UPDATE
```
This forces all concurrent requests targeting the same service to queue up sequentially. The database blocks second-in-line transactions from reading the `lastAllocatedProviderIndex` until the first transaction has completed and committed its updates.

### 2. Lock Ordering to Prevent Deadlocks
During assignments, we update multiple `Provider` rows (to increment their received lead counters). If Transaction A locks Provider X then Provider Y, while Transaction B locks Provider Y then Provider X, a deadlock occurs.
We prevent deadlocks by sorting the selected provider IDs deterministically before executing the update transaction, ensuring locks are always acquired in the exact same numerical sequence:
```typescript
const providerIdsToLock = Array.from(new Set(selectedProviders)).sort((a, b) => a - b);
```

### 3. Connection Pool Optimization
To prevent concurrent requests from overwhelming the database server (especially when using serverless hosting with strict pooler limits), we configured Prisma's underlying PostgreSQL driver (`pg`) connection pool:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,                      // Cap active client connections
  idleTimeoutMillis: 10000,    // Close idle connections quickly
  connectionTimeoutMillis: 10000
});
```
This queues up high-concurrency requests locally within Next.js rather than hitting Supabase/PostgreSQL pooler ceilings, resolving the `EMAXCONNSESSION (max clients reached)` database error during parallel stress testing.

---

## 4. How Webhook Idempotency is Ensured

Payment webhook events (quota resets) must be processed **exactly once**. If a webhook is retried by a provider due to network latency, reprocessing it could lead to incorrect quota states.

We guarantee exactly-once processing using the following design:

### 1. Database-Level Unique Constraint
We define a `WebhookEvent` model in our Prisma schema with a unique constraint on the `idempotencyKey`:
```prisma
model WebhookEvent {
  id             Int      @id @default(autoincrement())
  idempotencyKey String   @unique
  providerId     Int
  processedAt    DateTime @default(now())
}
```

### 2. Atomic Checks in Transaction
When a webhook hits `/api/webhook/quota-reset`, the handler performs these atomic steps inside a transaction:
1.  **Check for Existing Key**: Checks if the `idempotencyKey` has already been recorded in the database.
2.  **Duplicate Return**: If the key exists, it aborts immediately and returns `HTTP 200 OK` (with `{ message: "Duplicate event ignored" }`), preventing double processing.
3.  **Unique Insert & Reset**: If the key is new, it inserts the key and resets the provider's `leadsReceivedThisMonth` to `0`.
4.  **Error Rollback Safeguard**: If two webhook requests manage to pass the initial existence check at the exact same millisecond, the database's unique constraint will trigger a primary key violation on insert. This instantly aborts the transaction, rolls back the quota reset, and returns a graceful duplicate response.

---

## Summary of Tech Stack
*   **Framework**: Next.js 16 (App Router)
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Styling**: Pure CSS (Modern responsive grid & flexbox system, curated CSS variables)
*   **Icons**: Lucide Icons
*   **Theme Management**: `next-themes` (Light mode default)
