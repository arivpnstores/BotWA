module.exports = {
    trigger: 'autoreadsw',
    execute: async (sock, m, args, { settings, saveSettings, isOwner }) => {
        if (!isOwner) return;

        settings.autoReadSw ??= false;

        const newState = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(newState)) {
            return sock.sendMessage(
                m.key.remoteJid,
                { text: `Format: .autoreadsw on/off\nCurrent: ${settings.autoReadSw ? 'ON' : 'OFF'}` },
                { quoted: m }
            );
        }

        settings.autoReadSw = newState === 'on';
        saveSettings();
        await sock.sendMessage(
            m.key.remoteJid,
            { text: `✅ Auto Read Status sekarang: *${newState.toUpperCase()}*`, quoted: m }
        );
    }
};