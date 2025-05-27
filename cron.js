const { Pool } = require("pg");
const fetch = require("node-fetch");
require("dotenv").config();

// Connessione al database Supabase
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

// Funzione per inviare notifiche non ancora inviate
async function inviaNotifiche() {
  console.log("🔄 Controllo nuove notifiche...");

  try {
    const { rows: notifiche } = await pool.query(`
      SELECT * FROM notifiche
      WHERE inviata = false
    `);

    for (const notifica of notifiche) {
      const { rows } = await pool.query(
        `SELECT fcm_token FROM utenti WHERE email = $1`,
        [notifica.destinatario]
      );

      const fcmToken = rows[0]?.fcm_token;

      if (fcmToken) {
        const notificaJson = {
          idNotifica: notifica.idNotifica,
          titolo: notifica.titolo,
          testo: notifica.testo
        };

        const body = {
          fcmToken,
          notificaJson: encodeURIComponent(JSON.stringify(notificaJson))
        };

        const response = await fetch("https://fcm-proxy.onrender.com/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          console.log(`✅ Notifica inviata a ${notifica.destinatario}`);
          await pool.query(
            `UPDATE notifiche SET inviata = true WHERE "idNotifica" = $1`,
            [notifica.idNotifica]
          );
        } else {
          console.error(`❌ Errore invio a ${notifica.destinatario}:`, await response.text());
        }
      } else {
        console.warn(`⚠️ Nessun fcm_token per ${notifica.destinatario}`);
      }
    }
  } catch (error) {
    console.error("❌ Errore durante il controllo notifiche:", error.message);
  }
}

// Avvia loop ogni 30 secondi
setInterval(inviaNotifiche, 30 * 1000);
