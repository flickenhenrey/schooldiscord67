import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPggbx3_-BR-Lf8aBkihufcXFF9stijAc",
  authDomain: "schooldiscord67.firebaseapp.com",
  projectId: "schooldiscord67",
  storageBucket: "schooldiscord67.firebasestorage.app",
  messagingSenderId: "870727141580",
  appId: "1:870727141580:web:26b441254827d647409a69",
  measurementId: "G-2D3E72HNF3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const provider = new GoogleAuthProvider();

let activeChatId = null;
let myUsername = null;

// --- AUTH LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users_by_email", user.email));
        if (userDoc.exists()) {
            myUsername = userDoc.data().username;
            startApp();
        } else {
            document.getElementById('username-modal').style.display = 'flex';
            document.getElementById('auth-container').style.display = 'none';
        }
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('username-modal').style.display = 'none';
    }
});

document.getElementById('save-username-btn').onclick = async () => {
    const username = document.getElementById('username-input').value.trim().toLowerCase();
    if (username.length < 2) return alert("Too short!");
    
    // Save mapping
    await setDoc(doc(db, "usernames", username), { email: auth.currentUser.email });
    await setDoc(doc(db, "users_by_email", auth.currentUser.email), { username: username });
    
    myUsername = username;
    document.getElementById('username-modal').style.display = 'none';
    startApp();
};

function startApp() {
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('user-display-name').innerText = myUsername;
    loadFriends();
}

// --- FRIEND LOGIC ---
document.getElementById('add-friend-btn').onclick = async () => {
    const target = document.getElementById('friend-search').value.toLowerCase().trim();
    if (target === myUsername) return;
    
    const nameCheck = await getDoc(doc(db, "usernames", target));
    if (nameCheck.exists()) {
        await setDoc(doc(db, `users/${myUsername}/friends`, target), { name: target });
        document.getElementById('friend-search').value = "";
        alert("Friend added!");
    } else {
        alert("User not found!");
    }
};

function loadFriends() {
    onSnapshot(collection(db, `users/${myUsername}/friends`), (snapshot) => {
        const list = document.getElementById('friends-list');
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const name = doc.data().name;
            const div = document.createElement('div');
            div.className = "friend-item";
            div.innerText = `@ ${name}`;
            div.onclick = () => startChat(name);
            list.appendChild(div);
        });
    });
}

// --- CHAT LOGIC ---
function startChat(friendName) {
    activeChatId = [myUsername, friendName].sort().join("_");
    document.getElementById('chat-with-title').innerText = `@ ${friendName}`;
    document.getElementById('message-input').disabled = false;
    loadMessages();
}

document.getElementById('message-input').onkeypress = async (e) => {
    if (e.key === 'Enter' && e.target.value !== "") {
        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
            text: e.target.value,
            sender: myUsername,
            timestamp: serverTimestamp()
        });
        e.target.value = "";
    }
};

function loadMessages() {
    const q = query(collection(db, `chats/${activeChatId}/messages`), orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('messages-container');
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const m = doc.data();
            const div = document.createElement('div');
            div.className = `msg ${m.sender === myUsername ? 'msg-me' : ''}`;
            div.innerHTML = `<b>${m.sender}</b><div class="msg-text">${m.text}</div>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
