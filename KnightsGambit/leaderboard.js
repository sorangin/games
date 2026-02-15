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
    let auth;
    let isInitialized = false;
    let currentUser = null;
    const LEADERBOARD_COLLECTION = "leaderboard";
    const USERNAMES_COLLECTION = "usernames";
    let firebaseAuthConfigError = false;

    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();

            // Set up auth state listener
            auth.onAuthStateChanged((user) => {
                currentUser = user;
                if (user) {
                    console.log("Firebase Auth: Signed in as", user.uid);
                } else {
                    if (firebaseAuthConfigError) return;
                    console.log("Firebase Auth: Signed out");
                    // Automatically sign in anonymously if not signed in
                    auth.signInAnonymously().catch(err => {
                        if (err.code === 'auth/configuration-not-found') {
                            firebaseAuthConfigError = true;
                            console.warn("Firebase Auth: Anonymous sign-in is not enabled in the Firebase Console. Online features like name reservation will be disabled.");
                        } else {
                            console.error("Anon sign-in failed:", err);
                        }
                    });
                }
            });

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

        isNameTaken: async (name) => {
            if (!isInitialized || !name) return false;
            try {
                // Names are checked against the reservation collection
                const docRef = db.collection(USERNAMES_COLLECTION).doc(name);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const data = docSnap.data();
                    // If I am the owner, it's not "taken" from me
                    if (currentUser && data.owner === currentUser.uid) {
                        return false;
                    }
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Error checking name availability:", error);
                return false;
            }
        },

        /**
         * Reserves a name for the current user.
         * @param {string} name - The name to reserve.
         * @returns {Promise<boolean>} - Success if reserved or already owned.
         */
        reserveName: async (name) => {
            if (!isInitialized || !name || !currentUser) return false;
            try {
                const docRef = db.collection(USERNAMES_COLLECTION).doc(name);
                const docSnap = await docRef.get();

                if (!docSnap.exists) {
                    // Try to create the reservation
                    await docRef.set({
                        owner: currentUser.uid,
                        createdAt: Date.now()
                    });
                    return true;
                } else {
                    const data = docSnap.data();
                    return data.owner === currentUser.uid;
                }
            } catch (error) {
                console.error("Error reserving name:", error);
                return false;
            }
        },

        /**
         * Submits a score to the leaderboard.
         * @param {string} name - Player name (used as ID).
         * @param {number} level - Highest level reached.
         * @param {number} achievements - Number of achievements.
         * @param {boolean} isCheater - Whether cheats were used.
         * @param {boolean} nakedChallenge - Whether naked challenge is active.
         * @param {string} armorId - Equipped armor ID.
         * @param {string} helmetId - Equipped helmet ID.
         * @param {boolean} flameCloak - Whether flame cloak is equipped.
         * @returns {Promise<boolean>} - Success status.
         */
        submitScore: async (name, level, achievements, isCheater, nakedChallenge = false, armorId = 'grey', helmetId = 'none', flameCloak = false) => {
            if (!isInitialized || !name || !currentUser || isCheater) {
                if (isCheater) console.log("Score not submitted: Cheats detected.");
                if (!currentUser) {
                    if (firebaseAuthConfigError) {
                        console.log("Score not submitted: Online features are disabled (Anonymous sign-in not enabled in Firebase Console).");
                    } else {
                        console.log("Score not submitted: No user logged in.");
                    }
                }
                return false;
            }

            try {
                // 1. Verify ownership first (the security rules will also enforce this)
                const isOwner = await window.OnlineLeaderboard.reserveName(name);
                if (!isOwner) {
                    console.error("Failed to submit: Name is owned by someone else.");
                    return false;
                }

                const docRef = db.collection(LEADERBOARD_COLLECTION).doc(name);

                const currentDoc = await docRef.get();
                if (currentDoc.exists) {
                    const data = currentDoc.data();
                    // Optional: If you want to keep per-UID records instead of per-name, 
                    // you would use UID as doc ID. But name-as-ID is easier for displays.
                    if (data.level > level) {
                        return true; // Already has a better score
                    }
                }

                await docRef.set({
                    name: name,
                    level: Number(level),
                    achievements: Number(achievements),
                    nakedChallenge: Boolean(nakedChallenge),
                    armorId: armorId,
                    helmetId: helmetId,
                    flameCloak: Boolean(flameCloak),
                    owner: currentUser.uid, // Tie the score to the UID too
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
