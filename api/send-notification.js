const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    const raw = process.env.FCM_SERVICE_ACCOUNT;

    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.error("Errore nell'inizializzazione Firebase:", err.message);
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fcmToken, notificaJson } = req.body;

  if (!fcmToken || !notificaJson) {
    return res.status(400).json({ error: "Missing fcmToken or notificaJson" });
  }

  try {
    const notifica = JSON.parse(decodeURIComponent(notificaJson));

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

    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Errore FCM:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
