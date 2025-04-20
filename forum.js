import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyc8G440M2D4aMpwDi6ce__rQ9oE4EaQI",
  authDomain: "all-fours-website.firebaseapp.com",
  projectId: "all-fours-website",
  storageBucket: "all-fours-website.appspot.com",
  messagingSenderId: "488998857560",
  appId: "1:488998857560:web:30535df25152298613132d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const postsContainer = document.getElementById("postsContainer");
  const newPostContent = document.getElementById("newPostContent");
  const createPostBtn = document.getElementById("createPostBtn");
  const postError = document.getElementById("postError");
  const currentPostingTeam = document.getElementById("currentPostingTeam");
  const postingAs = document.getElementById("postingAs");

  // Get active team (default to team1 if available)
  const getActiveTeam = () => {
  const team1Name = localStorage.getItem("team1Name");
  const team2Name = localStorage.getItem("team2Name");
  
  // If no teams registered, show as Guest
  if (!team1Name && !team2Name) {
    return "Guest";
  }
  
  // If only one team registered, use that team
  if (team1Name && !team2Name) {
    return team1Name;
  }
  if (!team1Name && team2Name) {
    return team2Name;
  }
  
  // If both teams registered, use the active team from localStorage
  return localStorage.getItem("activeTeam") || team1Name || team2Name || "Guest";
};

  // Update team display
  function updateTeamDisplay() {
    const activeTeam = getActiveTeam();
    currentPostingTeam.textContent = activeTeam;
    currentPostingTeam2.textContent = activeTeam;
    postingAs.textContent = `Currently posting as: ${activeTeam}`;
    
    // Style the team display
    postingAs.style.padding = "10px";
    postingAs.style.backgroundColor = "#f8f8f8";
    postingAs.style.borderRadius = "8px";
    postingAs.style.border = "1px solid #4a0012";
  }

  // Load and display posts
  const loadPosts = () => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      postsContainer.innerHTML = "";
      snapshot.forEach((doc) => {
        const post = doc.data();
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.innerHTML = `
          <div class="post-header">
            <span class="post-author">${post.author}</span>
            <span class="post-date">
              ${post.timestamp?.toDate().toLocaleString()}
            </span>
          </div>
          <div class="post-content">${post.content}</div>
        `;
        postsContainer.appendChild(postElement);
      });
    });
    return unsubscribe;
  };

  // Create new post
  createPostBtn.addEventListener("click", async () => {
    const content = newPostContent.value.trim();
    postError.textContent = "";
    
    if (!content) {
      postError.textContent = "Please enter a message";
      return;
    }

    try {
      createPostBtn.disabled = true;
      createPostBtn.textContent = "Posting...";
      
      await addDoc(collection(db, "posts"), {
        content,
        author: getActiveTeam(),
        timestamp: serverTimestamp()
      });
      
      newPostContent.value = "";
    } catch (error) {
      console.error("Error posting:", error);
      postError.textContent = "Error creating post. Please try again.";
    } finally {
      createPostBtn.disabled = false;
      createPostBtn.textContent = "Post";
    }
  });

  // Initial load
  updateTeamDisplay();
  const unsubscribe = loadPosts();
});
