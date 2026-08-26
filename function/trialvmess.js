const axios = require('axios');
const SERVERS = require('../servers/config_servers');
const fs = require('fs');
const path = require('path');

module.exports = {
  trigger: ['trialvmess', 'buattrialvmess', 'vmesstrial'],
  execute: async (sock, m, args, { isOwner } = {}) => {
    const chat = m.key.remoteJid;

    const serverId = args[0];

    // hanya butuh serverId
    if (!serverId) {
      return sock.sendMessage(
        chat,
        { text: 'Format salah. Gunakan: .trialvmess <server>\nContoh: .trialvmess 1' },
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

    // ===== cek izin owner server =====
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

    // ===== endpoint trial vmess =====
    const apiUrl = 'http://' + srv.domain + '/vps/trialvmessall';

    // ===== payload tanpa request exp/hari =====
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
        const errMsg = res.data?.message || meta?.message || 'Gagal membuat akun TRIAL VMESS';
        return sock.sendMessage(chat, { text: `❌ Respons error` }, { quoted: m });
      }

      const msg = `✅ TRIAL VMess Account Creation Success
----------------------------
Username       : ${d.username}
Host           : ${d.hostname}
Port TLS       : ${d.port?.tls ?? '-'}
Port None TLS  : ${d.port?.none ?? '-'}
Port Any       : ${d.port?.any ?? '-'}
ID             : ${d.uuid ?? '-'}
Expiry Date    : ${d.expired ?? d.exp ?? '-'}
Expiry Time    : ${d.time ?? '-'}
Timelimit      : 3h
AlterId        : 0
Security       : auto
Network        : ws, grpc, upgrade
Path WS        : ${d.path?.stn ?? '-'} - ${d.path?.multi ?? '-'}
Path gRPC      : ${d.path?.grpc ?? '-'}
Path Upgrade   : ${d.path?.up ?? '-'}
----------------------------
- Link TLS     : ${d.link?.tls ?? '-'}
----------------------------
- Link NoTLS   : ${d.link?.none ?? '-'}
----------------------------
- Link gRPC    : ${d.link?.grpc ?? '-'}
----------------------------
- Link Upgrade TLS  : ${d.link?.uptls ?? '-'}
----------------------------
- Link Upgrade nTLS : ${d.link?.upntls ?? '-'}
----------------------------
*© WhatsApp Bots - 2026*`;

      await sock.sendMessage(chat, { text: msg }, { quoted: m });
    } catch (e) {
      const errText = e?.response?.data?.message || e?.message || 'Terjadi kesalahan saat menghubungi server';
      await sock.sendMessage(chat, { text: `❌ Gagal create TRIAL VMESS` }, { quoted: m });
    }
  }
};
