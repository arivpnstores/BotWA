module.exports = {
    trigger: 'menu',
    execute: async (sock, m, args, { settings, allCommands }) => {
        const remoteJid = m.key.remoteJid;
        await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key } });
        const pushName = m.pushName || "User";

        const commandsList = [...allCommands.keys()].sort();

        const prefix = settings.prefix || '/';
        let text = `🤖 *${settings.botName.toUpperCase()}*\n`;
        text += `👋 Hi, *${pushName}*\n`;
        text += `🕹️ Mode: *${settings.mode.toUpperCase()}*\n`;
        text += `⏳ Time: ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
        text += `📊 Total Fitur: ${commandsList.length}\n`;
        text += `_________________________\n\n`;
        text += `*LIST COMMAND:*\n`;
        commandsList.forEach(cmdName => {
            text += `› ${prefix}${cmdName}\n`;
        });
        text += `\n_________________________\n`;
        text += `_Type ${prefix}<command> to use_`;

        // Kirim text (tanpa foto, karena foto menyebabkan SIGSEGV)
        await sock.sendMessage(remoteJid, { text }, { quoted: m });
        await sock.sendMessage(remoteJid, { react: { text: '✅', key: m.key } });
    }
};
