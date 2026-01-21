import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

let activeChatId = null;
let myUsername = null;

// --- AUTH LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, check for username
        const emailRef = doc(db, "users_by_email", user.email);
        const userDoc = await getDoc(emailRef);

        if (userDoc.exists()) {
            myUsername = userDoc.data().username;
            initApp();
        } else {
            // No username found, show setup screen
            document.getElementById('username-modal').style.display = 'flex';
            document.getElementById('auth-container').style.display = 'none';
        }
    } else {
        // Not logged in
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('username-modal').style.display = 'none';
    }
});

// Resolve redirect (fixes GitHub COOP errors)
getRedirectResult(auth).catch((error) => console.error(error));

// Save Username
document.getElementById('save-username-btn').onclick = async () => {
    const usernameInput = document.getElementById('username-input').value.trim().toLowerCase();
    if (usernameInput.length < 3) return alert("Min 3 characters!");
    if (usernameInput.includes(" ")) return alert("No spaces allowed!");

    const nameRef = doc(db, "usernames", usernameInput);
    const nameCheck = await getDoc(nameRef);

    if (nameCheck.exists()) return alert("Username already taken!");

    // Save mapping: Username -> Email AND Email -> Username
    await setDoc(nameRef, { email: auth.currentUser.email });
    await setDoc(doc(db, "users_by_email", auth.currentUser.email), { username: usernameInput });

    myUsername = usernameInput;
    document.getElementById('username-modal').style.display = 'none';
    initApp();
};

function initApp() {
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('my-username-display').innerText = `@${myUsername}`;
    loadFriends();
}

// --- FRIEND LOGIC ---
document.getElementById('add-friend-btn').onclick = async () => {
    const targetName = document.getElementById('friend-search').value.toLowerCase().trim();
    if (!targetName || targetName === myUsername) return;

    const nameRef = doc(db, "usernames", targetName);
    const nameCheck = await getDoc(nameRef);

    if (nameCheck.exists()) {
        // Add to my friend subcollection
        await setDoc(doc(db, "users", myUsername, "friends", targetName), { name: targetName });
        document.getElementById('friend-search').value = "";
        alert("Friend added!");
    } else {
        alert("User not found!");
    }
};

function loadFriends() {
    onSnapshot(collection(db, "users", myUsername, "friends"), (snapshot) => {
        const list = document.getElementById('friends-list');
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const name = doc.data().name;
            const div = document.createElement('div');
            div.className = "friend-item";
            div.innerText = `@${name}`;
            div.onclick = () => openChat(name);
            list.appendChild(div);
        });
    });
}

// --- CHAT LOGIC ---
function openChat(friendName) {
    activeChatId = [myUsername, friendName].sort().join("_");
    document.getElementById('chat-title').innerText = `@ ${friendName}`;
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
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('messages-container');
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const m = doc.data();
            const div = document.createElement('div');
            const isMe = m.sender === myUsername;
            div.className = `msg ${isMe ? 'msg-me' : 'msg-them'}`;
            div.innerHTML = `<span class="msg-label">${m.sender}</span>${m.text}`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

// Global Buttons
document.getElementById('login-btn').onclick = () => signInWithRedirect(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
