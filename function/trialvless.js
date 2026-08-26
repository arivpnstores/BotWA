const axios = require('axios');
const SERVERS = require('../servers/config_servers');
const fs = require('fs');
const path = require('path');

module.exports = {
  trigger: ['trialvless', 'buattrialvless'],
  execute: async (sock, m, args, { isOwner } = {}) => {
    const chat = m.key.remoteJid;

    const serverId = args[0];
    if (!serverId) {
      return sock.sendMessage(chat, { text: 'Format salah. Gunakan: .trialvless <server>' }, { quoted: m });
    }

    const srv = SERVERS[String(serverId)];
    if (!srv) {
      return sock.sendMessage(
        chat,
        { text: '❌ Server yang anda pilih tidak ada. Gunakan ID sesuai daftar di servers/config_servers.js.' },
        { quoted: m }
      );
    }

    // izin owner server
    let allowed = Boolean(isOwner);
    try {
      const ownersPath = path.join(__dirname, `../servers/owners-server${serverId}.json`);
      if (fs.existsSync(ownersPath)) {
        const ownerIds = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
        const senderNumber = (m.key.participant || m.key.remoteJid || '').split('@')[0];
        allowed = Array.isArray(ownerIds) && (ownerIds.includes(senderNumber) || ownerIds.includes(m.sender));
      }
    } catch {}

    if (!allowed) {
      return sock.sendMessage(chat, { text: '❌ Anda tidak memiliki izin untuk menggunakan server ini.' }, { quoted: m });
    }

    // endpoint trial vless
    const apiUrl = 'http://' + srv.domain + '/vps/trialvlessall';

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
      const s = res.data?.data;

      if (!meta || meta.code !== 200 || !s) {
        const errMsg = res.data?.message || meta?.message || 'Gagal membuat akun TRIAL VLESS';
        return sock.sendMessage(chat, { text: `❌ Respons error` }, { quoted: m });
      }

      const msg = `✅ Vless TRIAL Account Creation Success
----------------------------
Username       : ${s.username}
Host           : ${s.hostname}
Port TLS       : ${s.port?.tls || '-'}
Port None TLS  : ${s.port?.none || '-'}
Port Any       : ${s.port?.any || '-'}
ID             : ${s.uuid || '-'}
Expiry Date    : ${s.expired || '-'}
Expiry Time    : ${s.time || '-'}
AlterId        : 0
Security       : auto
Network        : ws, grpc, upgrade
Path WS        : ${s.path?.stn || '-'} - ${s.path?.multi || '-'}
Path gRPC      : ${s.path?.grpc || '-'}
Path Upgrade   : ${s.path?.up || '-'}
----------------------------
- Link TLS     : ${s.link?.tls || '-'}
----------------------------
- Link NoTLS   : ${s.link?.none || '-'}
----------------------------
- Link gRPC    : ${s.link?.grpc || '-'}
----------------------------
- Link Upgrade TLS  : ${s.link?.uptls || '-'}
----------------------------
- Link Upgrade nTLS : ${s.link?.upntls || '-'}
----------------------------
⏱ Timelimit    : ${timelimit}
*© WhatsApp Bots - 2026*`;

      await sock.sendMessage(chat, { text: msg }, { quoted: m });
    } catch (e) {
      const errText = e?.response?.data?.message || e?.message || 'Terjadi kesalahan saat menghubungi server';
      await sock.sendMessage(chat, { text: `❌ Gagal create TRIAL VLESS` }, { quoted: m });
    }
  }
};
