# QuickNotes System Design

QuickNotes is a lightweight note-taking application that demonstrates REST API operations and the system design principles needed to build a scalable note-management platform.

The project includes a browser-based API client, API documentation, a relational database design, and a scalable system architecture for supporting up to one million registered users.

## Features

* Retrieve and display notes from a REST API.
* Create notes using a form with input validation.
* Delete notes with user confirmation.
* Display loading, success, error, and empty states.
* Disable buttons while requests are processing.
* Handle HTTP errors using `async/await`, `try/catch`, and `finally`.
* Document REST API endpoints and error responses.
* Design a PostgreSQL data model with relationships, constraints, and indexes.
* Propose a scalable architecture with caching, load balancing, read replicas, queues, and workers.

## Technologies Used

* HTML5
* CSS3
* JavaScript (Fetch API and async/await)
* JSONPlaceholder REST API
* PostgreSQL
* Git and GitHub

## Project Structure

```text
quicknotes-system-design/
├── index.html
├── style.css
├── api.js
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## How to Run the Application

### Requirements

* A modern web browser.
* Internet access to reach JSONPlaceholder.
* Visual Studio Code (optional, but recommended).

### Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/KhalidSwaleh001/quicknotes-system-design.git
   ```

2. Open the project folder:

   ```bash
   cd quicknotes-system-design
   ```

3. Open the folder in Visual Studio Code:

   ```bash
   code .
   ```

4. Open `index.html` directly in your browser, or use the Live Server extension in VS Code.

5. Click **Load Notes** to retrieve sample notes. Use the form to create a note and the Delete button to remove a displayed note.

No backend server or database installation is required to run the browser demonstration.

## API Used

The application uses JSONPlaceholder:

`https://jsonplaceholder.typicode.com/posts`

The client demonstrates:

* `GET /posts?_limit=10` — retrieve sample notes.
* `POST /posts` — simulate creating a note.
* `DELETE /posts/{id}` — simulate deleting a note.

**Important:** JSONPlaceholder is a demonstration API. It simulates create and delete operations but does not permanently save those changes. The PostgreSQL schema and additional endpoints in the documentation describe a proposed production system, not a backend currently implemented in this repository.

## Documentation

* [API Design](docs/api-design.md)
* [Database Data Model](docs/data-model.md)
* [System Architecture](docs/architecture.md)

## What I Learned

1. How to consume REST APIs using JavaScript's Fetch API and handle asynchronous requests.
2. How to validate user input and provide clear loading, success, error, and empty states.
3. How to design REST API endpoints, HTTP status codes, and consistent error responses.
4. How to model relational data in PostgreSQL using primary keys, foreign keys, constraints, and indexes.
5. How to estimate application traffic and storage requirements for a system with one million registered users.
6. How caching, load balancing, read replicas, message queues, and background workers support scalability and reliability.
7. Why database backups, monitoring, security controls, and redundancy matter in production systems.

## Project Status

The browser-based API client and system design documentation are intended as a learning project. A production-ready implementation would require a backend API, PostgreSQL integration, authentication, authorization, and deployment infrastructure.
