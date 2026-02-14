const addedNotes = document.getElementById("added-notes");
const addNote = document.getElementById("add-note-btn");
const noteInput = document.getElementById("note-input");
const saveNotes = document.getElementById("save-notes-btn");
const clearNotes = document.getElementById("clear-notes-btn");
const clearAllNotes = document.getElementById("clear-all-saved-notes-btn");
const loadNotes = document.getElementById("load-all-notes-btn");
const savedCountEl = document.getElementById("saved-count");
const addedCountEl = document.getElementById("added-count");
const liveIndicator = document.getElementById("live-indicator");

// Add pulse animation to count badge
const pulseCount = (el) => {
  if (el) {
    el.classList.add("count-pulse");
    setTimeout(() => el.classList.remove("count-pulse"), 600);
  }
};

const addNoteFn = (txt) => {
  const note = document.createElement("div");
  note.className = "note-item";
  if (typeof txt !== "string" || txt.trim() === "") {
    alert("Please enter a note.");
    return;
  }
  note.textContent = txt;
  addedNotes.appendChild(note);
  refreshAddedCount();
};

addNote.addEventListener("click", () => {
  addNoteFn(noteInput.value);
  noteInput.value = "";
});

saveNotes.addEventListener("click", () => {
  const notes = addedNotes.querySelectorAll("div");
  const notesArray = Array.from(notes).map((note) => note.textContent);
  
  if (notesArray.length === 0) {
    alert("No notes to save!");
    return;
  }

  // try saving to remote server first; fall back to localStorage
  (async () => {
    // First, fetch current global saved notes from server
    let globalNotes = [];
    try {
      const res = await fetch("/api/notes");
      if (res.ok) globalNotes = await res.json();
    } catch (e) {}

    // Append new notes to global notes
    const allNotes = [...globalNotes, ...notesArray];

    const body = await saveToServer(allNotes);
    if (body) {
      alert("Notes saved to server!");
      if (savedCountEl && typeof body.saved === "number") {
        savedCountEl.textContent = body.saved;
        pulseCount(savedCountEl);
      }
      // Track what this browser saved (for load/clear buttons)
      const previouslySaved = JSON.parse(
        localStorage.getItem("saved-to-server") || "[]"
      );
      const allSavedByThisBrowser = [...previouslySaved, ...notesArray];
      localStorage.setItem(
        "saved-to-server",
        JSON.stringify(allSavedByThisBrowser),
      );
      // Keep notes visible - don't clear them
      noteInput.value = "";
    } else {
      alert("Notes saved locally (server unavailable).");
      localStorage.setItem("pending-notes", JSON.stringify(notesArray));
      noteInput.value = "";
    }
  })();
});

window.addEventListener("load", () => {
  // On load, fetch the global saved count from server and clear the locally added section
  addedNotes.innerHTML = "";
  fetchGlobalSavedCount();
  refreshAddedCount();
});

clearNotes.addEventListener("click", () => {
  // Clear only the locally added notes section
  addedNotes.innerHTML = "";
  alert("Notes cleared!");
  refreshAddedCount();
});

clearAllNotes.addEventListener("click", () => {
  if (
    !confirm(
      "Are you sure you want to clear all notes saved in THIS browser? This only affects your browser, not the global server.",
    )
  )
    return;
  // Clear locally saved notes for this browser
  localStorage.removeItem("saved-to-server");
  addedNotes.innerHTML = "";
  alert("All notes cleared from this browser!");
  refreshAddedCount();
});

loadNotes.addEventListener("click", () => {
  // Load notes previously saved in THIS browser from localStorage
  const savedInThisBrowser = JSON.parse(
    localStorage.getItem("saved-to-server") || "[]"
  );
  if (Array.isArray(savedInThisBrowser) && savedInThisBrowser.length) {
    addedNotes.innerHTML = "";
    savedInThisBrowser.forEach((n) => addNoteFn(n));
    alert(
      `Loaded ${savedInThisBrowser.length} notes that were previously saved in this browser!`,
    );
    refreshAddedCount();
  } else {
    alert(
      "No notes previously saved in this browser. Add some notes and save them first!",
    );
  }
});

// attempt to save notes to server; return true if saved remotely
async function saveToServer(notesArray) {
  try {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesArray }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body;
  } catch (e) {
    return null;
  }
}

// poll remote counts to keep multiple browsers in sync
function startCountPolling() {
  setInterval(() => {
    fetch("/api/counts")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((obj) => {
        if (savedCountEl && typeof obj.saved === "number") {
          savedCountEl.textContent = obj.saved;
          pulseCount(savedCountEl);
        }
      })
      .catch(() => {});
  }, 4000);
}

// start polling but don't break if server absent
// setup Socket.IO real-time updates if available
try {
  const socket = io();

  socket.on("connect", () => {
    if (liveIndicator) {
      liveIndicator.style.opacity = "1";
      liveIndicator.title = "Connected to server";
    }
  });

  socket.on("disconnect", () => {
    if (liveIndicator) {
      liveIndicator.style.opacity = "0.4";
      liveIndicator.title = "Disconnected - using local storage";
    }
  });

  socket.on("counts", (obj) => {
    if (savedCountEl && typeof obj.saved === "number") {
      const currentCount = savedCountEl.textContent;
      savedCountEl.textContent = obj.saved;
      if (currentCount !== obj.saved.toString()) {
        pulseCount(savedCountEl);
      }
    }
  });
} catch (e) {
  // fallback to polling if socket.io is not available
  if (liveIndicator) {
    liveIndicator.style.opacity = "0.4";
    liveIndicator.title = "Server unavailable - polling for updates";
  }
  startCountPolling();
}

// Fetch the global saved count from server
async function fetchGlobalSavedCount() {
  try {
    const res = await fetch("/api/counts");
    if (res.ok) {
      const obj = await res.json();
      if (savedCountEl && typeof obj.saved === "number") {
        savedCountEl.textContent = obj.saved;
      }
    }
  } catch (e) {
    // Server unavailable, keep current count
  }
}

function refreshAddedCount() {
  try {
    const nodes = addedNotes ? addedNotes.querySelectorAll("div") : [];
    const newCount = nodes.length;
    if (addedCountEl) {
      const oldCount = parseInt(addedCountEl.textContent);
      addedCountEl.textContent = newCount;
      if (oldCount !== newCount) {
        pulseCount(addedCountEl);
      }
    }
  } catch (e) {
    if (addedCountEl) addedCountEl.textContent = 0;
  }
}
