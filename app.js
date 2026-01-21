import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Login Logic
document.getElementById('login-btn').onclick = () => signInWithRedirect(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        // Save user to database
        setDoc(doc(db, "users", user.email), { email: user.email }, { merge: true });
        loadFriends();
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

getRedirectResult(auth).catch(err => console.error(err));

// Friend Logic
document.getElementById('add-friend-btn').onclick = async () => {
    const email = document.getElementById('friend-search').value.toLowerCase().trim();
    if (email && email !== auth.currentUser.email) {
        await setDoc(doc(db, `users/${auth.currentUser.email}/friends`, email), { email: email });
        document.getElementById('friend-search').value = "";
        alert("Friend added!");
    }
};

function loadFriends() {
    onSnapshot(collection(db, `users/${auth.currentUser.email}/friends`), (snapshot) => {
        const list = document.getElementById('friends-list');
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const email = doc.data().email;
            const div = document.createElement('div');
            div.className = "friend-item";
            div.innerText = email;
            div.onclick = () => startChat(email);
            list.appendChild(div);
        });
    });
}

// Chat Logic
function startChat(friendEmail) {
    activeChatId = [auth.currentUser.email, friendEmail].sort().join("_");
    document.getElementById('chat-with-title').innerText = `Chatting with ${friendEmail}`;
    document.getElementById('message-input').disabled = false;
    loadMessages();
}

document.getElementById('message-input').onkeypress = async (e) => {
    if (e.key === 'Enter' && e.target.value !== "") {
        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
            text: e.target.value,
            sender: auth.currentUser.email,
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
            div.className = `msg ${m.sender === auth.currentUser.email ? 'msg-me' : 'msg-them'}`;
            div.innerText = m.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}
