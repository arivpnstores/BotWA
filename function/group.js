module.exports = {
    trigger: 'group',
    execute: async (sock, m, args, { isOwner }) => {
        const remoteJid = m.key.remoteJid
        if (!remoteJid.endsWith('@g.us'))
            return sock.sendMessage(remoteJid, { text: '❌ Command ini hanya untuk grup.', quoted: m })
        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        const opt = (args[0] || '').toLowerCase()
        if (opt === 'open') {
            await sock.groupSettingUpdate(remoteJid, 'not_announcement')
            await sock.sendMessage(remoteJid, { text: '✅ Grup dibuka. Semua anggota bisa mengirim pesan.' })
        } else if (opt === 'close') {
            await sock.groupSettingUpdate(remoteJid, 'announcement')
            await sock.sendMessage(remoteJid, { text: '✅ Grup ditutup. Hanya admin yang bisa mengirim pesan.' })
        } else {
            await sock.sendMessage(remoteJid, {
                text: '⚠️ Format: .group open / .group close\n\nopen = semua bisa kirim\nclose = hanya admin'
            }, { quoted: m })
        }
    }
}
