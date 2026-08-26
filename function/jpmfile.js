const fs = require('fs');
const path = require('path');

// === KONFIGURASI PATH DATA (NGIKUT BAWAAN KAMU) ===
const BAN_PATH = path.join(__dirname, '../jpm/jpm_ban.json');
const DELAY_PATH = path.join(__dirname, '../jpm/jpm_delay.json');
const LOG_PATH = path.join(__dirname, '../jpm/jpm_logs.json');

// === FOLDER FILE YANG MAU DIKIRIM ===
const CONFIG_DIR = path.join(__dirname, '../config');

const RETRY_ATTEMPTS = 2;

function loadDelay() {
  try {
    if (!fs.existsSync(DELAY_PATH)) return 2;
    const delay = Number(fs.readFileSync(DELAY_PATH, 'utf-8'));
    return isNaN(delay) ? 2 : delay;
  } catch (e) {
    return 2;
  }
}

function loadBan() {
  try {
    if (!fs.existsSync(BAN_PATH)) return [];
    return JSON.parse(fs.readFileSync(BAN_PATH, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function logAction(action, details) {
  try {
    const log = { timestamp: new Date().toISOString(), action, ...details };
    const logs = fs.existsSync(LOG_PATH) ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8')) : [];
    logs.push(log);
    if (logs.length > 500) logs.shift();
    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (e) {}
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function guessMime(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'application/pdf',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    txt: 'text/plain',
    json: 'application/json',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    mp4: 'video/mp4',
    hc: 'application/octet-stream' // file .hc -> aman pakai octet-stream
  };
  return map[ext] || 'application/octet-stream';
}

async function sendDocWithRetry(sock, gid, filePath, fileName, maxRetries = RETRY_ATTEMPTS) {
  const buf = fs.readFileSync(filePath);
  const mimetype = guessMime(fileName);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sock.sendMessage(gid, {
        document: buf,
        fileName,
        mimetype
      });
      return { success: true, attempt };
    } catch (error) {
      if (attempt === maxRetries) return { success: false, error: error?.message || String(error) };
      await sleep(2000);
    }
  }
}

module.exports = {
  trigger: 'jpmfile',
  execute: async (sock, m, args, { isOwner }) => {
    const remoteJid = m.key.remoteJid;

    // 1) Validasi owner
    if (!isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Fitur ini khusus Owner Bot!' }, { quoted: m });
    }

    // 2) Respon cepat (biar gak dikira diam)
    await sock.sendMessage(remoteJid, { text: '📦 JPMFILE: mulai proses...' }, { quoted: m });

    // 3) Validasi folder config
    if (!fs.existsSync(CONFIG_DIR)) {
      return sock.sendMessage(remoteJid, { text: `❌ Folder tidak ada: ${CONFIG_DIR}` }, { quoted: m });
    }

    // 4) Ambil list file
    let files = [];
    try {
      files = fs.readdirSync(CONFIG_DIR)
        .filter(f => fs.statSync(path.join(CONFIG_DIR, f)).isFile())
        .map(f => ({
          name: f,
          full: path.join(CONFIG_DIR, f)
        }));
    } catch (e) {
      return sock.sendMessage(remoteJid, { text: `❌ Gagal baca folder config: ${e?.message || e}` }, { quoted: m });
    }

    if (files.length === 0) {
      return sock.sendMessage(remoteJid, { text: '❌ Tidak ada file di folder config.' }, { quoted: m });
    }

    // 5) Fetch grup
    let allGroups;
    try {
      allGroups = await sock.groupFetchAllParticipating();
    } catch (e) {
      return sock.sendMessage(remoteJid, { text: `❌ Gagal ambil list grup: ${e?.message || e}` }, { quoted: m });
    }

    const banned = loadBan();
    //const delay = loadDelay();
    const delay = 1;
    const targets = Object.keys(allGroups).filter(gid => !banned.includes(gid));

    await sock.sendMessage(remoteJid, {
      text:
        `📦 JPMFILE DIMULAI\n` +
        `📁 File: ${files.length}\n` +
        `👥 Grup target: ${targets.length}\n` +
        `⏱ Delay: ${delay}s\n` +
        `🗂 Folder: /config`
    }, { quoted: m });

    // 6) Kirim
    let sent = 0, failed = 0;
    let failedList = [];

    for (let gi = 0; gi < targets.length; gi++) {
      const gid = targets[gi];

      for (let fi = 0; fi < files.length; fi++) {
        const f = files[fi];

        const res = await sendDocWithRetry(sock, gid, f.full, f.name);
        if (res.success) {
          sent++;
        } else {
          failed++;
          failedList.push({ gid, file: f.name, err: res.error });
        }

        // delay antar kirim file
        if (delay > 0) await sleep(delay * 1000);
      }
    }

    logAction('JPMFILE_DONE', {
      groups: targets.length,
      files: files.length,
      sent,
      failed
    });

    // 7) Ringkasan + tampilkan contoh error (biar gak "ga respon")
    const errPreview = failedList.slice(0, 3)
      .map(x => `- ${x.file} -> ${x.gid}\n  ${x.err}`)
      .join('\n');

    return sock.sendMessage(remoteJid, {
      text:
        `✅ JPMFILE SELESAI\n` +
        `📤 Terkirim: ${sent}\n` +
        `❌ Gagal: ${failed}` +
        (failedList.length ? `\n\n⚠️ Contoh error:\n${errPreview}` : '')
    }, { quoted: m });
  }
};
