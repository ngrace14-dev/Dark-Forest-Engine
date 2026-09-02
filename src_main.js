import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

 

import './core/state.js';

 

import './systems/inventory.js';

import './systems/ui.js';

import './systems/input.js';

import './systems/audio.js';

import './systems/ai.js';

import './systems/dev-tools.js';

import './systems/vfx.js';

import './systems/world.js';

import './systems/assets.js';

import './engine.js';

 

const firebaseConfig = {

apiKey: "AIzaSyDOYOEY21cg63ogoW50eMFHcjyOwfiEMVA",

authDomain: "tips-tracker-40710.firebaseapp.com",

projectId: "tips-tracker-40710",

storageBucket: "tips-tracker-40710.firebasestorage.app",

messagingSenderId: "785955241640",

appId: "1:785955241640:web:39a518d7975777df208c9d",

measurementId: "G-6N0M89B29B"

};

 

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

 

window.db = db;

 

console.log("Firebase Connected!");
