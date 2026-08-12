// Firebase config for the Lift-Cal project.
// These values are PUBLIC by design — they identify the project, they don't
// authorize anything. Security comes entirely from the database rules.

export const firebaseConfig = {
  apiKey:            "AIzaSyBzDbv7fNVWFDw2Wdfgshyts3y8q61voS8",
  authDomain:        "lift-cal.firebaseapp.com",
  databaseURL:       "https://lift-cal-default-rtdb.firebaseio.com",
  projectId:         "lift-cal",
  storageBucket:     "lift-cal.firebasestorage.app",
  messagingSenderId: "846603159400",
  appId:             "1:846603159400:web:90cd0236ced040ccd1f8dd"
};

// Public read-only feed path. Anyone with this exact string can READ your
// summary. Nobody can write to it except your signed-in account.
export const FEED_TOKEN = "wH7lqHV7y15z4EMq9T2UZi";

// The account that owns this install. Decides who gets the pre-seeded
// reference foods. Everything else is already scoped per-account by store.js.
export const OWNER_UID = "aXSDfnZK8IMT9wRVhBbEgkDHpsj2";
