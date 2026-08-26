module.exports = {
    trigger: 'proses',
    execute: async (sock, m, args, { settings, isOwner }) => {
        const remoteJid = m.key.remoteJid;
        const q = args.join(' ');

        if (!isOwner) {
            return await sock.sendMessage(remoteJid, { 
                text: '⚠️ Hanya owner yang bisa menggunakan command ini!', 
                quoted: m 
            });
        }

        if (!q) {
            return await sock.sendMessage(remoteJid, { 
                text: '❗ Contoh penggunaan:\n.proses jasa install panel', 
                quoted: m 
            });
        }

        // Pesan utama
        const teks = `
📦 *Pesanan:* ${q}
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

────────────────
⏳ *Status:* Pesanan diterima
💬 Mohon tunggu, admin sedang memproses pesanan Anda.

🌟 *Testimoni:*
https://t.me/RAJA_VPN_STORE

🛒 *Marketplace:*
https://chat.whatsapp.com/EpYADSv2HIc8ICCVeVbCJf
────────────────
💡 *Powered By:* ${settings.botName}
`;

        await sock.sendMessage(remoteJid, {
            text: teks,
            ...(m.sender ? { mentions: [m.sender] } : {}),
            ...(m ? { quoted: m } : {})
        });
    }
};
