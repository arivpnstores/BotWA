const axios = require('axios');
const SERVERS = require('../servers/config_servers');
const fs = require('fs');
const path = require('path');

module.exports = {
  trigger: ['trialssh', 'buattrialssh', 'sshtrial'],
  execute: async (sock, m, args, { isOwner } = {}) => {
    const chat = m.key.remoteJid;

    const serverId = args[0];

    // hanya butuh serverId
    if (!serverId) {
      return sock.sendMessage(
        chat,
        { text: 'Format salah. Gunakan: .trialssh <server>\nContoh: .trialssh 1' },
        { quoted: m }
      );
    }

    const srv = SERVERS[String(serverId)];
    if (!srv) {
      return sock.sendMessage(
        chat,
        { text: '❌ Server yang anda pilih tidak ada. Gunakan ID sesuai daftar di servers/config_servers.js.' },
        { quoted: m }
      );
    }

    // ===== cek izin (owner server) =====
    let allowed = Boolean(isOwner);
    try {
      const ownersPath = path.join(__dirname, `../servers/owners-server${serverId}.json`);
      if (fs.existsSync(ownersPath)) {
        const ownerIds = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
        const senderNumber = (m.key.participant || m.key.remoteJid || '').split('@')[0];
        allowed = Array.isArray(ownerIds) && ownerIds.includes(senderNumber);
      }
    } catch {}

    if (!allowed) {
      return sock.sendMessage(
        chat,
        { text: '❌ Anda tidak memiliki izin untuk menggunakan server ini.' },
        { quoted: m }
      );
    }

    // ===== endpoint trial ssh =====
    const apiUrl = 'http://' + srv.domain + '/vps/trialsshvpn';

    // ===== payload trial (tanpa request exp/hari) =====
    const payload = {
      timelimit: '3h'
    };

    try {
      const res = await axios.post(apiUrl, payload, {
        headers: {
          accept: 'application/json',
          Authorization: srv.token,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const meta = res.data?.meta;
      const d = res.data?.data;

      if (!meta || meta.code !== 200 || !d) {
        const errMsg = res.data?.message || meta?.message || 'Gagal membuat akun Trial SSH';
        return sock.sendMessage(chat, { text: `❌ Respons error` }, { quoted: m });
      }

      const msg = `✅ TRIAL SSH Account Creation Success
----------------------------
SSH WS        : ${d.hostname}:80@${d.username}:${d.password}
SSH SSL       : ${d.hostname}:443@${d.username}:${d.password}
SSH UDP       : ${d.hostname}:1-65535@${d.username}:${d.password}
SSH SELOWDNS  : ${d.hostname}:5300@${d.username}:${d.password}
----------------------------
ACCOUNT DETAIL (TRIAL)
Hostname     : ${d.hostname}
Username     : ${d.username}
Password     : ${d.password}
Expiry Date  : ${d.exp || '-'}
Expiry Time  : ${d.time || '-'}
Timelimit    : 3h
----------------------------
Ports:
- TLS        : ${d.port?.tls || '-'}
- None       : ${d.port?.none || '-'}
- OVPN TCP   : ${d.port?.ovpntcp || '-'}
- OVPN UDP   : ${d.port?.ovpnudp || '-'}
- SSH        : ${d.port?.sshohp || '-'}
- UDP Custom : ${d.port?.udpcustom || '-'}
----------------------------
Payload WS   : GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]
Payload ENHANCED : PATCH / HTTP/1.1[crlf]Host: [host][crlf]Host: bug.com[crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]
----------------------------
https://${d.hostname}:81/myvpn-config.zip
----------------------------
*© WhatsApp Bots - 2026*`;

      await sock.sendMessage(chat, { text: msg }, { quoted: m });
    } catch (e) {
      const errText = e?.response?.data?.message || e?.message || 'Terjadi kesalahan saat menghubungi server';
      await sock.sendMessage(chat, { text: `❌ Gagal create Trial SSH` }, { quoted: m });
    }
  }
};
