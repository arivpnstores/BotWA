module.exports = {
    trigger: 'restart',
    execute: async (sock, m, args, { settings }) => {
        const remoteJid = m.key.remoteJid;

        // react ⏳
        await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key } });

        // info restart
        await sock.sendMessage(remoteJid, { 
            text: `♻️ *${settings.botName}* akan restart sekarang...`, 
            quoted: m 
        });

        // delay sebentar biar pesan terkirim
        setTimeout(() => {
            console.log('[SYS] Restarting bot by command...');
            process.exit(0); // langsung exit → PM2 otomatis restart
        }, 1000);
    }
};
