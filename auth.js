import { auth, db }
from "./firebase.js";

import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, redirect immediately
    window.location.href = "dashboard.html";
  }
});


document.getElementById("googleLogin").addEventListener("click", async () => {

try {
    // Step 1: Sign in with Google
    const result = await signInWithPopup(
        auth,
        provider
    );

    const user = result.user;

    // Step 2: Reference this user's profile
    const userRef = doc(
        db,
        "users",
        user.uid
    );

    // Step 3: Check whether a profile exists
    const userSnap = await getDoc(userRef);

    // Step 4: Create a profile only for new users
    if (!userSnap.exists()) {
        await setDoc(userRef, {
            name: user.displayName || "",
            email: user.email || "",
            role: "student",
            createdAt: serverTimestamp()
        });
    }

    console.log("Login successful!");
    console.log("Name:", user.displayName);
    console.log("Email:", user.email);
    console.log("UID:", user.uid);

    // Step 5: Open the dashboard
    window.location.href = "dashboard.html";

    } 
    catch (error) {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
        }
    });

    