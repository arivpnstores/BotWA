const { exec } = require('child_process');

module.exports = {
  trigger: ['poweroff', 'shutdown'],
  execute: async (sock, m, args, { settings, isOwner }) => {
    const chat = m.key.remoteJid;

    if (!isOwner) {
      return sock.sendMessage(chat, {
        text: '❌ Perintah ini khusus OWNER.'
      }, { quoted: m });
    }

    // react ⏳
    await sock.sendMessage(chat, {
      react: { text: '⏳', key: m.key }
    });

    await sock.sendMessage(chat, {
      text:
        `⛔ *${settings.botName}*\n\n` +
        `Sistem akan DIMATIKAN sekarang.\n` +
        `PM2 akan dihentikan, jika gagal akan FORCE KILL.`,
      quoted: m
    });

    setTimeout(() => {
      console.log('[SYS] POWER OFF INIT');

      // 1️⃣ COBA PM2 STOP ALL
      exec('pm2 stop all', (err, stdout, stderr) => {
        if (!err) {
          console.log('[SYS] PM2 STOP ALL SUCCESS');
          process.exit(0); // aman, PM2 sudah stop
          return;
        }

        // 2️⃣ FALLBACK: FORCE KILL
        console.error('[SYS] PM2 STOP FAILED, FORCE KILL');
        console.error(err.message);

        try {
          // SIGTERM dulu (soft kill)
          process.kill(process.pid, 'SIGTERM');

          // HARD KILL kalau masih hidup
          setTimeout(() => {
            try {
              process.kill(process.pid, 'SIGKILL');
            } catch {}
          }, 1000);
        } catch (e) {
          console.error('[SYS] KILL ERROR', e.message);
          process.exit(1);
        }
      });

    }, 1500);
  }
};
