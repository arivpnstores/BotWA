module.exports = {
    trigger: 'autojoin',
    execute: async (sock, m, args, { settings, saveSettings, isOwner }) => {
        if (!isOwner) return;

        const newState = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(newState)) {
            return sock.sendMessage(
                m.key.remoteJid,
                { text: `Format: .autojoin on/off\nCurrent: ${settings.autoJoin ? 'ON' : 'OFF'}` },
                { quoted: m }
            );
        }

        settings.autoJoin = newState === 'on';
        saveSettings();
        await sock.sendMessage(
            m.key.remoteJid,
            { text: `✅ Auto Join sekarang: *${newState.toUpperCase()}*`, quoted: m }
        );
    }
};