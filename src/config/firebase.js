const admin = require("firebase-admin");
const serviceAccount = require("./firebase_credentials.json");

console.log("Iniciando Firebase...");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase ha sido inicializado correctamente.");
} else {
  console.log("Firebase ya está inicializado.");
}

const db = admin.firestore();

module.exports = { admin, db };
