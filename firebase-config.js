// Firebase config for the Lift-Cal project.
// These values are PUBLIC by design — they identify the project, they don't
// authorize anything. Security comes entirely from the database rules, which
// gate every path on `auth.uid` and on an approval node only this account can
// write. See database.rules.json.

export const firebaseConfig = {
  apiKey:            "AIzaSyBzDbv7fNVWFDw2Wdfgshyts3y8q61voS8",
  authDomain:        "lift-cal.firebaseapp.com",
  databaseURL:       "https://lift-cal-default-rtdb.firebaseio.com",
  projectId:         "lift-cal",
  storageBucket:     "lift-cal.firebasestorage.app",
  messagingSenderId: "846603159400",
  appId:             "1:846603159400:web:90cd0236ced040ccd1f8dd"
};

// The account that runs this install. It is not a password and not a secret —
// the same uid is written into database.rules.json, which is where it actually
// carries weight. Here it only decides who is shown the People screen and who
// is exempt from the approval check, so that wiping the access tree can never
// lock the owner out of his own app.
//
// The world-readable FEED_TOKEN that used to sit here is gone. It pointed at
// one public node holding a summary of one person's day, which was a
// reasonable thing to have when there was one person, and is not a thing that
// can exist once somebody else has an account on the same database.
export const OWNER_UID = "aXSDfnZK8IMT9wRVhBbEgkDHpsj2";
