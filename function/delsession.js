const fs = require('fs');
const path = require('path');

module.exports = {
    trigger: 'delsession',
    execute: async (sock, m, args, { settings }) => {
        const remoteJid = m.key.remoteJid;

        await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key } });

        const sessionDir = path.join(__dirname, '../sessions');
        const preserveNames = new Set(['creds.json']);

        if (!fs.existsSync(sessionDir)) {
            await sock.sendMessage(remoteJid, { text: '⚠️ Folder session tidak ditemukan!', quoted: m });
            return;
        }

        let deletedCount = 0;
        let keptCount = 0;
        const failed = [];

        for (const name of fs.readdirSync(sessionDir)) {
            const targetPath = path.join(sessionDir, name);
            const lowerName = name.toLowerCase();

            // Jangan hapus file kredensial/credit penting.
            const isPreserved = preserveNames.has(lowerName) || lowerName.includes('cred');
            if (isPreserved) {
                keptCount++;
                continue;
            }

            try {
                fs.rmSync(targetPath, { recursive: true, force: true });
                deletedCount++;
            } catch (err) {
                failed.push(name);
            }
        }

        await sock.sendMessage(remoteJid, { 
            text:
                `✅ Session cleanup selesai.\n` +
                `🛡️ File penting dipertahankan: ${keptCount}\n` +
                `🗑️ File/folder dihapus: ${deletedCount}` +
                (failed.length ? `\n⚠️ Gagal hapus: ${failed.join(', ')}` : ''),
            quoted: m 
        });

        await sock.sendMessage(remoteJid, { react: { text: '✅', key: m.key } });
    }
};
