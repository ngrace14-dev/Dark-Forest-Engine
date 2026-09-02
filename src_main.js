JavaScript
1
// Firebase
2
 
3
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
4
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
5
 
6
const firebaseConfig = {
7
apiKey: "AIzaSyDOYOEY21cg63ogoW50eMFHcjyOwfiEMVA",
8
authDomain: "tips-tracker-40710.firebaseapp.com",
9
projectId: "tips-tracker-40710",
10
storageBucket: "tips-tracker-40710.firebasestorage.app",
11
messagingSenderId: "785955241640",
12
appId: "1:785955241640:web:39a518d7975777df208c9d",
13
measurementId: "G-6N0M89B29B"
14
};
15
 
16
const app = initializeApp(firebaseConfig);
17
const db = getFirestore(app);
18
 
19
window.db = db;
20
 
21
console.log("Firebase Connected!");
22
 
23
// Core Setup
24
import './core/state.js';
25
 
26
// Game Systems
27
import './systems/inventory.js';
28
import './systems/ui.js';
29
import './systems/input.js';
30
import './systems/audio.js';
31
import './systems/ai.js';
32
import './systems/dev-tools.js';
33
import './systems/vfx.js';
34
import './systems/world.js';
35
import './systems/assets.js';
36
 
37
// Engine Boot and Render Loop (Runs Last)
38
import './engine.js';
