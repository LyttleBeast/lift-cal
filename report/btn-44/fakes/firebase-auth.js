// Fake auth for the button-measurement harness. The user is whatever the
// harness put on window before the modules ran; null means signed out.
const auth = { currentUser: window.__FAKE_USER || null };
export function getAuth() { return auth; }
export const browserLocalPersistence = {};
export async function setPersistence() {}
export function onAuthStateChanged(a, cb) { setTimeout(() => cb(auth.currentUser), 0); return () => {}; }
export async function signInWithEmailAndPassword() { return { user: auth.currentUser }; }
export async function createUserWithEmailAndPassword() { return { user: auth.currentUser }; }
export async function sendPasswordResetEmail() {}
export async function updateProfile() {}
export async function signOut() {}
