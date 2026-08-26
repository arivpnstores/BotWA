const axios = require('axios');
const SERVERS = require('../servers/config_servers');
const fs = require('fs');
const path = require('path');

module.exports = {
  trigger: ['addvless', 'buatvless'],
  execute: async (sock, m, args, { isOwner }) => {
    const chat = m.key.remoteJid;

    const serverId = args[0];
    const username = args[1];
    const days = parseInt(args[2], 10);

    if (!serverId || !username || isNaN(days)) {
      return sock.sendMessage(
        chat,
        { text: 'Format salah.\nGunakan: .addvless <server> <username> <jumlah_hari>\nContoh: .addvless 1 uservless 30' },
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

    let allowed = isOwner;
    try {
      const ownersPath = path.join(__dirname, `../servers/owners-server${serverId}.json`);
      if (fs.existsSync(ownersPath)) {
        const ownerIds = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
        const senderNumber = (m.key.participant || m.key.remoteJid || '').split('@')[0];
        allowed = Array.isArray(ownerIds) && ownerIds.includes(senderNumber);
      }
    } catch {}

    if (!allowed) {
      return sock.sendMessage(chat, { text: '❌ Anda tidak memiliki izin untuk menggunakan server ini.' }, { quoted: m });
    }

    const apiUrl = `http://${srv.domain}/vps/vlessall`;

    // ✅ password DIHAPUS
    const payload = {
      username: username,
      expired: days,
      kuota: srv.kuota,
      limitip: srv.limitip
    };

    try {
      const res = await axios.post(apiUrl, payload, {
        headers: { accept: 'application/json', Authorization: srv.token, 'Content-Type': 'application/json' },
        timeout: 15000
      });

      const meta = res.data?.meta;
      const d = res.data?.data;

      if (!meta || meta.code !== 200 || !d) {
        const errMsg = res.data?.message || meta?.message || 'Gagal membuat akun VLESS';
        return sock.sendMessage(chat, { text: `❌ Respons error` }, { quoted: m });
      }

      // ✅ FIX: pakai d (bukan s)
      const msg = `Vless Account Creation Success
----------------------------
Username       : ${d.username}
Host           : ${d.hostname}
Port TLS       : ${d.port?.tls || '-'}
Port None TLS  : ${d.port?.none || '-'}
Port Any       : ${d.port?.any || '-'}
ID             : ${d.uuid}
Expiry Date    : ${d.expired || d.exp || '-'}
Expiry Time    : ${d.time || '-'}
AlterId        : 0
Security       : auto
Network        : ws, grpc, upgrade
Path WS        : ${d.path?.stn || '-'} - ${d.path?.multi || '-'}
Path gRPC      : ${d.path?.grpc || '-'}
Path Upgrade   : ${d.path?.up || '-'}
----------------------------
- Link TLS     : ${d.link?.tls || '-'}
----------------------------
- Link NoTLS   : ${d.link?.none || '-'}
----------------------------
- Link gRPC    : ${d.link?.grpc || '-'}
----------------------------
- Link Upgrade TLS  : ${d.link?.uptls || '-'}
----------------------------
- Link Upgrade nTLS : ${d.link?.upntls || '-'}
----------------------------
*© WhatsApp Bots - 2026*`;

      await sock.sendMessage(chat, { text: msg }, { quoted: m });
    } catch (e) {
      const errText = e?.response?.data?.message || e?.response?.data?.meta?.message || e?.message || 'Terjadi kesalahan saat menghubungi server';
      await sock.sendMessage(chat, { text: `❌ Gagal create VLESS` }, { quoted: m });
    }
  }
};
