const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../group_links.txt'); // 1 link per baris

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function extractInviteLinks(text = '') {
  const regex = /https?:\/\/chat\.whatsapp\.com\/[0-9A-Za-z]+/g;
  return (String(text).match(regex) || []).map(s => s.trim());
}

function linkToCode(link = '') {
  const m = String(link).match(/chat\.whatsapp\.com\/([0-9A-Za-z]+)/);
  return m ? m[1] : null;
}

function readLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeLines(filePath, lines) {
  ensureDir(filePath);
  const out = lines.join('\n') + (lines.length ? '\n' : '');
  fs.writeFileSync(filePath, out);
}

function saveLinksNoDuplicate(links = []) {
  ensureDir(STORE_PATH);
  const existing = readLines(STORE_PATH);
  const set = new Set(existing);

  let added = 0;
  for (const link of links) {
    if (!set.has(link)) {
      set.add(link);
      added++;
    }
  }

  const finalList = [...set];
  writeLines(STORE_PATH, finalList);

  return { added, total: finalList.length };
}

// ===== Normalisasi nomor biar owner-check gak miss =====
function normalizeNumber(input = '') {
  // input bisa "62812xxxx@s.whatsapp.net" / "+62 812-xxx" / "0812xxx"
  let digits = String(input).replace(/\D/g, ''); // ambil digit doang
  if (!digits) return '';

  // buang akhiran domain kalau kebawa (biasanya gak ikut karena non-digit)
  // konversi lokal Indonesia: 08xxx -> 62xxx
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);

  return digits;
}

function getSenderNumber(m) {
  // di group: participant ada, di private: participant null
  const raw = m?.key?.participant || m?.key?.remoteJid || '';
  return normalizeNumber(raw.split('@')[0]);
}

function isOwnerNumber(senderNumber, settings) {
  const ownersRaw = settings?.ownerNumber;

  const owners = Array.isArray(ownersRaw)
    ? ownersRaw
    : (typeof ownersRaw === 'string' && ownersRaw.trim())
      ? [ownersRaw]
      : [];

  const ownerSet = new Set(owners.map(normalizeNumber).filter(Boolean));
  return ownerSet.has(normalizeNumber(senderNumber));
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function joinMany(sock, links = [], opts = {}) {
  const delayOk = opts.delayOkMs ?? 3000;
  const delayFail = opts.delayFailMs ?? 1200;
  const stopAfterFails = opts.stopAfterFails ?? 999999;
  const max = opts.max ?? 999999;

  let success = 0, failed = 0;
  const ok = [];
  const fail = [];

  const sliced = links.slice(0, max);

  for (const link of sliced) {
    const code = linkToCode(link);
    if (!code) {
      failed++;
      fail.push({ link, reason: 'invalid_link' });
      await sleep(delayFail);
      continue;
    }

    try {
      const jid = await sock.groupAcceptInvite(code);
      success++;
      ok.push({ link, jid });
      await sleep(delayOk);
    } catch (e) {
      failed++;
      fail.push({ link, reason: e?.message || String(e) });
      await sleep(delayFail);

      if (failed >= stopAfterFails) break;
    }
  }

  return { success, failed, ok, fail, total: sliced.length };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function getBodyText(m) {
  return (
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''
  );
}

function parseCommandName(ctx, body) {
  const fromCtx = String(ctx?.command || '').trim().toLowerCase();
  if (fromCtx) return fromCtx;

  // fallback ambil dari teks: ".join xxx"
  const b = String(body || '').trim();
  const m = b.match(/^[.!/#](\w+)/);
  return (m?.[1] || '').toLowerCase();
}

module.exports = {
  trigger: ['join', 'joinall', 'grouplinks', 'cleargrouplinks'],
  execute: async (sock, m, args, ctx) => {
    const remoteJid = m.key.remoteJid;
    const { settings } = ctx;

    const body = getBodyText(m);
    const commandName = parseCommandName(ctx, body);

    // sender number untuk cek owner
    const senderNumber = getSenderNumber(m);

    // ✅ kalau bukan owner: tetap balas biar gak “dianggap mati”
    if (!isOwnerNumber(senderNumber, settings)) {
      return sock.sendMessage(remoteJid, {
        text: '⛔ Command ini khusus owner/admin bot.',
      }, { quoted: m });
    }

    if (commandName === 'join') {
      const links = extractInviteLinks(body);
      if (!links.length) {
        return sock.sendMessage(remoteJid, {
          text: '⚠️ Contoh:\n.join https://chat.whatsapp.com/xxxxx\n(bisa kirim banyak link sekaligus)',
        }, { quoted: m });
      }

      const store = saveLinksNoDuplicate(links);

      const res = await joinMany(sock, links, {
        delayOkMs: 3000,
        delayFailMs: 1200,
        max: 200,
      });

      return sock.sendMessage(remoteJid, {
        text:
          `✅ JOIN SELESAI\n\n` +
          `• Total link dikirim : ${links.length}\n` +
          `• Diproses           : ${res.total}\n` +
          `• Berhasil           : ${res.success}\n` +
          `• Gagal              : ${res.failed}\n\n` +
          `📦 Disimpan: +${store.added} (Total ${store.total})`,
      }, { quoted: m });
    }

    if (commandName === 'joinall') {
      const links = readLines(STORE_PATH);
      if (!links.length) {
        return sock.sendMessage(remoteJid, { text: '⚠️ Tidak ada link tersimpan.' }, { quoted: m });
      }

      const res = await joinMany(sock, links, {
        delayOkMs: 3000,
        delayFailMs: 1200,
        max: 300,
        stopAfterFails: 50,
      });

      return sock.sendMessage(remoteJid, {
        text:
          `✅ JOINALL SELESAI\n\n` +
          `• Total tersimpan : ${links.length}\n` +
          `• Diproses        : ${res.total}\n` +
          `• Berhasil        : ${res.success}\n` +
          `• Gagal           : ${res.failed}\n\n` +
          `Catatan: join dibatasi max ${res.total} per run untuk aman.`,
      }, { quoted: m });
    }

    if (commandName === 'grouplinks') {
      const links = readLines(STORE_PATH);

      if (!links.length) {
        return sock.sendMessage(remoteJid, { text: '⚠️ Data kosong. Belum ada link tersimpan.' }, { quoted: m });
      }

      const wantFile = body.toLowerCase().includes('file');

      if (wantFile) {
        const txt = links.join('\n') + '\n';
        return sock.sendMessage(remoteJid, {
          document: Buffer.from(txt, 'utf-8'),
          fileName: 'group_links.txt',
          mimetype: 'text/plain',
          caption: `📦 Total link: ${links.length}`,
        }, { quoted: m });
      }

      const pages = chunk(links, 50);
      const maxPagesToSend = 5;
      const pagesToSend = pages.slice(0, maxPagesToSend);

      for (let i = 0; i < pagesToSend.length; i++) {
        const part = pagesToSend[i];
        const text =
          `📦 GROUP LINKS (${i + 1}/${pages.length})\n` +
          `Total: ${links.length}\n\n` +
          part.join('\n');

        await sock.sendMessage(remoteJid, { text }, { quoted: m });
        await sleep(800);
      }

      if (pages.length > maxPagesToSend) {
        await sock.sendMessage(remoteJid, {
          text: `⚠️ Link banyak banget, aku kirim ${maxPagesToSend} halaman dulu.\nKetik: .grouplinks file (biar aku kirim full via txt)`,
        }, { quoted: m });
      }
      return;
    }

    if (commandName === 'cleargrouplinks') {
      ensureDir(STORE_PATH);
      writeLines(STORE_PATH, []);
      return sock.sendMessage(remoteJid, { text: '✅ Semua link grup dihapus (store kosong).' }, { quoted: m });
    }

    return sock.sendMessage(remoteJid, {
      text: 'Command tersedia: .join, .joinall, .grouplinks, .cleargrouplinks',
    }, { quoted: m });
  }
};
