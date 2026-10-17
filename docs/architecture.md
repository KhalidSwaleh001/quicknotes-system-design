
# QuickNotes System Architecture

## 1. Introduction

QuickNotes is a note-management service that allows users to create, retrieve, update, delete, and organize notes using a REST API.

The initial project demonstrates API communication through a browser-based client and JSONPlaceholder. The production architecture described here represents the real online service that the backend team would build to support one million registered users.

The proposed architecture uses a horizontally scalable application tier, caching, a relational database with a read replica, object-independent note storage, and asynchronous background processing.

## 2. Functional Requirements

The system must:

1. Allow users to register and authenticate securely.
2. Allow authenticated users to create notes with a required title and optional body.
3. Allow users to list their notes with pagination.
4. Allow users to retrieve, update, and delete individual notes.
5. Allow users to create tags and associate tags with notes.
6. Ensure that users can access only notes and tags they are authorized to use.
7. Validate user input and return appropriate HTTP status codes.
8. Display loading, success, error, and empty states in the client.
9. Process background tasks, such as notifications or other deferred operations, through a queue and worker.
10. Maintain reliable records and protect user data.

## 3. Non-Functional Requirements

### Performance

- Frequently accessed notes should be returned with low latency.
- The service should handle normal and peak request rates.
- Caching and database indexing should reduce unnecessary database queries.

### Scalability

- The application tier should support horizontal scaling by adding app server instances.
- The database, cache, and queue should be monitored and scaled according to measured workload.
- CDN caching should be used for suitable static assets.

### Availability and Reliability

- Application instances should run across multiple failure domains where possible.
- Failed background jobs should be retried safely.
- Database backups and tested recovery procedures should be maintained.
- Critical dependencies should support failover where practical.

### Security

- HTTPS must protect communication.
- Authentication and authorization must be enforced on the server.
- Passwords must be stored as secure password hashes.
- Input must be validated, and SQL queries must be parameterized.
- Secrets and database credentials must not be committed to source control.

### Maintainability and Observability

- The application should use clear API contracts and modular code.
- Centralized logs, metrics, alerts, and request IDs should support troubleshooting.
- Automated tests and deployment checks should reduce regressions.

### Data Integrity

- Database transactions and constraints should protect related records.
- Cache entries must be invalidated or updated when relevant data changes.
- Database restoration procedures should be tested regularly.

## 4. Load Estimates for One Million Users

### 4.1 Assumptions

The following estimates are planning assumptions rather than measured production traffic.

- Registered users: 1,000,000
- Daily active users: 10% of registered users
- Average notes created per active user per day: 2
- Average note reads per active user per day: 20
- Average stored note data, including estimated metadata: 2 KB per note
- Days per year: 365
- Peak traffic: 5 times average traffic
- Each created note remains stored throughout the year.
- The storage estimate excludes replicas, backups, indexes, logs, tags, and other overhead.

### 4.2 Daily Active Users

Daily active users:

1,000,000 × 10% = **100,000 users per day**

### 4.3 Read Requests per Second

Daily reads:

100,000 × 20 = 2,000,000 reads per day

Average reads per second:

2,000,000 ÷ 86,400 = **23.15 reads per second**

Estimated peak reads per second:

23.15 × 5 = **115.74 reads per second**

The architecture should plan for approximately 116 reads per second under this assumed peak workload.

### 4.4 Write Requests per Second

Daily writes:

100,000 × 2 = 200,000 note creations per day

Average writes per second:

200,000 ÷ 86,400 = **2.31 writes per second**

Estimated peak writes per second:

2.31 × 5 = **11.57 writes per second**

This estimate counts note creation requests only. Updates, deletions, authentication, tag operations, and background-job writes would add to the total database workload.

### 4.5 Annual Storage Estimate

Daily note storage:

200,000 × 2 KB = 400,000 KB = 400 MB per day

Annual note storage:

400 MB × 365 = **146,000 MB, or approximately 146 GB per year**

The estimate assumes decimal units, with 1 GB equal to 1,000 MB.

This is an estimate of new note data added in one year, not the total storage of all application data. Real storage requirements will be higher after accounting for indexes, tags, database overhead, backups, replication, logs, and growth in note updates.

### 4.6 Summary

| Metric | Average estimate | Peak estimate |
|---|---:|---:|
| Read requests per second | 23.15 | 115.74 |
| Note-creation writes per second | 2.31 | 11.57 |

Estimated annual new note storage: **146 GB**, before overhead.

These figures must be validated against real usage metrics and load testing before deployment.

## 5. Proposed Architecture Diagram

```text
                         +----------------------+
                         |        CLIENT        |
                         | Browser / Web App    |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         DNS          |
                         | Domain name lookup   |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         CDN          |
                         | Cache static assets  |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |    LOAD BALANCER     |
                         | Health checks /      |
                         | Request distribution |
                         +----------+-----------+
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
             +-------------+ +-------------+ +-------------+
             | App Server 1| | App Server 2| | App Server N|
             | Node/Express| | Node/Express| | Node/Express|
             +------+------+ +------+------+ +------+------+
                    |               |               |
                    +---------------+---------------+
                                    |
                   +----------------+----------------+
                   |                |                |
                   v                v                v
             +-----------+   +-------------+   +-------------+
             |   CACHE   |   |   PRIMARY   |   |    QUEUE    |
             |   Redis   |   |  PostgreSQL |   | Background  |
             +-----------+   +------+------+   |    jobs     |
                                    |          +------+------+
                                    |                 |
                                    v                 v
                             +-------------+   +-------------+
                             | READ REPLICA|   |   WORKER    |
                             | PostgreSQL  |   | Job handler |
                             +-------------+   +-------------+
```

The CDN primarily caches static assets such as CSS, JavaScript, and images. Personalized notes should not be publicly cached; any private caching must enforce user isolation and appropriate cache-control policies.

The primary database is the authoritative source of data. The read replica serves suitable read queries, subject to replication lag.

## 6. Component Explanations

### 6.1 Client

The browser-based client provides the user interface for managing notes and communicates with the backend through HTTPS requests. It displays loading, success, error, and empty states to keep users informed.

### 6.2 DNS

DNS translates the application's domain name into the appropriate service endpoint, allowing clients to reach the application without knowing its underlying IP addresses.

### 6.3 CDN

The Content Delivery Network serves cached static assets from locations closer to users, reducing latency and the amount of traffic reaching the application infrastructure.

### 6.4 Load Balancer

The load balancer distributes incoming requests across healthy app servers and performs health checks to avoid sending traffic to unavailable instances.

### 6.5 App Servers

Multiple Node.js and Express app servers handle authentication, validation, authorization, business logic, and API requests, allowing the application tier to scale horizontally.

### 6.6 Redis Cache

Redis stores suitable frequently accessed data, such as selected feed results or metadata, reducing repeated database reads and improving response times.

Cache entries must be invalidated or refreshed after relevant writes to avoid serving stale data. Private data must never be shared between users through incorrectly scoped cache keys.

### 6.7 Primary PostgreSQL Database

The primary PostgreSQL database stores authoritative users, notes, tags, and relationships. It handles writes and maintains data integrity through transactions, primary keys, foreign keys, and constraints.

### 6.8 PostgreSQL Read Replica

The read replica handles suitable read-heavy queries, reducing the workload on the primary database. Queries that require immediate read-after-write consistency can be routed to the primary database.

### 6.9 Queue

The queue stores background jobs so that the application can return responses without waiting for every deferred task to finish. Example jobs include notifications, audit-event processing, and other non-critical asynchronous work.

### 6.10 Worker

The worker consumes queued jobs and processes them outside the main request-response path. It should support retries, idempotency, monitoring, and a dead-letter mechanism for jobs that repeatedly fail.

For this notes application, the queue and worker are useful for asynchronous tasks, but ordinary note creation does not need to be queued if the database write can be completed directly and reliably.

## 7. GET /notes Request Flow

The following sequence describes how the service retrieves a user's notes.

1. The user opens the QuickNotes client and requests their notes.
2. DNS resolves the service domain to the appropriate endpoint.
3. The request reaches the load balancer, which forwards it to a healthy app server.
4. The app server validates the user's authentication and authorization.
5. The server checks Redis for a suitable cached result using a cache key scoped to the user and query parameters.
6. If a valid cache entry exists, the server returns the result after verifying that the cached data is safe and appropriate to use.
7. If the cache misses, the server executes a parameterized query against the read replica when eventual consistency is acceptable.
8. If immediate read-after-write consistency is required, the server queries the primary database instead.
9. The server returns a paginated JSON response with the notes and pagination metadata.
10. The application may cache the result using a suitable expiration policy and returns the response to the client.
11. The client renders the notes and displays a success or empty-state message.

The server must never rely on client-supplied user IDs alone to determine ownership. Authorization must be enforced on every request.

## 8. POST /notes Request Flow

The following sequence describes creating a note.

1. The user enters a title and optional body in the client.
2. The client performs basic validation, including checking that the title is present and does not exceed 100 characters.
3. The client sends a `POST /v1/notes` request with a JSON body and valid authentication credentials.
4. The load balancer forwards the request to a healthy app server.
5. The app server authenticates the user and validates the request body again.
6. The server obtains the user's identity from the authenticated session or token rather than trusting a user ID in the request.
7. The server inserts the new note into the primary PostgreSQL database using a parameterized query and a transaction where needed.
8. After the database confirms the insert, the server invalidates or updates relevant cached note lists and metadata.
9. If an asynchronous task is required, the application publishes a job to the queue using a reliable publishing strategy.
10. The server returns `201 Created`, the created note, and a `Location` header identifying the new resource.
11. The client adds the returned note to its visible list and displays a success message.

The server should return success only after the note has been durably committed to the database. If an optional background task fails, the system should retry it without incorrectly creating duplicate notes.

## 9. Architecture Trade-Offs

### Trade-Off 1: Cache Performance vs. Data Freshness

Caching reduces database load and improves response time, but cached notes may become stale after an update or deletion.

**Mitigation:** Invalidate or refresh relevant cache entries after successful writes, use suitable expiration times, and scope cache keys by user and query parameters. For operations requiring immediate consistency, query the primary database.

### Trade-Off 2: Read Replicas vs. Strong Read-After-Write Consistency

Read replicas improve read scalability, but replication lag can cause newly created or updated notes to be temporarily missing from replica queries.

**Mitigation:** Route read-after-write requests to the primary database when needed. Monitor replication lag and send suitable reads to the primary if the replica is too far behind.

### Trade-Off 3: Asynchronous Jobs vs. Immediate Completion

Queues and workers allow deferred tasks to run independently of user-facing requests, but processing may be delayed or fail temporarily.

**Mitigation:** Use bounded retries, idempotent job handlers, dead-letter queues, monitoring, and alerts. Keep critical database writes synchronous and durable.

### Trade-Off 4: Horizontal Scaling vs. Operational Complexity

Adding app servers increases capacity, but requires health checks, monitoring, configuration management, and reliable deployment procedures.

**Mitigation:** Keep app servers stateless where practical, centralize shared session and cache data, use automated deployments, and scale based on measured traffic and resource usage.

## 10. Avoiding Single Points of Failure

A single point of failure is a component whose failure can make the entire service unavailable.

The design reduces these risks through the following measures:

1. **App servers:** Run at least two instances and distribute them across separate failure domains where possible.
2. **Load balancer:** Use a managed or redundant load-balancing service with health checks and failover.
3. **Database:** Configure backups, recovery procedures, and a tested promotion process for a standby or read replica where appropriate. A read replica alone is not automatically a complete high-availability solution.
4. **Cache:** Use a supported Redis high-availability configuration when the cache is operationally critical. The application should handle cache failure gracefully and fall back to the database where safe.
5. **Queue:** Use a durable, highly available queue with persistent messages and retry handling when background-job delivery is important.
6. **Workers:** Run multiple workers so that one worker failure does not stop all background processing.
7. **DNS and CDN:** Use reliable managed services, suitable health checks, and appropriate DNS and caching configurations.
8. **Backups and disaster recovery:** Maintain protected backups and regularly test restoration rather than assuming backups will always work.

High availability adds cost and operational complexity. The production team should choose the appropriate redundancy level based on service-level objectives, recovery time objectives, recovery point objectives, and budget.

## 11. Monitoring and Operational Practices

The production service should monitor:

- API response times and error rates.
- Request rates and database query latency.
- App server CPU and memory usage.
- Cache hit rate and cache failures.
- Database connections, disk usage, and replication lag.
- Queue depth, processing latency, retry counts, and failed jobs.
- Authentication failures and suspicious request patterns.
- Backup completion and restoration test results.

Alerts should notify the team when important thresholds are exceeded. Logs should include request IDs to help trace failures across the application.

## 12. Conclusion

The proposed QuickNotes architecture combines a scalable client-facing application tier with caching, a primary PostgreSQL database, a read replica, and asynchronous workers.

Under the stated assumptions, one million registered users produce approximately 23 average note reads per second and 2 average note creations per second, with peak estimates of about 116 reads and 12 writes per second. Annual new note storage is estimated at 146 GB before database overhead, replicas, and backups.

These estimates provide an initial planning baseline rather than a guarantee of production capacity. Load testing, observability, tested recovery procedures, secure authorization, and appropriate failover configurations will be essential before the service is released to one million users.