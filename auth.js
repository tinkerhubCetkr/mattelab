import { auth }
from "./firebase.js";

import {
    GoogleAuthProvider,
    signInWithPopup
}
from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


const provider =
    new GoogleAuthProvider();


document
    .getElementById("googleLogin")
    .addEventListener("click", async () => {

        try {

            const result =
                await signInWithPopup(auth, provider);

            const user =
                result.user;


            console.log("Login successful!");

            console.log("Name:",
                user.displayName);

            console.log("Email:",
                user.email);

            console.log("UID:",
                user.uid);


            window.location.href =
                "dashboard.html";

        }

        catch (error) {

            console.error(
                "Login failed:",
                error
            );

            alert(error.message);

        }

    });