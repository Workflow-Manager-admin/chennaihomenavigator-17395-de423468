import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGAZ4puRhpj3d8c5AKhJzf9ow9JPE9fMM",
  authDomain: "homequestai-87e01.firebaseapp.com",
  projectId: "homequestai-87e01",
  storageBucket: "homequestai-87e01.firebasestorage.app",
  messagingSenderId: "1084392838532",
  appId: "1:1084392838532:web:1455d0065cbce2be0f39d1",
  measurementId: "G-9WBHR0V7FF"
};

/** Google Auth Provider */
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// PUBLIC_INTERFACE
export function getFirebaseAuth() {
  /**Returns Firebase Auth instance.*/
  return getAuth(app);
}

// PUBLIC_INTERFACE
export function setupFirebaseRecaptcha(containerId, auth, callback) {
  /**Sets up Firebase RecaptchaVerifier for phone authentication.*/
  window.recaptchaVerifier = new RecaptchaVerifier(
    containerId,
    {
      size: "invisible",
      callback,
      "expired-callback": () => {},
    },
    auth
  );
  return window.recaptchaVerifier;
}
