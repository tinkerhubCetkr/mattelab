// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDcZnnLtG9--VFYbr6JyDZAM5AfH8JgVXo",
    authDomain: "mattelab-4f67e.firebaseapp.com",
    projectId: "mattelab-4f67e",
    storageBucket: "mattelab-4f67e.firebasestorage.app",
    messagingSenderId: "213209611299",
    appId: "1:213209611299:web:2447bc299c8d5ac7d74596",
    measurementId: "G-10SEKPZVVE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
