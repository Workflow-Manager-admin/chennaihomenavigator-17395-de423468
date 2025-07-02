import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  getFirebaseAuth,
  setupFirebaseRecaptcha
} from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  signInWithPhoneNumber,
  updateProfile
} from "firebase/auth";

// PUBLIC_INTERFACE
const AuthContext = createContext(undefined);

// PUBLIC_INTERFACE
export function useAuth() {
  /**Returns the Auth context value.*/
  return useContext(AuthContext);
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider component to wrap around app and supply Firebase auth context.
 * Exposes user, login (email/password or phone), logout, error, loading, phone verification, etc.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        // You could expand user object here, include claims/profile
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          phone: firebaseUser.phoneNumber,
          name: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // PUBLIC_INTERFACE
  async function loginWithEmail(email, password) {
    setAuthError("");
    const auth = getFirebaseAuth();
    setAuthLoading(true);
    try {
      const resp = await signInWithEmailAndPassword(auth, email, password);
      setAuthLoading(false);
      return resp.user;
    } catch (err) {
      setAuthError(err.message);
      setAuthLoading(false);
      throw err;
    }
  }

  // PUBLIC_INTERFACE
  async function registerWithEmail(email, password, name) {
    setAuthError("");
    const auth = getFirebaseAuth();
    setAuthLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(result.user, { displayName: name });
      }
      setAuthLoading(false);
      return result.user;
    } catch (err) {
      setAuthError(err.message);
      setAuthLoading(false);
      throw err;
    }
  }

  // PUBLIC_INTERFACE
  async function loginWithPhone(phone, appVerifierId = "recaptcha-container") {
    setAuthError("");
    const auth = getFirebaseAuth();
    setAuthLoading(true);
    try {
      const recaptchaVerifier = setupFirebaseRecaptcha(appVerifierId, auth, () => {});
      const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      setAuthLoading(false);
      // Returns confirmationResult to caller (step 2: user enters code)
      return confirmationResult;
    } catch (err) {
      setAuthError(err.message);
      setAuthLoading(false);
      throw err;
    }
  }

  // PUBLIC_INTERFACE
  async function confirmPhoneCode(confirmationResult, code) {
    setAuthError("");
    setAuthLoading(true);
    try {
      const result = await confirmationResult.confirm(code);
      setAuthLoading(false);
      return result.user;
    } catch (err) {
      setAuthError(err.message);
      setAuthLoading(false);
      throw err;
    }
  }

  // PUBLIC_INTERFACE
  async function logout() {
    setAuthLoading(true);
    setAuthError("");
    const auth = getFirebaseAuth();
    try {
      await signOut(auth);
      setAuthLoading(false);
    } catch (err) {
      setAuthError(err.message);
      setAuthLoading(false);
    }
  }

  const value = {
    user,
    firebaseUser,
    authLoading,
    authError,
    loginWithEmail,
    registerWithEmail,
    loginWithPhone,
    confirmPhoneCode,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* For phone login, recaptcha container */}
      <div id="recaptcha-container" />
      {children}
    </AuthContext.Provider>
  );
}
