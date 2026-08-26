module.exports = {
    trigger: 'setbotname',
    execute: async (sock, m, args, { settings, saveSettings, isOwner }) => {
        if (!isOwner) return

        const name = args.join(' ').trim()
        if (!name)
            return sock.sendMessage(m.key.remoteJid, {
                text: `⚠️ Contoh: .setbotname ARI BOT VIP\nSaat ini: ${settings.botName}`
            }, { quoted: m })

        settings.botName = name
        saveSettings()
        await sock.sendMessage(m.key.remoteJid, {
            text: `✅ Nama bot diubah menjadi: *${name}*`
        }, { quoted: m })
    }
}
