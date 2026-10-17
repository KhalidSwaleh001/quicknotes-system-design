
# QuickNotes Data Model

## 1. Introduction

QuickNotes requires a database to store user accounts, notes, tags, and the relationships between notes and tags.

This design uses PostgreSQL, a relational database management system. The database enforces data integrity using primary keys, foreign keys, unique constraints, and validation constraints.

The database contains four main entities:

1. Users
2. Notes
3. Tags
4. Note_Tags

## 2. Entities and Columns

### 2.1 Users

The `users` table stores information about registered QuickNotes users.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| id | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key | Unique user identifier |
| name | VARCHAR(100) | NOT NULL | User's display name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | Secure password hash |
| created_at | TIMESTAMPTZ | NOT NULL, default current time | Account creation timestamp |

Passwords must never be stored as plain text. The application should use a suitable password-hashing algorithm, such as Argon2id, before storing the resulting hash.

### 2.2 Notes

The `notes` table stores notes created by users.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| id | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key | Unique note identifier |
| user_id | BIGINT | NOT NULL, foreign key | Owner of the note |
| title | VARCHAR(100) | NOT NULL | Note title |
| body | TEXT | NOT NULL, default empty string | Note contents |
| created_at | TIMESTAMPTZ | NOT NULL, default current time | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, default current time | Last update timestamp |

Each note belongs to one user. The application must validate that the title contains non-whitespace text.

### 2.3 Tags

The `tags` table stores labels that users can apply to their notes.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| id | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key | Unique tag identifier |
| user_id | BIGINT | NOT NULL, foreign key | User who owns the tag |
| name | VARCHAR(50) | NOT NULL | Tag name |
| created_at | TIMESTAMPTZ | NOT NULL, default current time | Tag creation timestamp |

A user can create tags such as `University`, `Projects`, `Personal`, and `Important`. The same tag name may be used by different users, but duplicate names are prevented for the same user.

### 2.4 Note_Tags

The `note_tags` table connects notes and tags.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| note_id | BIGINT | Primary key component, foreign key | Associated note |
| tag_id | BIGINT | Primary key component, foreign key | Associated tag |
| created_at | TIMESTAMPTZ | NOT NULL, default current time | Time the tag was assigned |

The combination of `note_id` and `tag_id` forms a composite primary key. This prevents the same tag from being attached to the same note more than once.

The database must also ensure that a tag and its note belong to the same user. This is enforced by the composite foreign keys in the schema below.

## 3. Relationships

### 3.1 Users and Notes: One-to-Many

One user can own many notes, but each note belongs to one user.

Relationship:

`users.id → notes.user_id`

For example, a user may have notes titled "Study timetable", "Project ideas", and "Meeting notes".

### 3.2 Users and Tags: One-to-Many

One user can create many tags, but each tag belongs to one user.

Relationship:

`users.id → tags.user_id`

This prevents one user's tags from being treated as another user's private tags.

### 3.3 Notes and Tags: Many-to-Many

One note can have multiple tags, and one tag can be assigned to multiple notes.

The `note_tags` junction table implements this relationship.

Relationship:

`notes.id → note_tags.note_id`

`tags.id → note_tags.tag_id`

For example, the tag `University` can be assigned to several notes, while one note can have both `University` and `Important`.

Composite foreign keys ensure that a user cannot associate another user's tag with their own note.

## 4. Database Schema

The following PostgreSQL statements create all four tables and their constraints.

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_notes_id_user
        UNIQUE (id, user_id),

    CONSTRAINT chk_notes_title
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tags_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_tags_user_id
        UNIQUE (user_id, id),

    CONSTRAINT uq_tags_user_name
        UNIQUE (user_id, name),

    CONSTRAINT chk_tags_name
        CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (note_id, tag_id),

    CONSTRAINT fk_note_tags_note_owner
        FOREIGN KEY (note_id, user_id)
        REFERENCES notes(id, user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_note_tags_tag_owner
        FOREIGN KEY (tag_id, user_id)
        REFERENCES tags(id, user_id)
        ON DELETE CASCADE
);
```

The `user_id` in `note_tags` allows the database to verify that the note and tag belong to the same user. It is intentionally included even though it repeats ownership information, because it enables the composite foreign-key constraints.

The `ON DELETE CASCADE` rules automatically remove dependent notes, tags, and tag associations when their parent records are deleted.

## 5. Indexes

Indexes help the database locate records efficiently without scanning every row.

### 5.1 Index for User Notes

```sql
CREATE INDEX idx_notes_user_updated
ON notes (user_id, updated_at DESC, id DESC);
```

**Reason:** Users frequently request their own notes sorted by most recently updated. This index supports filtering by `user_id` and retrieving notes in that order.

Example query:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = 1
ORDER BY updated_at DESC, id DESC
LIMIT 10;
```

### 5.2 Index for Tag Lookup

```sql
CREATE INDEX idx_note_tags_tag
ON note_tags (tag_id, note_id);
```

**Reason:** The primary key begins with `note_id`, so it efficiently supports lookups by note. This additional index helps queries that find notes associated with a particular tag.

The unique constraints on `users.email` and `(user_id, name)` already create supporting indexes, so separate duplicate indexes are unnecessary.

## 6. Example SQL Queries

The following examples use PostgreSQL syntax.

### Query 1: Retrieve All Notes for a User

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = 1
ORDER BY updated_at DESC, id DESC;
```

**Purpose:** Displays notes belonging to user 1, starting with the most recently updated.

### Query 2: Retrieve a Note with Its Owner

```sql
SELECT
    n.id AS note_id,
    n.title,
    n.body,
    u.name AS owner_name,
    u.email
FROM notes AS n
JOIN users AS u
    ON n.user_id = u.id
WHERE n.id = 10;
```

**Purpose:** Demonstrates an INNER JOIN between notes and users to retrieve a note together with its owner's information.

### Query 3: Find All Tags Assigned to a Note

```sql
SELECT
    t.id AS tag_id,
    t.name AS tag_name
FROM note_tags AS nt
JOIN tags AS t
    ON nt.tag_id = t.id
WHERE nt.note_id = 10
ORDER BY t.name;
```

**Purpose:** Uses a JOIN to list the tags associated with note 10.

### Query 4: Count Notes for Each User

```sql
SELECT
    u.id,
    u.name,
    COUNT(n.id) AS total_notes
FROM users AS u
LEFT JOIN notes AS n
    ON n.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total_notes DESC;
```

**Purpose:** Counts notes belonging to each user. A LEFT JOIN ensures users with no notes still appear with a count of zero.

## 7. SQL vs NoSQL Decision

QuickNotes will use PostgreSQL, a relational SQL database.

The application has clear relationships between users, notes, and tags. Foreign keys and constraints help prevent orphaned records, duplicate associations, and invalid ownership relationships. Transactions allow related operations to be completed reliably, while indexes support efficient queries as the number of users and notes increases.

A document-oriented NoSQL database could provide a flexible schema, but it would require additional application-level work to maintain these relationships and integrity rules. PostgreSQL is therefore the preferred choice for the initial system.

If the service grows to one million users, PostgreSQL can be scaled using connection pooling, indexing, query optimization, caching, read replicas, and appropriate database capacity planning. The architecture should be load-tested before making further scaling decisions.

## 8. Security and Data Integrity

The application must enforce the following rules:

1. Passwords are stored only as secure password hashes.
2. Users can access only their own notes and tags.
3. The server validates input before inserting or updating records.
4. Database operations use parameterized queries.
5. Foreign keys maintain referential integrity.
6. Transactions protect operations that involve multiple related records.
7. Database credentials are stored securely outside source code.
8. Sensitive user information is not unnecessarily exposed through API responses.

## 9. Conclusion

The QuickNotes data model uses four related tables to organize users, notes, tags, and note-tag associations. Primary keys identify records, foreign keys enforce relationships, and composite constraints prevent notes from being associated with tags owned by other users.

PostgreSQL provides a reliable foundation for the application through structured data, transactions, constraints, and indexes. Combined with suitable application security and scaling techniques, this model can support the initial service and future growth.