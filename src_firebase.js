import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let app, storage;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = initializeApp(firebaseConfig);
        storage = getStorage(app);
        window.FirebaseStorage = storage;
        window.EventBus?.emit('UI_LOG', '[CLOUD] Firebase Storage connected successfully.');
    } else {
        console.warn("[CLOUD] Firebase config is empty. GLB Cloud Streaming disabled.");
    }
} catch (error) {
    console.error("[CLOUD] Firebase initialization failed:", error);
}

window.getFirebaseUrl = async (path) => {
    if (!storage) {
        console.warn("[CLOUD] Attempted to fetch Firebase URL, but Firebase is not configured.");
        return path;
    }
    try {
        const fileRef = ref(storage, path);
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (error) {
        console.error(`[CLOUD] Error fetching download URL for ${path}:`, error);
        throw error;
    }
};
