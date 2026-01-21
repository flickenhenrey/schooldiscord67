import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPggbx3_-BR-Lf8aBkihufcXFF9stijAc",
  authDomain: "schooldiscord67.firebaseapp.com",
  projectId: "schooldiscord67",
  storageBucket: "schooldiscord67.firebasestorage.app",
  messagingSenderId: "870727141580",
  appId: "1:870727141580:web:26b441254827d647409a69"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const provider = new GoogleAuthProvider();

let myUsername = null;
let activeChatId = null;

// --- LOGIN & USERNAME CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Look up who this user is
        const userRef = doc(db, "email_to_username", user.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            myUsername = userSnap.data().username;
            startApp();
        } else {
            // New user: Show username picker
            document.getElementById('username-modal').style.display = 'flex';
            document.getElementById('auth-container').style.display = 'none';
        }
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('username-modal').style.display = 'none';
    }
});

// Save New Username
document.getElementById('save-username-btn').onclick = async () => {
    const val = document.getElementById('username-input').value.trim().toLowerCase();
    if (val.length < 3) return alert("Too short!");
    
    const nameCheck = await getDoc(doc(db, "usernames", val));
    if (nameCheck.exists()) return alert("Username taken!");

    // Set records
    await setDoc(doc(db, "usernames", val), { email: auth.currentUser.email });
    await setDoc(doc(db, "email_to_username", auth.currentUser.email), { username: val });
    
    myUsername = val;
    document.getElementById('username-modal').style.display = 'none';
    startApp();
};

function startApp() {
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('display-my-name').innerText = `@${myUsername}`;
    loadFriends();
}

// --- FRIENDS ---
document.getElementById('add-friend-btn').onclick = async () => {
    const target = document.getElementById('friend-search').value.toLowerCase().trim();
    if (!target || target === myUsername) return;

    const exists = await getDoc(doc(db, "usernames", target));
    if (exists.exists()) {
        await setDoc(doc(db, "users", myUsername, "friends", target), { name: target });
        document.getElementById('friend-search').value = "";
        alert("Friend added!");
    } else {
        alert("User not found!");
    }
};

function loadFriends() {
    onSnapshot(collection(db, "users", myUsername, "friends"), (snap) => {
        const list = document.getElementById('friends-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const name = d.data().name;
            const div = document.createElement('div');
            div.className = "friend-item";
            div.innerText = `@${name}`;
            div.onclick = () => openChat(name);
            list.appendChild(div);
        });
    });
}

// --- MESSAGING ---
function openChat(friendName) {
    activeChatId = [myUsername, friendName].sort().join("_");
    document.getElementById('chat-header-title').innerText = `@ ${friendName}`;
    document.getElementById('message-input').disabled = false;
    loadMessages();
}

document.getElementById('message-input').onkeypress = async (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== "") {
        await addDoc(collection(db, "chats", activeChatId, "messages"), {
            text: e.target.value,
            sender: myUsername,
            timestamp: serverTimestamp()
        });
        e.target.value = "";
    }
};

function loadMessages() {
    const q = query(collection(db, "chats", activeChatId, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
        const cont = document.getElementById('messages-container');
        cont.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const div = document.createElement('div');
            div.className = `msg ${m.sender === myUsername ? 'msg-me' : 'msg-them'}`;
            div.innerText = m.text;
            cont.appendChild(div);
        });
        cont.scrollTop = cont.scrollHeight;
    });
}

// Popup Login
document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
