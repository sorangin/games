(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyATT6JHk63QjxXFvNx3NCOZLFRmWbXYS_Y",
        authDomain: "knightsgambit-10f0a.firebaseapp.com",
        projectId: "knightsgambit-10f0a",
        storageBucket: "knightsgambit-10f0a.firebasestorage.app",
        messagingSenderId: "743510531719",
        appId: "1:743510531719:web:93e722c4fc8ec1d4b56222",
        measurementId: "G-QZ92X5XGMP"
    };

    let db;
    let isInitialized = false;
    const LEADERBOARD_COLLECTION = "leaderboard";

    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            isInitialized = true;
            console.log("Firebase initialized successfully (Compat Mode)");
        } else {
            console.error("Firebase SDK not found. Make sure compat scripts are loaded.");
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }

    window.OnlineLeaderboard = {
        isInitialized: () => isInitialized,

        /**
         * Checks if a user name is already taken in the database.
         * @param {string} name - The user name to check.
         * @returns {Promise<boolean>} - True if name is taken, false otherwise.
         */
        isNameTaken: async (name) => {
            if (!isInitialized || !name) return false;
            try {
                // Compat: db.collection().doc().get()
                const docRef = db.collection(LEADERBOARD_COLLECTION).doc(name);
                const docSnap = await docRef.get();
                return docSnap.exists;
            } catch (error) {
                console.error("Error checking name availability:", error);
                return false; // Fail open
            }
        },

        /**
         * Submits a score to the leaderboard.
         * @param {string} name - Player name (used as ID).
         * @param {number} level - Highest level reached.
         * @param {number} achievements - Number of achievements.
         * @param {boolean} isCheater - Whether cheats were used.
         * @param {boolean} nakedChallenge - Whether naked challenge is active.
         * @returns {Promise<boolean>} - Success status.
         */
        submitScore: async (name, level, achievements, isCheater, nakedChallenge = false) => {
            if (!isInitialized || !name || isCheater) {
                if (isCheater) console.log("Score not submitted: Cheats detected.");
                return false;
            }

            try {
                const docRef = db.collection(LEADERBOARD_COLLECTION).doc(name);

                const currentDoc = await docRef.get();
                if (currentDoc.exists) {
                    const data = currentDoc.data();
                    if (data.level > level) {
                        return true; // Existing score is better
                    }
                }

                await docRef.set({
                    name: name,
                    level: Number(level),
                    achievements: Number(achievements),
                    nakedChallenge: Boolean(nakedChallenge),
                    timestamp: Date.now()
                });
                console.log("Score submitted successfully for", name);
                return true;
            } catch (error) {
                console.error("Error submitting score:", error);
                return false;
            }
        },

        /**
         * Fetches top scores.
         * @param {number} limitCount - Number of scores to fetch.
         * @returns {Promise<Array>} - List of score objects.
         */
        fetchLeaderboard: async (limitCount = 20) => {
            if (!isInitialized) return [];
            try {
                const scores = [];
                const querySnapshot = await db.collection(LEADERBOARD_COLLECTION)
                    .orderBy("level", "desc")

                    .limit(limitCount)
                    .get();

                querySnapshot.forEach((doc) => {
                    scores.push(doc.data());
                });
                return scores;
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
                return [];
            }
        }
    };
})();
