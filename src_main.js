import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

 

import './src_core_state.js';

 

import './src_systems_inventory.js';

import './src_systems_ui.js';

import './src_systems_input.js';

import './src_systems_audio.js';

import './src_systems_ai.js';

import './src_systems_dev_tools.js';

import './src_systems_vfx.js';

import './src_systems_world.js';

import './src_systems_assets.js';

import './src_engine.js';

 

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
