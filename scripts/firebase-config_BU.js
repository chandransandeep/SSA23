// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global Firebase variables
window.firebaseApp = null;
window.db = null;
window.auth = null;
window.currentUserId = null;
window.isFirebaseReady = false;

// Expose Firestore functions globally
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.updateDoc = updateDoc;
window.collection = collection;
window.deleteDoc = deleteDoc;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmlSLhRNeOrEG4aT9t-JK20QAjzpdELVc",
  authDomain: "studybuddy-58e84.firebaseapp.com",
  projectId: "studybuddy-58e84",
  storageBucket: "studybuddy-58e84.firebasestorage.app",
  messagingSenderId: "143466700741",
  appId: "1:143466700741:web:9db108d70302aed8c435ac",
  measurementId: "G-0K69MEBD6Q"
};

// Initialize Firebase
async function initializeFirebase() {
    try {
        window.firebaseConfig = firebaseConfig;
        window.firebaseApp = initializeApp(firebaseConfig);
        window.db = getFirestore(window.firebaseApp);
        window.auth = getAuth(window.firebaseApp);

        // Sign in anonymously if no auth token is provided
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await signInWithCustomToken(window.auth, __initial_auth_token);
                console.log("Signed in with custom token.");
            } catch (error) {
                console.error("Error signing in with custom token:", error);
                document.getElementById('error-message').textContent = `Authentication error: ${error.message}. Attempting anonymous sign-in...`;
                await signInAnonymously(window.auth);
            }
        } else {
            await signInAnonymously(window.auth);
            console.log("Signed in anonymously.");
        }

        // Listen for auth state changes
        onAuthStateChanged(window.auth, (user) => {
            if (user) {
                window.currentUserId = user.uid;
                document.getElementById('user-id-display').textContent = `Your User ID: ${window.currentUserId}`;
                window.isFirebaseReady = true;
                console.log("Firebase and user ID ready:", window.currentUserId);
                
                // Initialize quiz after Firebase is ready
                if (window.initializeQuiz) {
                    window.initializeQuiz();
                }
            } else {
                window.currentUserId = null;
                document.getElementById('user-id-display').textContent = 'Not signed in.';
                window.isFirebaseReady = false;
                console.log("User signed out.");
            }
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        document.getElementById('error-message').textContent = `Firebase initialization error: ${error.message}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeFirebase);

// Utility function to get user document reference
export function getUserDocRef(userId) {
    const appId = firebaseConfig.projectId;
    return window.doc(window.db, 'artifacts', appId, 'users', userId, 'quizData', 'userSettings');
}
