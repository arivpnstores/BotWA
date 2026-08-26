module.exports = {
    trigger: 'kickall',
    execute: async (sock, m, args, { isOwner }) => {
        const remoteJid = m.key.remoteJid
        if (!remoteJid.endsWith('@g.us'))
            return sock.sendMessage(remoteJid, { text: '❌ Command ini hanya untuk grup.', quoted: m })

        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        const meta = await sock.groupMetadata(remoteJid)
        const botJid = sock.user.id.includes(':')
            ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
            : sock.user.id

        const all = meta.participants.map(p => p.id)
        const target = all.filter(id => id !== botJid)

        if (target.length === 0)
            return sock.sendMessage(remoteJid, { text: '❌ Tidak ada member selain bot.', quoted: m })

        const total = target.length
        let success = 0, fail = 0
        const msg = await sock.sendMessage(remoteJid, {
            text: `⏳ Meng kick ${total} member...`
        })

        for (let i = 0; i < target.length; i++) {
            try {
                await sock.groupParticipantsUpdate(remoteJid, [target[i]], 'remove')
                success++
            } catch {
                fail++
            }
        }

        await sock.sendMessage(remoteJid, {
            text: `✅ *Kick All Selesai*\n\nTotal: ${total}\nBerhasil: ${success}\nGagal: ${fail}`
        })
    }
}
