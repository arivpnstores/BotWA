const { exec } = require('child_process');
const SERVERS = require('../servers/config_servers');
const fs = require('fs');
const path = require('path');

function runCurl(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err || !stdout) return reject(err || new Error(stderr || 'No output'));
      resolve(stdout);
    });
  });
}

module.exports = {
  trigger: ['fixssh', 'resetssh', 'repairssh'],
  execute: async (sock, m, args, { isOwner } = {}) => {
    const chat = m.key.remoteJid;

    const serverId = args[0];
    const username = args[1];

    if (!serverId || !username) {
      return sock.sendMessage(
        chat,
        { text: 'Format salah.\nGunakan: .fixssh <server> <username>\nContoh: .fixssh 1 arif78' },
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

    // ===== CEK IZIN OWNER SERVER =====
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

    // ===== ENDPOINT FIXSSH (LOCK -> UNLOCK) =====
    // mengikuti contoh bot lama:
    // LOCK  : PATCH /vps/locksshvpn/{username}
    // UNLOCK: PATCH /vps/unlocksshvpn/{username}/pw
    const lockUrl = `https://${srv.domain}/vps/locksshvpn/${encodeURIComponent(username)}`;
    const unlockUrl = `https://${srv.domain}/vps/unlocksshvpn/${encodeURIComponent(username)}/pw`;

    const lockCmd = `curl -sS -X PATCH "${lockUrl}" -H "accept: application/json" -H "Authorization: Bearer ${srv.token}"`;
    const unlockCmd = `curl -sS -X PATCH "${unlockUrl}" -H "accept: application/json" -H "Authorization: Bearer ${srv.token}"`;

    // info awal biar user tahu lagi proses
    await sock.sendMessage(
      chat,
      { text: `🔧 Fix SSH: *${username}*\nServer: *${serverId}*\n⏳ Proses: LOCK → UNLOCK...` },
      { quoted: m }
    );

    try {
      // ===== STEP 1: LOCK =====
      const lockOut = await runCurl(lockCmd);
      let lockJson;
      try {
        lockJson = JSON.parse(lockOut);
      } catch (e) {
        console.error('❌ LOCK JSON PARSE ERROR:', e.message);
        console.error('🪵 LOCK OUTPUT:', lockOut);
        return sock.sendMessage(chat, { text: '❌ Format respon LOCK tidak valid.' }, { quoted: m });
      }

      if (lockJson?.meta?.code !== 200 || !lockJson?.data) {
        const errMsg = lockJson?.message || lockJson?.meta?.message || JSON.stringify(lockJson, null, 2);
        return sock.sendMessage(chat, { text: `❌ Gagal LOCK SSH` }, { quoted: m });
      }

      // jeda sedikit biar server sempat apply (optional)
      await new Promise((r) => setTimeout(r, 800));

      // ===== STEP 2: UNLOCK =====
      const unlockOut = await runCurl(unlockCmd);
      let unlockJson;
      try {
        unlockJson = JSON.parse(unlockOut);
      } catch (e) {
        console.error('❌ UNLOCK JSON PARSE ERROR:', e.message);
        console.error('🪵 UNLOCK OUTPUT:', unlockOut);
        return sock.sendMessage(chat, { text: '❌ Format respon UNLOCK tidak valid.' }, { quoted: m });
      }

      if (unlockJson?.meta?.code !== 200 || !unlockJson?.data) {
        const errMsg = unlockJson?.message || unlockJson?.meta?.message || JSON.stringify(unlockJson, null, 2);
        return sock.sendMessage(chat, { text: `❌ LOCK berhasil, tapi UNLOCK gagal` }, { quoted: m });
      }

      const s1 = lockJson.data;
      const s2 = unlockJson.data;

      const msg = `✅ FIX SSH SUCCESS (LOCK → UNLOCK)
----------------------------
Username     : ${s2?.username || s1?.username || username}
Server ID    : ${serverId}
Status       : UNLOCKED
----------------------------
*© WhatsApp Bots - 2026*`;

      await sock.sendMessage(chat, { text: msg }, { quoted: m });
    } catch (e) {
      console.error('❌ FIXSSH ERROR:', e?.message || e);
      await sock.sendMessage(
        chat,
        { text: `❌ Gagal proses FIX SSH: 'Terjadi kesalahan saat menghubungi server'}` },
        { quoted: m }
      );
    }
  }
};
