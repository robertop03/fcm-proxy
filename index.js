const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// 🔐 Inizializzazione Firebase Admin con variabile d'ambiente
if (!admin.apps.length) {
  try {
    const raw = process.env.FCM_SERVICE_ACCOUNT;
    console.log("🔍 Variabile FCM_SERVICE_ACCOUNT:", !!raw ? "TROVATA ✅" : "❌ NON trovata");

    const serviceAccount = JSON.parse(raw);

    // Fix: rimpiazza \\n con \n nella private_key
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.error("❌ Errore inizializzazione Firebase:", err.message);
  }
}

// 📬 Endpoint POST per inviare notifica
app.route("/api/send-notification")
  .get((req, res) => {
    // Risposta al ping di UptimeRobot
    res.status(200).send("Ping ricevuto - server attivo");
  })
  .post(async (req, res) => {
    const { fcmToken, notificaJson } = req.body;

    if (!fcmToken || !notificaJson) {
      return res.status(400).json({ error: "Missing fcmToken or notificaJson" });
    }

    try {
      const notifica = JSON.parse(decodeURIComponent(notificaJson));

      console.log("📨 Inviando notifica a:", fcmToken);
      console.log("📝 Contenuto:", notifica.titolo, "-", notifica.testo);

      const message = {
        token: fcmToken,
        notification: {
          title: notifica.titolo,
          body: notifica.testo,
        },
        data: {
          notificaJson: encodeURIComponent(JSON.stringify(notifica)),
        },
      };

      const response = await admin.messaging().send(message);

      console.log("✅ Notifica inviata:", response);
      return res.status(200).json({ success: true, response });
    } catch (error) {
      console.error("❌ Errore FCM:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });


// 🚀 Avvia il server
app.listen(PORT, () => {
  console.log(`🚀 Server attivo su http://localhost:${PORT}`);
});

app.get("/ping", (req, res) => {
  res.status(200).send("Pong dal server attivo!");
});
