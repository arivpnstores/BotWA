/**
 * SCRIPT BY PT RAJA SERVER PREMIUM
 * TELE SAYA: t.me/ARI_VPN_STORE
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const cfonts = require('cfonts');
const qrcode = require('qrcode');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const __sendQueues = new Map();
const __lastSent = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ===== AUTO REPOST CONFIG =====
const TARGET_STATUS = [
  '85912247636205@lid', // ini yang BENAR dari log kamu
];

const sentStatusFile = path.join(__dirname, 'sentStatus.json');
let sentStatus = new Set();

// load
if (fs.existsSync(sentStatusFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(sentStatusFile));
    sentStatus = new Set(data);
  } catch {}
}

const saveSentStatus = () => {
  try {
    fs.writeFileSync(sentStatusFile, JSON.stringify([...sentStatus]));
  } catch {}
};

async function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(res => setTimeout(res, ms));
}

function patchSendMessage(sock) {
  const original = sock.sendMessage.bind(sock);

  sock.sendMessage = async (chatId, content, options = {}) => {
    const text = content?.text || '';

    const keyMap = {
      'Format respon server tidak valid': 'invalid_resp',
      'tunggu 5 menit': 'rate_limit'
    };

    for (const k in keyMap) {
      if (text.includes(k)) {
        const last = __lastSent.get(chatId + keyMap[k]) || 0;
        if (Date.now() - last < 60_000) return;
        __lastSent.set(chatId + keyMap[k], Date.now());
        break;
      }
    }

    const prev = __sendQueues.get(chatId) || Promise.resolve();
    const next = prev
      .then(async () => {
        await sleep(700 + rand(0, 800));
        return original(chatId, content, options);
      })
      .catch((err) => {
        console.error('[SENDMSG ERR]', chatId, err?.message || err);
      });
    __sendQueues.set(chatId, next);
    return next;
  };
}

const storePath = path.join(__dirname, 'baileys_store.json');
let contacts = {};
try {
  if (fs.existsSync(storePath)) contacts = JSON.parse(fs.readFileSync(storePath));
} catch (e) {}

const saveContacts = () => {
  try {
    fs.writeFileSync(storePath, JSON.stringify(contacts, null, 2));
  } catch (e) {}
};

const functionsDir = path.join(__dirname, 'function');
const settingsPath = path.join(__dirname, 'settings.json');
const sessionDir = path.join(__dirname, 'sessions');
const welcomePath = path.join(__dirname, 'welcome_data.json');
const START_TIME = Math.floor(Date.now() / 1000);

let settings = {};

const color = (text, code) => `\x1b[${code}m${text}\x1b[0m`;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const question = (text) =>
  new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(text, (ans) => {
      rl.close();
      res(ans);
    });
  });

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const d = jidDecode(jid) || {};
    return (d.user && d.server && `${d.user}@${d.server}`) || jid;
  }
  return jid;
};

const __groupMetaCache = new Map();
async function getGroupMetaCached(sock, groupJid, ttlMs = 60_000) {
  const now = Date.now();
  const prev = __groupMetaCache.get(groupJid);
  if (prev && now - prev.at < ttlMs) return prev.meta;

  const meta = await sock.groupMetadata(groupJid);
  __groupMetaCache.set(groupJid, { meta, at: now });
  return meta;
}
function isBotAdminFromMeta(meta, botJid) {
  const bot = meta?.participants?.find((p) => decodeJid(p.id) === decodeJid(botJid));
  return bot?.admin === 'admin' || bot?.admin === 'superadmin';
}

const loadSettings = () => {
  const fallback = {
    ownerNumber: [],
    mode: 'public',
    botName: 'Bot',
    antiCall: false,
    antiLink: false,
    autoJoin: false,
    autoRead: { enabled: false, scope: 'all', ignoreOwner: true, delayMs: [500, 1500] },
    autoReadSw: false,
    prefix: '/'
  };

  if (!fs.existsSync(settingsPath)) {
    settings = fallback;
    ensureDir(settingsPath);
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(color('[SYS] settings.json tidak ada, dibuat otomatis.', '90'));
    return;
  }

  try {
    settings = JSON.parse(fs.readFileSync(settingsPath));
  } catch (e) {
    settings = fallback;
    return;
  }

  if (typeof settings.ownerNumber === 'string') settings.ownerNumber = [settings.ownerNumber];
  settings.ownerNumber = Array.isArray(settings.ownerNumber) ? settings.ownerNumber : fallback.ownerNumber;
   settings.mode ??= fallback.mode;
  settings.botName ??= fallback.botName;
  settings.antiCall ??= fallback.antiCall;
  settings.antiLink ??= fallback.antiLink;
  settings.autoJoin ??= fallback.autoJoin;
  settings.autoReadSw ??= fallback.autoReadSw;

  settings.autoRead ??= fallback.autoRead;
  settings.autoRead.enabled ??= fallback.autoRead.enabled;
  settings.autoRead.scope ??= fallback.autoRead.scope;
  settings.autoRead.ignoreOwner ??= fallback.autoRead.ignoreOwner;
  settings.autoRead.delayMs ??= fallback.autoRead.delayMs;
  settings.prefix ??= fallback.prefix;
};

const saveSettings = () => {
  try {
    ensureDir(settingsPath);
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (e) {}
};

const commands = new Map();
const loadCommands = () => {
  commands.clear();
  if (!fs.existsSync(functionsDir)) fs.mkdirSync(functionsDir);
  const files = fs.readdirSync(functionsDir).filter((f) => f.endsWith('.js')).sort();
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(functionsDir, file))];
      const cmd = require(path.join(functionsDir, file));
      if (cmd.trigger && cmd.execute) {
        Array.isArray(cmd.trigger)
          ? cmd.trigger.forEach((t) => commands.set(t, cmd))
          : commands.set(cmd.trigger, cmd);
      }
    } catch (e) {
      console.error('[CMD ERR]', file, e?.message || e);
    }
  }
  console.log(`[SYS] Loaded ${commands.size} commands`);
};

const logger = {
  level: 'silent',
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => logger
};

async function startMenu() {
  console.clear();
  const colors = ['green', 'blue', 'magenta', 'cyan'];
  cfonts.say('ARI BOT', {
    font: 'block',
    align: 'center',
    gradient: [pickRandom(colors), pickRandom(colors)]
  });

  const credsPath = path.join(sessionDir, 'creds.json');
  if (fs.existsSync(credsPath)) {
    console.log(color('\n[SYS] Session ditemukan → Auto Continue ✅\n', '32'));
    connectToWhatsApp(false);
    return;
  }

  console.log(color('\n[1] Connect With Pairing Code', '33'));
  console.log(color('[2] Connect With QR Code', '33'));
  const method = await question(color('Pilih metode [1/2]: ', '36'));
  connectToWhatsApp(method.trim() === '1');
}

async function connectToWhatsApp(usePairingCode = false) {
  loadSettings();
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  loadCommands();

  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    version,
    printQRInTerminal: false,
    logger,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: true,
    syncFullHistory: true
  });

   patchSendMessage(sock);

   if (usePairingCode && !sock.authState.creds.registered) {
    const phoneNumber = await question(color('\nMasukkan Nomor Bot (e.g 628xxx): ', '32'));
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(color(`\nPairing Code: ${code}\n`, '33'));
  }

  sock.ev.on('contacts.upsert', (update) => {
    for (let c of update) {
      let id = decodeJid(c.id);
      contacts[id] ? Object.assign(contacts[id], c) : (contacts[id] = c);
    }
    saveContacts();
  });
  sock.ev.on('contacts.update', (update) => {
    for (let c of update) {
      let id = decodeJid(c.id);
      if (contacts[id]) Object.assign(contacts[id], c);
    }
    saveContacts();
  });

  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    if (action !== 'add') return;
    try {
      let welcomeData = [];
      if (fs.existsSync(welcomePath)) welcomeData = JSON.parse(fs.readFileSync(welcomePath));
      const groupIds = Array.isArray(welcomeData) ? welcomeData : (welcomeData.groups || []);
      if (groupIds.includes(id)) {
        const customText = !Array.isArray(welcomeData) ? welcomeData.welcomeText : null;
        for (const p of participants) {
          const text = customText
            ? customText.replace(/@user/g, `@${p.split('@')[0]}`)
            : `🎉 Selamat datang @${p.split('@')[0]} di ${settings.botName}!\n\n🚫 Wajib baca rules dulu\n🤔 Butuh bantuan? Tanya di chat`;
          await sock.sendMessage(id, { text, mentions: [p] });
        }
      }
    } catch {}
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !usePairingCode) {
      console.log(color('\n[SYS] Scan QR Code di bawah ini:', '36'));
      qrcode.toString(qr, { type: 'terminal', small: true }, (err, url) => {
        if (!err) console.log(url);
      });
    }
    if (connection === 'close') {
      const reconnect =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;
      console.log(color('[SYS] Connection closed, reconnecting...', '31'));
      if (reconnect) connectToWhatsApp(usePairingCode);
    } else if (connection === 'open') {
      console.log(color('[SYS] Bot Connected ✅', '32'));
    }
  });

  sock.ev.on('creds.update', saveCreds);

  if (settings.antiCall) {
    sock.ev.on('call', async (call) => {
      try {
        for (const c of call) {
          if (c.status !== 'offer') continue;
          const num = decodeJid(c.from).split('@')[0];
          if (settings.ownerNumber.includes(num)) continue;
          await sock.rejectCall(c.id, c.from);
          await sock.sendMessage(c.from, { text: '❌ Chat only ya.' });
        }
      } catch {}
    });
  }

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages[0];
    if (!m?.message) return;

    let ts = m.messageTimestamp;
    if (typeof ts === 'object' && ts !== null) ts = ts.low || ts.toNumber?.() || parseInt(ts);
    if (ts < START_TIME) return;

    const remoteJid = m.key.remoteJid;

    // ================= AUTO REPOST FIX CLEAN =================
const isStatus = remoteJid === 'status@broadcast';

if (isStatus && settings.autoReadSw) {
  try {
    await sock.readMessages([m.key]);
  } catch {}
}

 if (isStatus) {
  let sender = decodeJid(m.key.participant || '');

  const fromBot = m.key.fromMe || sender === decodeJid(sock.user.id);
  if (fromBot) return;

  if (!TARGET_STATUS.includes(sender)) return;

  let content = m.message;
  if (content?.viewOnceMessage) content = content.viewOnceMessage.message;

  const text =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    '';

  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
  const uniqueId = sender + '-' + hash;

  if (sentStatus.has(uniqueId)) return;
  sentStatus.add(uniqueId);
  saveSentStatus();

  console.log('[AUTO REPOST] Status dari:', sender);

  const allContacts = Object.keys(contacts).filter(j => j.endsWith('@s.whatsapp.net'));
  console.log('[DEBUG] Total viewer:', allContacts.length);

  const chunkSize = 300;

  const sendWithBatch = async (msg) => {
    for (let i = 0; i < allContacts.length; i += chunkSize) {
      const chunk = allContacts.slice(i, i + chunkSize);
      console.log(`[SEND] Batch ${i} → ${chunk.length}`);
      await sock.sendMessage('status@broadcast', msg, {
        statusJidList: chunk
      });
      await sleep(1500);
    }
  };

  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

  if (content.conversation || content.extendedTextMessage) {
    await sendWithBatch({ text });
  } else if (content.imageMessage) {
    const stream = await downloadContentFromMessage(content.imageMessage, 'image');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    await sendWithBatch({ image: buffer, caption: text });
  } else if (content.videoMessage) {
    const stream = await downloadContentFromMessage(content.videoMessage, 'video');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    await sendWithBatch({ video: buffer, caption: text });
  }

  console.log('[AUTO REPOST] ✔ STATUS NAIK');
  return;
}
// ========================================================
    
    const isGroup = remoteJid?.endsWith('@g.us');

    const rawJid = m.key.fromMe ? sock.user.id : m.key.participant || remoteJid;
    const senderJid = decodeJid(rawJid);
    const senderNumber = senderJid.split('@')[0];
    const isOwner = settings.ownerNumber.includes(senderNumber) || m.key.fromMe;

    // Jika mode self aktif, hanya owner/admin yang boleh memakai bot.
    if (settings.mode === 'self' && !isOwner) return;

    const msgType = Object.keys(m.message)[0];
    const body =
      msgType === 'conversation'
        ? m.message.conversation
        : msgType === 'extendedTextMessage'
        ? m.message.extendedTextMessage.text
        : msgType === 'imageMessage'
        ? m.message.imageMessage.caption
        : msgType === 'videoMessage'
        ? m.message.videoMessage.caption
        : '';

    const pushName = m.pushName || 'Unknown';
    const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(color('\n=========================================', '90'));
    console.log(color(`TIME    : ${time}`, '90'));
    console.log(color('NAME    : ', '32') + pushName + (isOwner ? color(' [OWNER]', '33') : ''));
    console.log(color('NUMBER  : ', '33') + senderNumber);
    console.log(color('MESSAGE : ', '36') + (body || color('[Media/Other]', '31')));
    console.log(color('=========================================', '90'));

    if (settings.antiLink && isGroup && body) {
        const linkRegex = /chat\.whatsapp\.com|https?:\/\//i
        if (linkRegex.test(body)) {
            try {
                const meta = await getGroupMetaCached(sock, remoteJid)
                if (!isBotAdminFromMeta(meta, decodeJid(sock.user.id))) {
                    await sock.sendMessage(remoteJid, { text: '⚠️ Bot harus jadi admin grup untuk aktifkan anti-link!' })
                } else {
                    const sender = meta.participants.find(p => decodeJid(p.id) === senderJid)
                    const isAdmin = sender?.admin === 'admin' || sender?.admin === 'superadmin'
                    if (!isOwner && !isAdmin) {
                        await sock.sendMessage(remoteJid, { delete: m.key })
                    }
                }
            } catch {}
        }
    }

    const GROUP_BLACKLIST_KEYWORDS = [
      'jb',
    ];

    if (settings.autoJoin && body && (isOwner || m.key.fromMe)) {
      const regex = /https?:\/\/chat\.whatsapp\.com\/([0-9A-Za-z]+)/g;
      const matches = [...body.matchAll(regex)];

      for (const mm of matches) {
        const inviteCode = mm[1];
        try {
          const jid = await sock.groupAcceptInvite(inviteCode);
          console.log('[AUTO JOIN] OK:', inviteCode);

          const meta = await sock.groupMetadata(jid);
          const groupName = (meta.subject || '').toLowerCase();

          const isBlocked = GROUP_BLACKLIST_KEYWORDS.some((k) => groupName.includes(k));
          if (isBlocked) {
            console.log('[BLACKLIST] LEAVE GROUP:', meta.subject);
            await sock.groupLeave(jid);
          }

          await new Promise((r) => setTimeout(r, 3000));
        } catch {
          console.log('[AUTO JOIN] FAIL:', inviteCode);
        }
      }
    }

    try {
      const ar = settings.autoRead;
      if (ar?.enabled) {
        const isStatus = remoteJid === 'status@broadcast';
        if (!isStatus) {
          if ((ar.scope === 'group' && !isGroup) || (ar.scope === 'private' && isGroup)) {
          } else if (!(ar.ignoreOwner && isOwner)) {
            const min = ar.delayMs?.[0] ?? 500;
            const max = ar.delayMs?.[1] ?? 1500;
            await sleep(rand(Math.min(min, max), Math.max(min, max)));
            await sock.readMessages([m.key]);
          }
        }
      }
    } catch {}

    const prefix = settings.prefix || '/';
    const prefixRegex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const hasPrefix = prefixRegex.test(body);

    // ===== AUTORESPONDER =====
    if (body && !hasPrefix && !m.key.fromMe && !isGroup) {
      try {
        const arPath = path.join(__dirname, 'autoresponder.json');
        if (fs.existsSync(arPath)) {
          const arData = JSON.parse(fs.readFileSync(arPath, 'utf-8'));
          if (arData.text) {
            await delay(10000);
            await sock.sendMessage(remoteJid, { text: arData.text });
          }
        }
      } catch {}
    }
    // ==========================

    if (!body) return;

    if (!hasPrefix) return;

    const cmdName = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();
    const args = body.trim().split(/ +/).slice(1);

    if (commands.has(cmdName)) {
      try {
        await commands
          .get(cmdName)
          .execute(sock, m, args, { settings, saveSettings, isOwner, store: contacts, command: cmdName, allCommands: commands });
      } catch (e) {
        console.error(`[ERR CMD] ${cmdName}:`, e?.message || e);
      }
    }
  });
}

startMenu();
