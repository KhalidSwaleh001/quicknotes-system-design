
# QuickNotes REST API Design

## 1. Introduction

QuickNotes is a note-management service that allows registered users to create, view, update, organize, and delete personal notes. The API follows REST principles and exchanges data in JSON format over HTTPS.

The API uses resource-based URLs, standard HTTP methods, appropriate status codes, and authentication to protect user data.



### Content Type

Requests containing JSON should use:

`Content-Type: application/json`

Successful responses containing JSON use:

`Content-Type: application/json`

## 2. Authentication and Authorization

The API requires users to authenticate before accessing their personal notes. A production implementation could use secure session cookies or short-lived access tokens.

For bearer-token authentication, protected requests include:

`Authorization: Bearer <access_token>`

Users may access and modify only their own notes unless they have explicitly granted sharing permissions. The server must verify ownership for every protected resource request.

## 3. REST Endpoint Definitions

| Method | Endpoint | Description | Success status |
|---|---|---|---|
| POST | `/auth/register` | Register a new user account. | 201 Created |
| POST | `/auth/login` | Authenticate a user and establish a session or issue tokens. | 200 OK |
| GET | `/notes` | List the authenticated user's notes, with pagination. | 200 OK |
| POST | `/notes` | Create a new note. | 201 Created |
| GET | `/notes/{noteId}` | Retrieve one note belonging to the authenticated user. | 200 OK |
| PATCH | `/notes/{noteId}` | Update selected fields of an existing note. | 200 OK |
| DELETE | `/notes/{noteId}` | Delete an existing note. | 204 No Content |
| GET | `/tags` | List the authenticated user's tags. | 200 OK |
| POST | `/notes/{noteId}/tags/{tagId}` | Associate an existing tag with a note. | 201 Created |

The `{noteId}` and `{tagId}` values identify individual resources. The server must validate these identifiers and check authorization before returning or modifying data.

## 4. List Notes: GET /notes

### Description

Returns a paginated list of notes owned by the authenticated user. Notes are ordered by their most recent update by default.

### Example Request

```http
GET /v1/notes?limit=10&offset=0 HTTP/1.1
Host: api.quicknotes.example.com
Authorization: Bearer <access_token>
Accept: application/json
```

- `limit` specifies the maximum number of notes returned.
- `offset` specifies how many records to skip.
- The server should enforce a maximum permitted page size.

### Example Response

Status: `200 OK`

```json
{
  "data": [
    {
      "id": 101,
      "userId": 7,
      "title": "Project planning",
      "body": "Complete the system design documentation.",
      "createdAt": "2026-10-17T09:30:00Z",
      "updatedAt": "2026-10-17T09:30:00Z",
      "tags": []
    },
    {
      "id": 102,
      "userId": 7,
      "title": "Study reminder",
      "body": "Review REST API concepts.",
      "createdAt": "2026-10-16T14:00:00Z",
      "updatedAt": "2026-10-16T14:00:00Z",
      "tags": []
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 2
  }
}
```

If the user has no notes, the API returns `200 OK` with an empty `data` array and a total of zero.

## 5. Create a Note: POST /notes

### Description

Creates a new note for the authenticated user. The server obtains the user's identity from the authenticated session or token rather than trusting a client-supplied user ID.

### Example Request

```http
POST /v1/notes HTTP/1.1
Host: api.quicknotes.example.com
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

Request body:

```json
{
  "title": "Project planning",
  "body": "Complete the system design documentation."
}
```

### Validation Rules

- `title` is required and must contain non-whitespace text.
- The title must not exceed 100 characters.
- `body` is optional and may be an empty string.
- The server validates all input even if the client has already validated it.
- The authenticated user's identity determines ownership of the note.

### Example Response

Status: `201 Created`

```json
{
  "data": {
    "id": 103,
    "userId": 7,
    "title": "Project planning",
    "body": "Complete the system design documentation.",
    "createdAt": "2026-10-17T10:00:00Z",
    "updatedAt": "2026-10-17T10:00:00Z",
    "tags": []
  }
}
```

The response should include a `Location` header identifying the newly created resource, for example:

`Location: /v1/notes/103`

## 6. Retrieve a Single Note: GET /notes/{noteId}

### Description

Returns the details of a single note, provided that the note exists and the authenticated user has permission to access it.

### Example Request

```http
GET /v1/notes/103 HTTP/1.1
Host: api.quicknotes.example.com
Authorization: Bearer <access_token>
Accept: application/json
```

### Successful Response

Status: `200 OK`

```json
{
  "data": {
    "id": 103,
    "userId": 7,
    "title": "Project planning",
    "body": "Complete the system design documentation.",
    "createdAt": "2026-10-17T10:00:00Z",
    "updatedAt": "2026-10-17T10:00:00Z",
    "tags": []
  }
}
```

If the note cannot be found, the API returns `404 Not Found`. The service should avoid revealing private resource information to unauthorized users.

## 7. Update a Note: PATCH /notes/{noteId}

### Description

Updates one or more fields of an existing note. Fields omitted from the request remain unchanged.

### Example Request

```http
PATCH /v1/notes/103 HTTP/1.1
Host: api.quicknotes.example.com
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request body:

```json
{
  "title": "Updated project plan"
}
```

### Successful Response

Status: `200 OK`

```json
{
  "data": {
    "id": 103,
    "userId": 7,
    "title": "Updated project plan",
    "body": "Complete the system design documentation.",
    "createdAt": "2026-10-17T10:00:00Z",
    "updatedAt": "2026-10-17T10:15:00Z",
    "tags": []
  }
}
```

The server validates updated fields and verifies that the user is authorized to edit the note.

## 8. Delete a Note: DELETE /notes/{noteId}

### Description

Permanently deletes a note belonging to the authenticated user, including its associations with tags. The implementation must preserve referential integrity.

### Example Request

```http
DELETE /v1/notes/103 HTTP/1.1
Host: api.quicknotes.example.com
Authorization: Bearer <access_token>
```

### Successful Response

Status: `204 No Content`

The server returns no response body when the deletion succeeds.

## 9. Tag Endpoints

### List Tags

`GET /v1/tags`

Returns the authenticated user's tags.

Example response:

```json
{
  "data": [
    {
      "id": 5,
      "name": "University"
    },
    {
      "id": 6,
      "name": "Projects"
    }
  ]
}
```

Success status: `200 OK`.

### Attach a Tag to a Note

`POST /v1/notes/103/tags/6`

Associates an existing tag with a note when the user has permission to access both resources.

Success status: `201 Created`.

Example response:

```json
{
  "data": {
    "noteId": 103,
    "tagId": 6
  }
}
```

The server must prevent duplicate note-tag associations.

 10. Error Status Codes

The API uses standard HTTP status codes to communicate failures.

| Status | Meaning | Example |
|---|---|---|
| 400 Bad Request | The request is malformed or contains invalid input. | A missing title or a title longer than 100 characters. |
| 401 Unauthorized | Authentication is missing or invalid. | An expired or missing access token. |
| 403 Forbidden | The user is authenticated but is not permitted to perform the action. | Attempting to modify another user's note. |
| 404 Not Found | The requested resource does not exist or is not accessible under the API's disclosure policy. | Requesting a nonexistent note. |
| 409 Conflict | The request conflicts with existing data. | Attempting to create a duplicate tag association. |
| 413 Content Too Large | The request exceeds the configured payload limit. | Submitting an excessively large request body. |
| 415 Unsupported Media Type | The request uses an unsupported content type. | Sending an unsupported format instead of JSON. |
| 429 Too Many Requests | The client has exceeded a rate limit. | Sending too many requests in a short period. |
| 500 Internal Server Error | An unexpected server-side error occurred. | An unhandled application failure. |
| 503 Service Unavailable | The service is temporarily unavailable. | A required dependency is unavailable during maintenance. |

### Example Error Response

Status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must not exceed 100 characters."
      }
    ],
    "requestId": "req-example-001"
  }
}
```

Error responses should use a consistent JSON structure. Internal stack traces, passwords, access tokens, and other sensitive information must never be returned to clients.

 11. API Security and Reliability

The production API should implement the following protections:

1.Authentication: Require valid authentication for protected endpoints.
2. Authorization: Enforce note ownership and tag access rules on the server.
3. Input validation: Validate field types, required values, lengths, and request sizes.
4. HTTPS: Encrypt communication between clients and the service.
5. Rate limiting: Restrict excessive requests to protect availability.
6. Parameterized SQL: Use parameterized queries to reduce SQL injection risk.
7. Consistent errors:Return appropriate HTTP statuses and structured error responses.
8. Logging: Record operational events and request IDs without exposing sensitive data.
9. Pagination: Limit the number of records returned by list endpoints.
10. Testing: Test success cases, invalid input, authentication failures, authorization rules, and unavailable dependencies.

 12. Conclusion

The QuickNotes REST API provides a structured interface for authentication, note management, and tagging. Resource-based endpoints and standard HTTP methods make the API predictable for frontend developers. Authentication, authorization, validation, pagination, consistent errors, and database integrity help the backend team build a secure and maintainable service.