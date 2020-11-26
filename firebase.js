const admin = require("firebase-admin");

const serviceAccount = require("./typerace-292d4-firebase-adminsdk-d7cc1-ab5fe02c22.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
// const db = admin.firestore();

// module.exports = db;
