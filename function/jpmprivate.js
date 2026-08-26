module.exports = {
    trigger: 'jpmprivate',
    execute: async (sock, m, args, { isOwner, settings }) => {
        const remoteJid = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(remoteJid, { text: '❌ Fitur ini khusus Owner Bot!' });
        }

        if (!remoteJid.endsWith('@g.us')) {
            return sock.sendMessage(remoteJid, { text: '❌ Command ini hanya bisa digunakan di grup!' });
        }

        const text = args.join(' ').trim();
        if (!text) {
            return sock.sendMessage(remoteJid, { text: '⚠️ Contoh:\n.jpmprivate Promo VPN Premium Bulanan, hubungi admin untuk pembelian.' });
        }

        const groupMeta = await sock.groupMetadata(remoteJid);
        const allParticipants = groupMeta.participants || [];

        const botNumber = (sock.user.id || '').split(':')[0].split('@')[0];
        const ownerNumbers = (settings.ownerNumber || []).map(n => n.replace(/\D/g, ''));

        const seen = new Set();
        const targets = [];

        for (const p of allParticipants) {
            const jid = p.id || p;
            const num = jid.split('@')[0].replace(/\D/g, '');
            if (seen.has(num)) continue;
            seen.add(num);
            if (num === botNumber) continue;
            if (ownerNumbers.includes(num)) continue;
            targets.push(jid);
        }

        if (targets.length === 0) {
            return sock.sendMessage(remoteJid, { text: '❌ Tidak ada target yang bisa dikirimi pesan.' });
        }

        const total = targets.length;
        const delay = 3;

        await sock.sendMessage(remoteJid, {
            text: `🚀 *JPM Private Dimulai...*\n📦 Target: ${total} Nomor\n⏳ Delay: ${delay} Detik/Nomor`
        });

        let success = 0;
        let failed = 0;

        for (let i = 0; i < targets.length; i++) {
            const jid = targets[i];
            const num = i + 1;

            try {
                await sock.sendMessage(jid, { text });
                success++;
                await sock.sendMessage(remoteJid, { text: `[${num}/${total}] ✅ Berhasil` });
            } catch {
                failed++;
                await sock.sendMessage(remoteJid, { text: `[${num}/${total}] ❌ Gagal` });
            }

            if (i < targets.length - 1) {
                await new Promise(r => setTimeout(r, delay * 1000));
            }
        }

        await sock.sendMessage(remoteJid, {
            text: `🎉 *JPM Private Selesai*\n📦 Total Target: ${total}\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`
        });
    }
};
