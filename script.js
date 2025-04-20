import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getFirestore, collection, doc, setDoc, getDocs,
  query, where, orderBy, serverTimestamp, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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
const auth = getAuth(app);

// Game State
let team1Score = 0;
let team2Score = 0;
let team1Name = "";
let team2Name = "";
let highTrump = null;
let lowTrump = null;
let jackHolder = null;
let gameWinner = null;
let gameOverFlag = false;



document.addEventListener("DOMContentLoaded", function () {
  
  // UI Elements
  const registerTeam1Btn = document.getElementById("registerTeam1Btn");
  const registerTeam2Btn = document.getElementById("registerTeam2Btn");
  const team1Error = document.getElementById("team1Error");
  const team2Error = document.getElementById("team2Error");
  const logoutBtn = document.getElementById("logoutBtn");

  // Check if required elements exist
  if (!registerTeam1Btn || !registerTeam2Btn || !team1Error || !team2Error || !logoutBtn) {
    console.error("Critical UI elements are missing!");
    return;
  }

  // Helper Functions
  const showLoading = (button, text = "Loading...") => {
    button.disabled = true;
    button.textContent = text;
  };

  const hideLoading = (button, originalText) => {
    button.disabled = false;
    button.textContent = originalText;
  };

  const showError = (element, message) => {
    element.textContent = message;
    element.style.display = "block";
  };

  const clearError = (element) => {
    element.textContent = "";
    element.style.display = "none";
  };

  // Update logout button visibility
  const updateLogoutVisibility = () => {
    const hasTeams = localStorage.getItem("team1Name") || localStorage.getItem("team2Name");
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.style.display = hasTeams ? "block" : "none";
    }
  };

  // Save complete game state
  const saveGameState = () => {
    const gameState = {
      team1Score,
      team2Score,
      team1Name,
      team2Name,
      highTrump,
      lowTrump,
      jackHolder,
      gameWinner,
      gameOverFlag
    };
    localStorage.setItem("currentGameState", JSON.stringify(gameState));
  };

  // Load complete game state
  const loadGameState = () => {
    const savedState = localStorage.getItem("currentGameState");
    if (savedState) {
      const state = JSON.parse(savedState);
      team1Score = state.team1Score || 0;
      team2Score = state.team2Score || 0;
      team1Name = state.team1Name || "";
      team2Name = state.team2Name || "";
      highTrump = state.highTrump || null;
      lowTrump = state.lowTrump || null;
      jackHolder = state.jackHolder || null;
      gameWinner = state.gameWinner || null;
      gameOverFlag = state.gameOverFlag || false;
      
      updateScores();
      
      // Restore button states
      if (jackHolder === "team1") {
        const team1JackBtn = document.getElementById("team1Jack");
        if (team1JackBtn) team1JackBtn.classList.add("selected");
      } else if (jackHolder === "team2") {
        const team2JackBtn = document.getElementById("team2Jack");
        if (team2JackBtn) team2JackBtn.classList.add("selected");
      }
      
      if (gameWinner === "team1") {
        const team1GameBtn = document.getElementById("team1Game");
        if (team1GameBtn) team1GameBtn.classList.add("selected");
      } else if (gameWinner === "team2") {
        const team2GameBtn = document.getElementById("team2Game");
        if (team2GameBtn) team2GameBtn.classList.add("selected");
      }
    }
  };

  async function authenticateTeam(teamName, password) {
    try {
      const teamsRef = collection(db, "teams");
      const q = query(teamsRef, where("teamName", "==", teamName));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { error: "Team not found" };
      }
      
      const teamData = snapshot.docs[0].data();
      if (teamData.passcode !== password) {
        return { error: "Incorrect password" };
      }
      
      return { 
        authenticated: true,
        teamId: snapshot.docs[0].id,
        data: teamData
      };
    } catch (error) {
      console.error("Authentication error:", error);
      return { error: "Authentication failed" };
    }
  }

  // Registration Handler
  const handleRegistration = async (teamNumber) => {
    const nameInput = document.getElementById(`team${teamNumber}Name`);
    const passInput = document.getElementById(`team${teamNumber}Passcode`);
    
    if (!nameInput || !passInput) {
      console.error(`Team ${teamNumber} input fields not found`);
      return;
    }
  
    const name = nameInput.value.trim();
    const pass = passInput.value.trim();
    const errorDisplay = document.getElementById(`team${teamNumber}Error`);
    const button = teamNumber === 1 ? registerTeam1Btn : registerTeam2Btn;
  
    clearError(errorDisplay);
    showLoading(button);
  
    try {
      // Basic validation
      if (!name || !pass) throw new Error("Team name and password are required");
      if (pass.length < 4) throw new Error("Password must be at least 4 characters");
  
      // Check if team is already registered in this session
      const otherTeamName = localStorage.getItem(teamNumber === 1 ? "team2Name" : "team1Name");
      if (otherTeamName && otherTeamName.toLowerCase() === name.toLowerCase()) {
        throw new Error("This team is already registered");
      }
  
      // Check if team exists in database
      const authResult = await authenticateTeam(name, pass);
      
      if (authResult.error) {
        if (authResult.error === "Team not found") {
          // Create new team
          const teamRef = doc(collection(db, "teams"));
          await setDoc(teamRef, {
            teamName: name,
            passcode: pass,
            totalScore: 0,
            gameCount: 0,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        } else {
          throw new Error(authResult.error);
        }
      }
  
      // Store session
      localStorage.setItem(`team${teamNumber}Name`, name);
      localStorage.setItem(`team${teamNumber}Passcode`, pass);
      updateLogoutVisibility();
      
      // Proceed to game
      if (teamNumber === 1) {
        document.getElementById("teamRegistration").style.display = "none";
        const team2Reg = document.getElementById("team2Registration");
        if (team2Reg) team2Reg.style.display = "block";
      } else {
        startGame();
      }
      
    } catch (error) {
      console.error("Registration error:", error);
      showError(errorDisplay, error.message);
    } finally {
      hideLoading(button, `Register Team ${teamNumber}`);
      updateLogoutVisibility();
    }
  };

  // Game Functions
  function updateScores() {
    const team1ScoreEl = document.getElementById("team1Score");
    const team2ScoreEl = document.getElementById("team2Score");
    if (team1ScoreEl) team1ScoreEl.textContent = team1Score;
    if (team2ScoreEl) team2ScoreEl.textContent = team2Score;
  }

  function resetGameState() {
    team1Score = 0;
    team2Score = 0;
    highTrump = null;
    lowTrump = null;
    jackHolder = null;
    gameWinner = null;
    gameOverFlag = false;
    updateScores();
    
    // Reset selected buttons
    const team1JackBtn = document.getElementById("team1Jack");
    const team2JackBtn = document.getElementById("team2Jack");
    const team1GameBtn = document.getElementById("team1Game");
    const team2GameBtn = document.getElementById("team2Game");
    
    if (team1JackBtn) team1JackBtn.classList.remove("selected");
    if (team2JackBtn) team2JackBtn.classList.remove("selected");
    if (team1GameBtn) team1GameBtn.classList.remove("selected");
    if (team2GameBtn) team2GameBtn.classList.remove("selected");
  }

  function checkForEndGame() {
    if (team1Score >= 14 || team2Score >= 14) {
      gameOverFlag = true;
      const winner = team1Score >= 14 ? team1Name : team2Name;
      const winnerMessage = document.getElementById("winnerMessage");
      const gameOverPopup = document.getElementById("gameOverPopup");
      
      if (winnerMessage) winnerMessage.textContent = `${winner} wins!`;
      if (gameOverPopup) gameOverPopup.style.display = "flex";
      updateLeaderboard();
      
      // Save game stats with a flag indicating this was a completed game
      const gameState = {
        team1Name,
        team2Name,
        team1Score,
        team2Score,
        winner,
        winningScore: team1Score >= 14 ? team1Score : team2Score,
        losingScore: team1Score >= 14 ? team2Score : team1Score,
        timestamp: new Date().toISOString(),
        gameCompleted: true
      };
      localStorage.setItem("currentGameStats", JSON.stringify(gameState));
    }
  }

  async function updateLeaderboard() {
    try {
      const winningTeam = team1Score >= 14 ? team1Name : team2Name;
      const winningScore = team1Score >= 14 ? team1Score : team2Score;
      
      // Update teams collection
      const teamsRef = collection(db, "teams");
      const winningQuery = query(teamsRef, where("teamName", "==", winningTeam));
      const winningSnapshot = await getDocs(winningQuery);
      
      if (!winningSnapshot.empty) {
        const teamRef = winningSnapshot.docs[0].ref;
        
        // Get current totalScore first
        const teamData = winningSnapshot.docs[0].data();
        const newTotalScore = (teamData.totalScore || 0) + winningScore;
        
        await updateDoc(teamRef, {
          totalScore: newTotalScore,
          gameCount: increment(1),
          wins: increment(1),
          lastGameWon: serverTimestamp()
        });
        
        // Force update leaderboard with exact score
        const leaderboardRef = doc(db, "leaderboard", winningTeam);
        await setDoc(leaderboardRef, {
          teamName: winningTeam,
          totalScore: newTotalScore,
          gameCount: increment(1),
          lastUpdated: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Leaderboard update error:", error);
      alert("Failed to update leaderboard. Please try again.");
    }
  }

  function startGame() {
    team1Name = localStorage.getItem("team1Name") || "";
    team2Name = localStorage.getItem("team2Name") || "";

    const team1Display = document.getElementById("team1DisplayName");
    const team2Display = document.getElementById("team2DisplayName");
    const teamReg = document.getElementById("teamRegistration");
    const team2Reg = document.getElementById("team2Registration");
    const gameArea = document.getElementById("gameArea");

    if (team1Display) team1Display.textContent = team1Name;
    if (team2Display) team2Display.textContent = team2Name;
    if (teamReg) teamReg.style.display = "none";
    if (team2Reg) team2Reg.style.display = "none";
    if (gameArea) gameArea.style.display = "block";

    resetGameState();
  }

  // Score Button Handlers
  function setupScoreButtons() {
    // Team 1 buttons
    const team1HighBtn = document.getElementById("team1High");
    const team1LowBtn = document.getElementById("team1Low");
    const team1JackBtn = document.getElementById("team1Jack");
    const team1GameBtn = document.getElementById("team1Game");

    // Team 2 buttons
    const team2HighBtn = document.getElementById("team2High");
    const team2LowBtn = document.getElementById("team2Low");
    const team2JackBtn = document.getElementById("team2Jack");
    const team2GameBtn = document.getElementById("team2Game");

    // Award buttons
    const awardJackBtn = document.getElementById("awardJackBtn");
    const awardGameBtn = document.getElementById("awardGameBtn");

    // Add event listeners only if elements exist
    if (team1HighBtn) {
      team1HighBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          highTrump = { team: 1 };
          team1Score++;
          updateScores();
          checkForEndGame();
          saveGameState();
        }
      });
    }

    if (team1LowBtn) {
      team1LowBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          lowTrump = { team: 1 };
          team1Score++;
          updateScores();
          checkForEndGame();
          saveGameState();
        }
      });
    }

    if (team1JackBtn) {
      team1JackBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          jackHolder = "team1";
          team1JackBtn.classList.add("selected");
          const team2JackBtn = document.getElementById("team2Jack");
          if (team2JackBtn) team2JackBtn.classList.remove("selected");
          saveGameState();
        }
      });
    }

    if (team1GameBtn) {
      team1GameBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          gameWinner = "team1";
          team1GameBtn.classList.add("selected");
          const team2GameBtn = document.getElementById("team2Game");
          if (team2GameBtn) team2GameBtn.classList.remove("selected");
          saveGameState();
        }
      });
    }

    if (team2HighBtn) {
      team2HighBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          highTrump = { team: 2 };
          team2Score++;
          updateScores();
          checkForEndGame();
          saveGameState();
        }
      });
    }

    if (team2LowBtn) {
      team2LowBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          lowTrump = { team: 2 };
          team2Score++;
          updateScores();
          checkForEndGame();
          saveGameState();
        }
      });
    }

    if (team2JackBtn) {
      team2JackBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          jackHolder = "team2";
          team2JackBtn.classList.add("selected");
          const team1JackBtn = document.getElementById("team1Jack");
          if (team1JackBtn) team1JackBtn.classList.remove("selected");
          saveGameState();
        }
      });
    }

    if (team2GameBtn) {
      team2GameBtn.addEventListener("click", () => {
        if (!gameOverFlag) {
          gameWinner = "team2";
          team2GameBtn.classList.add("selected");
          const team1GameBtn = document.getElementById("team1Game");
          if (team1GameBtn) team1GameBtn.classList.remove("selected");
          saveGameState();
        }
      });
    }

    if (awardJackBtn) {
      awardJackBtn.addEventListener("click", () => {
        if (!gameOverFlag && jackHolder) {
          if (jackHolder === "team1") team1Score += 1;
          else team2Score += 1;
          updateScores();
          checkForEndGame();
          saveGameState();
        }
      });
    }

    if (awardGameBtn) {
      awardGameBtn.addEventListener("click", () => {
        if (!gameOverFlag && gameWinner) {
          if (gameWinner === "team1") team1Score += 1;
          else team2Score += 1;
          updateScores();
          checkForEndGame();
          saveGameState();
        }
      });
    }
  }

  // Navigation
  const playAgainBtn = document.getElementById("playAgainBtn");
if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    resetGameState();
    const gameOverPopup = document.getElementById("gameOverPopup");
    if (gameOverPopup) gameOverPopup.style.display = "none";
    saveGameState();
  });
}

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to logout all teams?")) {
        localStorage.removeItem("team1Name");
        localStorage.removeItem("team2Name");
        localStorage.removeItem("team1Passcode");
        localStorage.removeItem("team2Passcode");
        localStorage.removeItem("currentGameState");
        location.reload();
      }
    });
  }

  const viewLeaderboardBtn = document.getElementById("viewLeaderboardBtn");
if (viewLeaderboardBtn) {
  viewLeaderboardBtn.addEventListener("click", () => {
    saveGameState();
    window.location.href = "stats.html";
  });
}

// Add new event listener for the popup's view leaderboard button
const viewLeaderboardBtnPopup = document.getElementById("viewLeaderboardBtnPopup");
if (viewLeaderboardBtnPopup) {
  viewLeaderboardBtnPopup.addEventListener("click", () => {
    saveGameState();
    window.location.href = "stats.html";
  });
}
const newGameBtn = document.getElementById("newGameBtn");
if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    if (confirm("Start a new game? This will reset all scores but keep teams registered.")) {
      resetGameState();
      saveGameState();
      
      // Reset any selected buttons
      document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Update UI
      updateScores();
    }
  });
}

// Add new event listener for view stats button
const viewStatsBtn = document.getElementById("viewStatsBtn");
if (viewStatsBtn) {
  viewStatsBtn.addEventListener("click", () => {
    // Reset game state since we're viewing stats after a completed game
    resetGameState();
    saveGameState();
    window.location.href = "profile.html";
  });
}


  // Initialize
  if (registerTeam1Btn) {
    registerTeam1Btn.addEventListener("click", () => handleRegistration(1));
  }
  if (registerTeam2Btn) {
    registerTeam2Btn.addEventListener("click", () => handleRegistration(2));
  }
  setupScoreButtons();
  updateLogoutVisibility();

  // Restore game if returning
  const savedState = localStorage.getItem("currentGameState");
  const team1Registered = localStorage.getItem("team1Name");
  const team2Registered = localStorage.getItem("team2Name");

  if (savedState) {
    // Case 1: Returning from leaderboard
    loadGameState();
    const state = JSON.parse(savedState);
    team1Name = state.team1Name || "";
    team2Name = state.team2Name || "";
    
    // Directly go to game if we have both teams
    if (team1Name && team2Name) {
      const team1Display = document.getElementById("team1DisplayName");
      const team2Display = document.getElementById("team2DisplayName");
      const teamReg = document.getElementById("teamRegistration");
      const team2Reg = document.getElementById("team2Registration");
      const gameArea = document.getElementById("gameArea");

      if (team1Display) team1Display.textContent = team1Name;
      if (team2Display) team2Display.textContent = team2Name;
      if (teamReg) teamReg.style.display = "none";
      if (team2Reg) team2Reg.style.display = "none";
      if (gameArea) gameArea.style.display = "block";
      updateScores();
    } else if (team1Name && !team2Name) {
      // Case 2: Mid-registration
      const teamReg = document.getElementById("teamRegistration");
      const team2Reg = document.getElementById("team2Registration");
      if (teamReg) teamReg.style.display = "none";
      if (team2Reg) team2Reg.style.display = "block";
    }
    localStorage.removeItem("currentGameState");
  } else if (team1Registered && !team2Registered) {
    // Case 2: Mid-registration (fresh page load)
    const teamReg = document.getElementById("teamRegistration");
    const team2Reg = document.getElementById("team2Registration");
    if (teamReg) teamReg.style.display = "none";
    if (team2Reg) team2Reg.style.display = "block";
  } else if (team1Registered && team2Registered) {
    // Case 3: Both teams registered but no saved state
    startGame();
  }
});