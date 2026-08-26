module.exports = {
    trigger: 'antilink',
    execute: async (sock, m, args, { settings, saveSettings, isOwner }) => {
        if (!isOwner) return

        const opt = (args[0] || '').toLowerCase()
        if (!['on', 'off'].includes(opt)) {
            return sock.sendMessage(m.key.remoteJid, {
                text: `Format: .antilink on/off\nSaat ini: ${settings.antiLink ? 'ON' : 'OFF'}`
            }, { quoted: m })
        }

        settings.antiLink = opt === 'on'
        saveSettings()
        await sock.sendMessage(m.key.remoteJid, {
            text: `✅ Anti Link sekarang: *${opt.toUpperCase()}*\n\nLink grup WhatsApp & medsos akan otomatis dihapus.`
        }, { quoted: m })
    }
}
