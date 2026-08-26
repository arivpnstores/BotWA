module.exports = {
    trigger: ['hidetag', 'ht'],
    execute: async (sock, m, args, { isOwner }) => {
        const jid = m.key.remoteJid;

        // Validasi grup
        if (!jid.endsWith('@g.us')) {
            return sock.sendMessage(jid, {
                text: '❌ Command ini hanya bisa digunakan di grup.'
            }, { quoted: m });
        }

        // Owner only (opsional, tapi aman)
        if (!isOwner) {
            return sock.sendMessage(jid, {
                text: '❌ Fitur ini khusus owner.'
            }, { quoted: m });
        }

        // Ambil teks
        const text = args.join(' ').trim();
        if (!text) {
            return sock.sendMessage(jid, {
                text: '⚠️ Contoh:\n.hidetag Halo semua'
            }, { quoted: m });
        }

        try {
            // Ambil metadata grup
            const groupMeta = await sock.groupMetadata(jid);
            const members = groupMeta.participants
                .filter(p => p.id && !p.admin) // admin tetap boleh, ini opsional
                .map(p => p.id);

            // Kirim pesan silent tag
            await sock.sendMessage(jid, {
                text: text,
                mentions: members
            });

        } catch (err) {
            console.error('[HIDETAG ERROR]', err);
            await sock.sendMessage(jid, {
                text: '❌ Gagal mengirim hidetag.'
            }, { quoted: m });
        }
    }
};
