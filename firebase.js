
import { initializeApp }
from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { getAuth }
from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDcZnnLtG9--VFYbr6JyDZAM5AfH8JgVXo",
    authDomain: "mattelab-4f67e.firebaseapp.com",
    projectId: "mattelab-4f67e",
    storageBucket: "mattelab-4f67e.firebasestorage.app",
    messagingSenderId: "213209611299",
    appId: "1:213209611299:web:2447bc299c8d5ac7d74596",
    measurementId: "G-10SEKPZVVE"
};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);