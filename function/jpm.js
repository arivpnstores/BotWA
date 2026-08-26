const fs = require('fs');
const path = require('path');

// === KONFIGURASI PATH DATA ===
const BAN_PATH = path.join(__dirname, '../jpm/jpm_ban.json');
const DELAY_PATH = path.join(__dirname, '../jpm/jpm_delay.json');
const LOG_PATH = path.join(__dirname, '../jpm/jpm_logs.json');

const SESSIONS_JPM = {};

// === KONFIGURASI FITUR ===
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 menit
const ITEMS_PER_PAGE = 100;
const RETRY_ATTEMPTS = 2;

// === HELPER ===
function safeReadJSON(p, def) {
  try {
    if (!fs.existsSync(p)) return def;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return def;
  }
}
function safeWriteJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function loadDelay() {
  try {
    if (!fs.existsSync(DELAY_PATH)) return 2;
    const delay = Number(fs.readFileSync(DELAY_PATH, 'utf-8'));
    return isNaN(delay) ? 2 : delay;
  } catch {
    return 2;
  }
}
function saveDelay(sec) {
  fs.writeFileSync(DELAY_PATH, String(sec));
}

function loadBan() {
  return safeReadJSON(BAN_PATH, []);
}
function saveBan(arr) {
  safeWriteJSON(BAN_PATH, arr);
}

function logAction(action, details) {
  try {
    const log = { timestamp: new Date().toISOString(), action, ...details };
    const logs = safeReadJSON(LOG_PATH, []);
    logs.push(log);
    if (logs.length > 500) logs.shift();
    safeWriteJSON(LOG_PATH, logs);
  } catch (e) {
    console.error('Log Error:', e);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendWithRetry(sock, gid, pesan, maxRetries = RETRY_ATTEMPTS) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sock.sendMessage(gid, { text: pesan });
      return { success: true, attempt };
    } catch (error) {
      if (attempt === maxRetries) return { success: false, error: error.message };
      await sleep(2000);
    }
  }
}

// Helper list pagination
const sendListMenu = async (sock, remoteJid, session, title) => {
  const totalPages = Math.ceil(session.list.length / ITEMS_PER_PAGE) || 1;
  if (session.page < 1) session.page = 1;
  if (session.page > totalPages) session.page = totalPages;

  const start = (session.page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = session.list.slice(start, end);

  let text = `${title} (Hal ${session.page}/${totalPages})\n`;
  text += `Total Grup: ${session.list.length}\n\n`;

  pageItems.forEach((g, i) => {
    text += `${start + i + 1}. ${g.subject}\n`;
  });

  text += `\n══════════════════\n`;
  text += `👉 Ketik *.jpm <nomor>* untuk memilih (Contoh: .jpm 6)\n`;
  text += `👉 Ketik *.jpm y* (Next) atau *.jpm n* (Back)\n`;
  text += `👉 Ketik *.jpm cancel* untuk batal`;

  await sock.sendMessage(remoteJid, { text });
};

// === TEMPLATE DARI RAW GITHUB ===
const TEMPLATE_URL = 'https://raw.githubusercontent.com/arivpnstores/izin/refs/heads/main/list';
let cachedTemplate = null;
let cachedTemplateTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

async function fetchTemplate() {
  const now = Date.now();
  if (cachedTemplate && now - cachedTemplateTime < CACHE_TTL) return cachedTemplate;
  try {
    const res = await fetch(TEMPLATE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedTemplate = await res.text();
    cachedTemplateTime = now;
    return cachedTemplate;
  } catch (e) {
    if (cachedTemplate) return cachedTemplate;
    throw e;
  }
}

// ===============================
// COMMAND HANDLER
// ===============================

/**
 * Broadcast JPM manual (dipakai command done)
 */
async function runJpmBroadcast(sock, finalMsg) {
  const allGroups = await sock.groupFetchAllParticipating();
  const banned = loadBan();
  const delay = loadDelay();

  // dedupe target untuk jaga-jaga
  const targets = [...new Set(Object.keys(allGroups))].filter((gid) => !banned.includes(gid));

  let success = 0,
    failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const res = await sendWithRetry(sock, targets[i], finalMsg);
    res.success ? success++ : failed++;
    if (i < targets.length - 1) await sleep(delay * 1000);
  }

  return { success, failed, total: targets.length };
}


// ===============================
// COMMAND HANDLER
// ===============================
const MENU_JPM_TEXT =
  `📡 *MENU JPM*\n\n` +
  `🟢 Langsung Kirim:\n` +
  `➤ .jpmtxt <teks>\n` +
  `➤ .jpm template\n\n` +
  `Lainnya:\n` +
  `➤ .jpm delay <detik>\n` +
  `➤ .jpm ban | .jpm unban\n` +
  `➤ .jpm stats`;

module.exports = {
  trigger: ['jpm', 'jpmtxt'],

  execute: async (sock, m, args, { isOwner, settings, command }) => {
    const remoteJid = m.key.remoteJid;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Fitur ini khusus Owner Bot!' }, { quoted: m });
    }

    let subCmd = args[0] ? args[0].toLowerCase() : '';
    const inputContent = args.slice(1).join(' ');
    const now = Date.now();

    // .jpmtxt <teks> → broadcast teks saja
    if (command === 'jpmtxt') {
      const text = args.join(' ').trim();
      if (!text) {
        return sock.sendMessage(remoteJid, { text: '❌ Gunakan: *.jpmtxt <teks>*' }, { quoted: m });
      }
      await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
      const { success, failed, total } = await runJpmBroadcast(sock, text);
      logAction('JPM_DIRECT', { success, failed, total });
      return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
    }

    // .jpm template → langsung broadcast dari raw github
    if (args.length > 0 && subCmd === 'template') {
      const finalMsg = await fetchTemplate();
      await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
      const { success, failed, total } = await runJpmBroadcast(sock, finalMsg);
      logAction('JPM_TEMPLATE', { template: 'github_raw', success, failed, total });
      return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
    }

    // Menu kalau tidak ada args (.jpm saja)
    if (SESSIONS_JPM[remoteJid] && now - SESSIONS_JPM[remoteJid].createdAt > SESSION_TIMEOUT) {
      delete SESSIONS_JPM[remoteJid];
      sock.sendMessage(remoteJid, { text: '⚠️ Sesi JPM sebelumnya telah kadaluarsa.' });
    }

    // intercept pagination ban/unban
    if (
      SESSIONS_JPM[remoteJid] &&
      (SESSIONS_JPM[remoteJid].mode === 'ban_select' || SESSIONS_JPM[remoteJid].mode === 'unban_select')
    ) {
      const session = SESSIONS_JPM[remoteJid];

      if (subCmd === 'y') {
        session.page++;
        return sendListMenu(
          sock,
          remoteJid,
          session,
          session.mode === 'ban_select' ? '🚫 *LIST GRUP (BAN)*' : '⭕ *LIST GRUP (UNBAN)*'
        );
      }
      if (subCmd === 'n') {
        session.page--;
        return sendListMenu(
          sock,
          remoteJid,
          session,
          session.mode === 'ban_select' ? '🚫 *LIST GRUP (BAN)*' : '⭕ *LIST GRUP (UNBAN)*'
        );
      }

      const selection = parseInt(subCmd);
      if (!isNaN(selection)) {
        if (selection > 0 && selection <= session.list.length) {
          const selectedGroup = session.list[selection - 1];
          const banList = loadBan();

          if (session.mode === 'ban_select') {
            if (!banList.includes(selectedGroup.id)) {
              banList.push(selectedGroup.id);
              saveBan(banList);
              await sock.sendMessage(remoteJid, {
                text: `✅ Berhasil Ban Grup:\n*${selectedGroup.subject}*`,
              });
            } else {
              await sock.sendMessage(remoteJid, {
                text: `⚠️ Grup *${selectedGroup.subject}* sudah di-ban sebelumnya.`,
              });
            }
          } else {
            const newBanList = banList.filter((id) => id !== selectedGroup.id);
            saveBan(newBanList);
            await sock.sendMessage(remoteJid, {
              text: `✅ Berhasil Unban Grup:\n*${selectedGroup.subject}*`,
            });
          }

          delete SESSIONS_JPM[remoteJid];
          return;
        } else {
          return sock.sendMessage(remoteJid, {
            text: `❌ Nomor tidak valid. Masukkan angka antara 1 - ${session.list.length}.`,
          });
        }
      }
    }

    // menu
    switch (subCmd) {
      case 'start':
        if (SESSIONS_JPM[remoteJid]) return sock.sendMessage(remoteJid, { text: '⚠️ Sesi sudah aktif.' }, { quoted: m });
        SESSIONS_JPM[remoteJid] = { mode: 'jpm', lines: [], createdAt: now };
        return sock.sendMessage(
          remoteJid,
          { text: '📝 *MODE JPM AKTIF*\nGunakan: *.jpm add*, *.jpm preview*, *.jpm done*' },
          { quoted: m }
        );

      case 'send': {
        const msgText = args.slice(1).join(' ').trim();
        if (!msgText) return sock.sendMessage(remoteJid, { text: '❌ Gunakan: .jpm send <teks>' });
        await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
        const { success, failed, total } = await runJpmBroadcast(sock, msgText);
        logAction('JPM_SEND', { success, failed, total });
        return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
      }

      case 'kirim': {
        const msgText = args.slice(1).join(' ').trim();
        if (!msgText) return sock.sendMessage(remoteJid, { text: '❌ Gunakan: .jpm kirim <teks>' });
        await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
        const { success, failed, total } = await runJpmBroadcast(sock, msgText);
        logAction('JPM_KIRIM', { success, failed, total });
        return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
      }

      case '':
      case 'direct': {
        if (subCmd === 'direct' && args[1]) {
          const msgText = args.slice(1).join(' ').trim();
          await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
          const { success, failed, total } = await runJpmBroadcast(sock, msgText);
          logAction('JPM_DIRECT', { success, failed, total });
          return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
        }
        return sock.sendMessage(remoteJid, { text: MENU_JPM_TEXT }, { quoted: m });
      }

      case 'add':
        if (SESSIONS_JPM[remoteJid]?.mode !== 'jpm') return sock.sendMessage(remoteJid, { text: '❌ Tidak ada sesi JPM aktif. Ketik *.jpm start*' });
        if (!inputContent) return sock.sendMessage(remoteJid, { text: '❌ Teks kosong.' });
        SESSIONS_JPM[remoteJid].lines.push(inputContent);
        return sock.sendMessage(remoteJid, { text: `✅ Baris ditambahkan (${SESSIONS_JPM[remoteJid].lines.length} baris).` });

      case 'template':
        const tpl = await fetchTemplate();
        SESSIONS_JPM[remoteJid] = { mode: 'jpm', lines: [tpl], createdAt: now };
        return sock.sendMessage(remoteJid, { text: `✅ Template dari GitHub dipilih! Ketik *.jpm done* untuk kirim.` });

      case 'preview':
        if (!SESSIONS_JPM[remoteJid]?.lines?.length) return sock.sendMessage(remoteJid, { text: '❌ Pesan kosong.' });
        return sock.sendMessage(remoteJid, { text: `📄 *PREVIEW:*\n\n${SESSIONS_JPM[remoteJid].lines.join('\n')}` });

      case 'done': {
        if (SESSIONS_JPM[remoteJid]?.mode !== 'jpm') return sock.sendMessage(remoteJid, { text: '❌ Tidak ada sesi aktif.' });
        const finalMsg = SESSIONS_JPM[remoteJid].lines.join('\n');
        if (!finalMsg.trim()) return sock.sendMessage(remoteJid, { text: '❌ Pesan kosong.' });

        await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
        const { success, failed, total } = await runJpmBroadcast(sock, finalMsg);

        delete SESSIONS_JPM[remoteJid];
        logAction('JPM_DONE', { success, failed, total });
        return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
      }

      case 'cancel':
        delete SESSIONS_JPM[remoteJid];
        return sock.sendMessage(remoteJid, { text: '✅ Sesi dibatalkan.' });

      case 'delay': {
        const newDelay = parseInt(args[1]);
        if (isNaN(newDelay)) return sock.sendMessage(remoteJid, { text: `⏱️ Delay saat ini: ${loadDelay()}s` });
        saveDelay(newDelay);
        return sock.sendMessage(remoteJid, { text: `✅ Delay diatur: ${newDelay}s` });
      }

      // === BAN / UNBAN (pagination) ===
      case 'ban': {
        if (args[1] && args[1].endsWith('@g.us')) {
          let bList = loadBan();
          if (bList.includes(args[1])) return sock.sendMessage(remoteJid, { text: '⚠️ Grup sudah di-ban.' });
          bList.push(args[1]);
          saveBan(bList);
          return sock.sendMessage(remoteJid, { text: `✅ Sukses ban grup ID: ${args[1]}` });
        }

        const allGcs = await sock.groupFetchAllParticipating();
        const banListCurrent = loadBan();
        const availableToBan = Object.values(allGcs).filter((g) => !banListCurrent.includes(g.id));
        if (availableToBan.length === 0) return sock.sendMessage(remoteJid, { text: '✅ Semua grup sudah di-ban atau bot tidak punya grup.' });

        SESSIONS_JPM[remoteJid] = { mode: 'ban_select', list: availableToBan, page: 1, createdAt: now };
        return sendListMenu(sock, remoteJid, SESSIONS_JPM[remoteJid], '🚫 *LIST GRUP (BAN)*');
      }

      case 'unban': {
        if (args[1] && args[1].endsWith('@g.us')) {
          let bList = loadBan();
          let newList = bList.filter((id) => id !== args[1]);
          saveBan(newList);
          return sock.sendMessage(remoteJid, { text: `✅ Sukses unban grup ID: ${args[1]}` });
        }

        const bannedList = loadBan();
        if (bannedList.length === 0) return sock.sendMessage(remoteJid, { text: '✅ Tidak ada grup yang di-ban.' });

        const allGroupsData = await sock.groupFetchAllParticipating();
        const bannedGroupsData = bannedList.map((id) => ({ id, subject: allGroupsData[id]?.subject || id }));
        SESSIONS_JPM[remoteJid] = { mode: 'unban_select', list: bannedGroupsData, page: 1, createdAt: now };
        return sendListMenu(sock, remoteJid, SESSIONS_JPM[remoteJid], '⭕ *LIST GRUP (UNBAN)*');
      }

      case 'stats': {
        const gs = await sock.groupFetchAllParticipating();
        const bl = loadBan();
        return sock.sendMessage(remoteJid, {
          text:
            `📊 *STATS*\n` +
            `👥 Grup: ${Object.keys(gs).length}\n` +
            `🚫 Banned: ${bl.length}\n` +
            `⏱️ Delay: ${loadDelay()}s`,
        });
      }

      default: {
        if (subCmd === 'direct' && args[1]) {
          const msgText = args.slice(1).join(' ').trim();
          await sock.sendMessage(remoteJid, { text: '🔄 Mengirim broadcast...' });
          const { success, failed, total } = await runJpmBroadcast(sock, msgText);
          logAction('JPM_DIRECT', { success, failed, total });
          return sock.sendMessage(remoteJid, { text: `✅ *SELESAI*\n🎯 Target: ${total}\n📤 Sukses: ${success}\n❌ Gagal: ${failed}` });
        }
        if (args.length > 0) {
          return sock.sendMessage(
            remoteJid,
            {
              text:
                `❌ Perintah tidak dikenal.\n` +
                `Untuk kirim teks ke semua grup, gunakan:\n*.jpmtxt <teks>*\n\n` +
                MENU_JPM_TEXT,
            },
            { quoted: m }
          );
        }
        return sock.sendMessage(remoteJid, { text: MENU_JPM_TEXT }, { quoted: m });
      }
    }
  },
};