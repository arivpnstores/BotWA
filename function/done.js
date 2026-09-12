module.exports = {
    trigger: 'done',
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
                text: '❗ Contoh penggunaan:\n.done jasa install panel', 
                quoted: m 
            });
        }

        // Teks desain lebih bagus untuk done
        const teks = `
📦 *Pesanan:* ${q}
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

────────────────
✅ *Status:* Transaksi Done
💬 Pesanan sudah selesai. Terima kasih atas kepercayaan Anda!

🌟 *Testimoni:*
https://t.me/RAJA_VPN_STORE

🛒 *Marketplace:*
https://chat.whatsapp.com/HKikhhHRCJx0Mp3Zhvb03U
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
