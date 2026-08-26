module.exports = {
    trigger: 'anticall',
    execute: async (sock, m, args, { settings, saveSettings, isOwner }) => {
        if (!isOwner) return;

        const newState = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(newState)) {
            return sock.sendMessage(
                m.key.remoteJid,
                { text: `Format: .anticall on/off\nCurrent: ${settings.antiCall ? 'ON' : 'OFF'}` },
                { quoted: m }
            );
        }

        settings.antiCall = newState === 'on';
        saveSettings();
        await sock.sendMessage(
            m.key.remoteJid,
            { text: `✅ Anti Call sekarang: *${newState.toUpperCase()}*`, quoted: m }
        );
    }
};