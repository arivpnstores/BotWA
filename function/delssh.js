const { exec } = require('child_process');
const SERVERS = require('../servers/config_servers');

module.exports = {
  trigger: ['deletessh', 'delssh'],
  execute: async (sock, m, args, { isOwner } = {}) => {
    const chat = m.key.remoteJid;

    try {
      if (m.isGroup) {
        return sock.sendMessage(chat, { text: '❌ Hanya bisa di private chat' }, { quoted: m });
      }

      // format: .deletessh <serverId> <username>
      const serverId = args[0];
      const username = args[1];

      if (!serverId || !username) {
        return sock.sendMessage(
          chat,
          {
            text:
              'Format salah.\n' +
              'Gunakan: .deletessh <serverId> <username>\n' +
              'Contoh: .deletessh 1 arif78'
          },
          { quoted: m }
        );
      }

      const srv = SERVERS[String(serverId)];
      if (!srv) {
        return sock.sendMessage(chat, { text: '❌ Server tidak ditemukan' }, { quoted: m });
      }

      if (!isOwner) {
        return sock.sendMessage(chat, { text: '❌ Fitur ini khusus admin/owner.' }, { quoted: m });
      }

      const web_URL = `http://${srv.domain}/vps/deletesshvpn`;
      const AUTH_TOKEN = srv.token;

      const curlCommand = `curl -sS -X DELETE "${web_URL}/${username}" \
-H "accept: application/json" \
-H "Authorization: ${AUTH_TOKEN}"`;

      exec(curlCommand, async (err, stdout) => {
        if (err || !stdout) {
          console.log('[DELETE SSH CURL ERROR]', err?.message);
          return sock.sendMessage(chat, { text: '❌ Gagal menghubungi server' }, { quoted: m });
        }

        let d;
        try {
          d = JSON.parse(stdout);
        } catch (e) {
          console.log('[DELETE SSH PARSE ERROR]', stdout);
          return sock.sendMessage(chat, { text: '❌ Respon server tidak valid' }, { quoted: m });
        }

        if (d.meta?.code !== 200 && d.status !== 'success') {
          return sock.sendMessage(
            chat,
            { text: `❌ ${d.message || d.meta?.message || 'Gagal delete SSH'}` },
            { quoted: m }
          );
        }

        const msg = `Delete SSH Account Success
----------------------------
Username : ${username}
Server   : ${srv.domain}
----------------------------
*© WhatsApp Bots - 2026*`;

        return sock.sendMessage(chat, { text: msg }, { quoted: m });
      });
    } catch (e) {
      console.log('[DELETE SSH ERROR]', e.message);
      return sock.sendMessage(chat, { text: '❌ Terjadi kesalahan saat delete SSH' }, { quoted: m });
    }
  },
};
