
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];

// Reusable helper for GET, POST, and DELETE requests.
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    // DELETE may return an empty response body.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const text = await response.text();

    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("The server returned an invalid response.");
        }
    }

    return { data, status: response.status };
}

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status";

    if (type) {
        statusMessage.classList.add(type);
    }
}

function setButtonsDisabled(disabled) {
    loadButton.disabled = disabled;
    submitButton.disabled = disabled;

    document.querySelectorAll(".delete-btn").forEach((button) => {
        button.disabled = disabled;
    });
}

function renderNotes() {
    // Remove existing note elements before rendering the current collection.
    notesList.replaceChildren();

    if (notes.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-state";
        emptyItem.textContent = "No notes to display. Load notes or create your first note.";
        notesList.appendChild(emptyItem);
        return;
    }

    notes.forEach((note) => {
        const item = document.createElement("li");
        item.className = "note-card";

        const heading = document.createElement("h3");
        heading.textContent = note.title || "Untitled note";

        const body = document.createElement("p");
        body.textContent = note.body || "No details provided.";

        const footer = document.createElement("div");
        footer.className = "note-footer";

        const idLabel = document.createElement("span");
        idLabel.className = "note-id";
        idLabel.textContent = `Note ID: ${note.id}`;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete note ${note.id}`);
        deleteButton.addEventListener("click", () => deleteNote(note.id));

        footer.append(idLabel, deleteButton);
        item.append(heading, body, footer);
        notesList.appendChild(item);
    });
}

// Task 1: GET the first 10 notes.
async function loadNotes() {
    loadButton.disabled = true;
    setStatus("Loading notes...", "loading");

    try {
        const result = await request(`${API_URL}?_limit=10`);
        notes = Array.isArray(result.data) ? result.data : [];

        renderNotes();

        if (notes.length === 0) {
            setStatus("No notes were found.", "success");
        } else {
            setStatus(`Loaded ${notes.length} notes from the server.`, "success");
        }
    } catch (error) {
        setStatus(`Unable to load notes. ${error.message}`, "error");
    } finally {
        loadButton.disabled = false;
    }
}

// Task 2: POST a new note.
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        setStatus("Please enter a note title.", "error");
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        setStatus("The title must not exceed 100 characters.", "error");
        titleInput.focus();
        return;
    }

    setButtonsDisabled(true);
    setStatus("Creating note...", "loading");

    try {
        const result = await request(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                body,
                userId: 1
            })
        });

        if (!result.data || result.data.id === undefined) {
            throw new Error("The server did not return a valid note.");
        }

        // JSONPlaceholder simulates POST; created notes are not persisted.
        // Keep the returned note in local page state so the demo remains usable.
        notes = notes.filter((note) => note.id !== result.data.id);
        notes.unshift(result.data);

        renderNotes();
        noteForm.reset();

        setStatus(
            `Note created (status ${result.status}, id ${result.data.id}).`,
            "success"
        );
    } catch (error) {
        setStatus(`Unable to create note. ${error.message}`, "error");
    } finally {
        setButtonsDisabled(false);
    }
}

// Task 3: DELETE a note.
async function deleteNote(id) {
    const confirmed = window.confirm(`Delete note ${id}?`);

    if (!confirmed) {
        return;
    }

    setButtonsDisabled(true);
    setStatus("Deleting note...", "loading");

    try {
        const result = await request(`${API_URL}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        // JSONPlaceholder simulates deletion without permanently changing
        // its stored collection, so update the visible list locally.
        notes = notes.filter((note) => String(note.id) !== String(id));
        renderNotes();

        setStatus(
            `Note ${id} deleted successfully (status ${result.status}).`,
            "success"
        );
    } catch (error) {
        setStatus(`Unable to delete note. ${error.message}`, "error");
    } finally {
        setButtonsDisabled(false);
    }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

// Show a helpful empty state when the page first opens.
renderNotes();