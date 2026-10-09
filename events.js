import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// 1. CONFIGURATION
const APPROVED_ORGANIZER_EMAILS = [
  "nayankeshav29@gmail.com"
].map(email => email.toLowerCase());


// 2. HTML ELEMENTS

const createEventCard = document.getElementById("createEventCard");
const createEventForm = document.getElementById("createEventForm");
const createEventButton = document.getElementById("createEventButton");
const eventFormMessage = document.getElementById("eventFormMessage");

const eventsList = document.getElementById("eventsList");
const eventsMessage = document.getElementById("eventsMessage");
const refreshEventsButton = document.getElementById("refreshEventsButton");

const myRegistrationsList = document.getElementById("myRegistrationsList");
const registrationsMessage = document.getElementById("registrationsMessage");
const refreshRegistrationsButton = document.getElementById(
  "refreshRegistrationsButton"
);

let currentUser = null;


// 3. HELPER FUNCTIONS

function isOrganizer(user) {
  return Boolean(
    user &&
    user.emailVerified &&
    user.email &&
    APPROVED_ORGANIZER_EMAILS.includes(user.email.toLowerCase())
  );
}


function formatDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Date unavailable";
  }

  return timestamp.toDate().toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


function addTextElement(parent, tag, text, className = "") {
  const element = document.createElement(tag);

  element.textContent = text;

  if (className) {
    element.className = className;
  }

  parent.appendChild(element);

  return element;
}


function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}


// 4. LOAD AND DISPLAY EVENTS

async function loadEvents() {
  if (!currentUser) return;

  eventsList.replaceChildren();
  eventsMessage.textContent = "Loading events...";
  refreshEventsButton.disabled = true;

  try {
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("startAt", "asc")
    );

    const snapshot = await getDocs(eventsQuery);

    const now = Date.now();

    const upcomingEvents = snapshot.docs.filter(eventDoc => {
      const event = eventDoc.data();

      return (
        event.status === "published" &&
        event.startAt &&
        event.startAt.toMillis() >= now
      );
    });

    if (upcomingEvents.length === 0) {
      eventsMessage.textContent = "No upcoming events yet.";
      return;
    }

    eventsMessage.textContent = "";

    for (const eventDoc of upcomingEvents) {
      const event = eventDoc.data();
      const eventId = eventDoc.id;

      const card = document.createElement("article");
      card.className = "event-card";

      addTextElement(
        card,
        "span",
        "Upcoming",
        "event-status"
      );

      addTextElement(
        card,
        "h3",
        event.title || "Untitled event"
      );

      addTextElement(
        card,
        "p",
        event.description || "No description provided."
      );

      addTextElement(
        card,
        "p",
        `📍 ${event.venue || "Venue not specified"}`,
        "event-meta"
      );

      addTextElement(
        card,
        "p",
        `🗓️ ${formatDate(event.startAt)}`,
        "event-meta"
      );

      addTextElement(
        card,
        "p",
        `Registration closes: ${formatDate(event.registrationDeadline)}`,
        "event-meta"
      );

      addTextElement(
        card,
        "p",
        `Maximum participants: ${event.capacity ?? "Not specified"}`,
        "event-meta"
      );


      // EXTERNAL REGISTRATION

      if (event.registrationUrl) {
        if (isValidHttpUrl(event.registrationUrl)) {
          const link = document.createElement("a");

          link.href = event.registrationUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.className = "event-register-button";
          link.textContent = "Register externally ↗";

          card.appendChild(link);

          addTextElement(
            card,
            "p",
            "Registration takes place on an external website.",
            "event-meta"
          );
        } else {
          addTextElement(
            card,
            "p",
            "The external registration link is invalid.",
            "event-meta"
          );
        }

        eventsList.appendChild(card);
        continue;
      }


      // INTERNAL REGISTRATION

      const button = document.createElement("button");

      button.type = "button";
      button.className = "event-register-button";
      button.textContent = "Checking registration...";
      button.disabled = true;

      card.appendChild(button);
      eventsList.appendChild(card);

      const registrationRef = doc(
        db,
        "events",
        eventId,
        "registrations",
        currentUser.uid
      );

      try {
        const registrationSnapshot = await getDoc(registrationRef);

        button.dataset.registered = registrationSnapshot.exists()
          ? "true"
          : "false";

        button.textContent = registrationSnapshot.exists()
          ? "Cancel registration"
          : "Register on Mattelab";

        button.disabled = false;
      } catch (error) {
        console.error("Could not check registration:", error);

        button.textContent = "Registration unavailable";
        button.disabled = true;
        continue;
      }


      // REGISTER OR CANCEL

      button.addEventListener("click", async () => {
        if (!currentUser) {
          alert("Please sign in to register.");
          return;
        }

        button.disabled = true;

        try {
          // Read the latest registration state.
          const registrationSnapshot = await getDoc(registrationRef);

          if (registrationSnapshot.exists()) {
            const confirmed = window.confirm(
              `Cancel your registration for "${event.title}"?`
            );

            if (!confirmed) {
              return;
            }

            await deleteDoc(registrationRef);

            button.dataset.registered = "false";
            button.textContent = "Register on Mattelab";

            await loadMyRegistrations();

            return;
          }


          // Check the latest event information before registering.
          const latestEventSnapshot = await getDoc(
            doc(db, "events", eventId)
          );

          if (!latestEventSnapshot.exists()) {
            alert("This event is no longer available.");
            return;
          }

          const latestEvent = latestEventSnapshot.data();

          if (latestEvent.status !== "published") {
            alert("This event is no longer open.");
            return;
          }

          if (
            !latestEvent.startAt ||
            latestEvent.startAt.toMillis() <= Date.now()
          ) {
            alert("This event has already started.");
            return;
          }

          if (
            !latestEvent.registrationDeadline ||
            latestEvent.registrationDeadline.toMillis() <= Date.now()
          ) {
            alert("Registration for this event has closed.");
            return;
          }

          if (latestEvent.registrationUrl) {
            alert("This event uses external registration.");
            return;
          }


          // Create the registration.
          // The document ID is the student's UID, so there can
          // be only one registration document per student/event.

          await setDoc(registrationRef, {
            userId: currentUser.uid,
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            registeredAt: serverTimestamp(),
            checkedIn: false
          });

          button.dataset.registered = "true";
          button.textContent = "Cancel registration";

          await loadMyRegistrations();

          alert("You have successfully registered!");
        } catch (error) {
          console.error("Registration action failed:", error);

          alert(
            "Could not update your registration. " +
            "Check your Firestore security rules and try again."
          );
        } finally {
          button.disabled = false;
        }
      });
    }
  } catch (error) {
    console.error("Could not load events:", error);

    eventsMessage.textContent =
      "Could not load events. Check your Firestore security rules and browser console.";
  } finally {
    refreshEventsButton.disabled = false;
  }
}


// 5. CREATE AN EVENT

createEventForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || !isOrganizer(currentUser)) {
    eventFormMessage.textContent =
      "Your Google account is not approved to create events.";

    return;
  }

  const title = document.getElementById("eventTitle").value.trim();

  const description = document
    .getElementById("eventDescription")
    .value.trim();

  const venue = document.getElementById("eventVenue").value.trim();

  const startValue = document.getElementById("eventStart").value;

  const deadlineValue = document.getElementById("eventDeadline").value;

  const capacity = Number(
    document.getElementById("eventCapacity").value
  );

  const registrationUrl = document
    .getElementById("eventRegistrationUrl")
    .value.trim();


  // VALIDATE FORM

  if (
    !title ||
    !description ||
    !venue ||
    !startValue ||
    !deadlineValue
  ) {
    eventFormMessage.textContent =
      "Please complete all required fields.";

    return;
  }

  const startDate = new Date(startValue);
  const deadlineDate = new Date(deadlineValue);

  if (
    !Number.isFinite(startDate.getTime()) ||
    !Number.isFinite(deadlineDate.getTime())
  ) {
    eventFormMessage.textContent =
      "Please enter valid dates and times.";

    return;
  }

  const now = Date.now();

  if (startDate.getTime() <= now) {
    eventFormMessage.textContent =
      "Choose a future event date and time.";

    return;
  }

  if (
    deadlineDate.getTime() <= now ||
    deadlineDate.getTime() > startDate.getTime()
  ) {
    eventFormMessage.textContent =
      "The registration deadline must be in the future and no later than the event start.";

    return;
  }

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    eventFormMessage.textContent =
      "Maximum participants must be between 1 and 500.";

    return;
  }

  if (
    registrationUrl &&
    !isValidHttpUrl(registrationUrl)
  ) {
    eventFormMessage.textContent =
      "Enter a valid external registration URL starting with http:// or https://.";

    return;
  }


  // SAVE EVENT TO FIRESTORE

  createEventButton.disabled = true;
  eventFormMessage.textContent = "Creating event...";

  try {
    await addDoc(collection(db, "events"), {
      title,
      description,
      venue,
      startAt: Timestamp.fromDate(startDate),
      registrationDeadline: Timestamp.fromDate(deadlineDate),
      capacity,
      registrationUrl: registrationUrl || null,
      status: "published",
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });

    createEventForm.reset();

    eventFormMessage.textContent =
      "Event created successfully!";

    await loadEvents();
  } catch (error) {
    console.error("Event creation failed:", error);

    eventFormMessage.textContent =
      "Could not create the event. Check your organizer email and Firestore security rules.";
  } finally {
    createEventButton.disabled = false;
  }
});


// 6. LOAD MY REGISTRATIONS

async function loadMyRegistrations() {
  if (!currentUser) return;

  myRegistrationsList.replaceChildren();

  registrationsMessage.textContent =
    "Loading your registrations...";

  refreshRegistrationsButton.disabled = true;

  try {
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("startAt", "asc")
    );

    const snapshot = await getDocs(eventsQuery);

    let registrationCount = 0;

    for (const eventDoc of snapshot.docs) {
      const event = eventDoc.data();
      const eventId = eventDoc.id;

      const registrationRef = doc(
        db,
        "events",
        eventId,
        "registrations",
        currentUser.uid
      );

      const registrationSnapshot = await getDoc(registrationRef);

      if (!registrationSnapshot.exists()) {
        continue;
      }

      registrationCount++;

      const card = document.createElement("article");
      card.className = "event-card";

      addTextElement(
        card,
        "span",
        "Registered",
        "event-status"
      );

      addTextElement(
        card,
        "h3",
        event.title || "Untitled event"
      );

      addTextElement(
        card,
        "p",
        event.description || "No description provided."
      );

      addTextElement(
        card,
        "p",
        `📍 ${event.venue || "Venue not specified"}`,
        "event-meta"
      );

      addTextElement(
        card,
        "p",
        `🗓️ ${formatDate(event.startAt)}`,
        "event-meta"
      );


      // Internal registrations only.
      // External platform registrations cannot be verified here.

      if (event.registrationUrl) {
        if (isValidHttpUrl(event.registrationUrl)) {
          const link = document.createElement("a");

          link.href = event.registrationUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.className = "event-register-button";
          link.textContent = "Open external registration ↗";

          card.appendChild(link);
        }

        addTextElement(
          card,
          "p",
          "Mattelab cannot verify your registration on an external platform.",
          "event-meta"
        );
      } else {
        const cancelButton = document.createElement("button");

        cancelButton.type = "button";
        cancelButton.className = "event-register-button";
        cancelButton.textContent = "Cancel registration";

        cancelButton.addEventListener("click", async () => {
          const confirmed = window.confirm(
            `Cancel your registration for "${event.title}"?`
          );

          if (!confirmed) return;

          cancelButton.disabled = true;

          try {
            await deleteDoc(registrationRef);

            await loadMyRegistrations();
            await loadEvents();
          } catch (error) {
            console.error("Cancellation failed:", error);

            alert(
              "Could not cancel your registration. Please try again."
            );

            cancelButton.disabled = false;
          }
        });

        card.appendChild(cancelButton);
      }

      myRegistrationsList.appendChild(card);
    }

    registrationsMessage.textContent =
      registrationCount === 0
        ? "You haven't registered for any events through Mattelab yet."
        : `You have ${registrationCount} registered event(s).`;
  } catch (error) {
    console.error("Could not load registrations:", error);

    registrationsMessage.textContent =
      "Could not load your registrations. Check your Firestore rules and browser console.";
  } finally {
    refreshRegistrationsButton.disabled = false;
  }
}


// 7. REFRESH BUTTONS

refreshEventsButton.addEventListener("click", loadEvents);

refreshRegistrationsButton.addEventListener(
  "click",
  loadMyRegistrations
);


// 8. AUTHENTICATION

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  // Only approved organizers see the creation form.
  // Firestore rules enforce the real permission.
  createEventCard.hidden = !isOrganizer(user);

  loadEvents();
  loadMyRegistrations();
});
