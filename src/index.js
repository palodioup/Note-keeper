const addedNotes = document.getElementById("added-notes");
const addNote = document.getElementById("add-note-btn");
const noteInput = document.getElementById("note-input");
const saveNotes = document.getElementById("save-notes-btn");
const clearNotes = document.getElementById("clear-notes-btn");
const clearAllNotes = document.getElementById("clear-all-saved-notes-btn");
const loadNotes = document.getElementById("load-all-notes-btn");

const addNoteFn = (txt) => {
  const note = document.createElement("div");
  const text = noteInput.value;
  if (txt.trim() === "" || txt === " ") {
    alert("Please enter a note.");
    return;
  }
  note.textContent = txt;
  addedNotes.style.backgroundColor = "blue";
  addedNotes.style.border = "white solid 1px";
  addedNotes.appendChild(note);
};

addNote.addEventListener("click", () => {
  addNoteFn(noteInput.value);
  noteInput.value = "";
});

saveNotes.addEventListener("click", () => {
  const notes = addedNotes.querySelectorAll("div");
  const notesArray = Array.from(notes).map((note) => note.textContent);
  localStorage.setItem("notes", JSON.stringify(notesArray));
  alert("Notes saved!");
});

window.addEventListener("load", () => {
  const savedNotes = JSON.parse(localStorage.getItem("notes"));
  if (savedNotes) {
    savedNotes.forEach((note) => addNoteFn(note));
  }
});

clearNotes.addEventListener("click", () => {
  localStorage.removeItem("notes");
  addedNotes.innerHTML = null;
  alert("Notes cleared!");
});

clearAllNotes.addEventListener("click", () => {
  alert(
    "Are you sure you want to clear all notes? This action cannot be undone.",
  );
  localStorage.clear();
  addedNotes.innerHTML = null;
  alert("All notes cleared!");
});

loadNotes.addEventListener("click", () => {
  const savedNotes = JSON.parse(localStorage.getItem("notes"));
  if (savedNotes) {
    addedNotes.innerHTML = null;
    savedNotes.forEach((note) => addNoteFn(note));
    alert("Notes loaded!");
  } else {
    alert("No saved notes found.");
  }
});
