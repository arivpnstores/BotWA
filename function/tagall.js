module.exports = {
    trigger: 'tagall',
    execute: async (sock, m, args, { isOwner }) => {
        const jid = m.key.remoteJid
        if (!jid.endsWith('@g.us'))
            return sock.sendMessage(jid, { text: '❌ Command ini hanya untuk grup.', quoted: m })
        if (!isOwner)
            return sock.sendMessage(jid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        const meta = await sock.groupMetadata(jid)
        const members = meta.participants.map(p => p.id)
        const text = args.length
            ? args.join(' ')
            : `@everyone`

        await sock.sendMessage(jid, { text, mentions: members })
    }
}
