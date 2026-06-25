import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyBKkmNsLYzz12hNoGMFP3eaHCtxPJCsIi0',
  authDomain: 'cutlist-17450.firebaseapp.com',
  projectId: 'cutlist-17450',
  storageBucket: 'cutlist-17450.appspot.com',
  messagingSenderId: '149400144857',
  appId: '1:149400144857:web:fa6f4a90ec177fd90ce7c8',
});

// `ignoreUndefinedProperties` so a save isn't rejected outright when a settings
// field is undefined (e.g. not yet loaded) — those keys are just skipped.
// initializeFirestore throws if it already ran (e.g. on HMR), so fall back.
function createDb() {
  try {
    return initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}
export const db = createDb();
export const usersRef = collection(db, 'users');

export const firebaseAuth = getAuth(firebaseApp);
