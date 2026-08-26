module.exports = {
    trigger: 'kick',
    execute: async (sock, m, args, ctx) => {
        const remoteJid = m.key.remoteJid
        if (!remoteJid.endsWith('@g.us'))
            return sock.sendMessage(remoteJid, { text: '❌ Command ini hanya untuk grup.', quoted: m })

        // Ambil target
        let users = []

        // Dari tag
        if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid)
            users.push(...m.message.extendedTextMessage.contextInfo.mentionedJid)

        // Dari reply
        if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedParticipant = m.message.extendedTextMessage.contextInfo.participant
            if (quotedParticipant) users.push(quotedParticipant)
        }

        // Dari args manual
        if (args.length > 0)
            args.forEach(a => {
                if (a.includes('@'))
                    users.push(a.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
            })

        if (users.length === 0)
            return sock.sendMessage(remoteJid, { text: '⚠️ Tag atau reply member yang mau di-kick.', quoted: m })

        // Hapus duplikat
        users = [...new Set(users)]

        // Eksekusi
        await sock.groupParticipantsUpdate(remoteJid, users, 'remove')
        await sock.sendMessage(remoteJid, { text: '✅ Member berhasil di-kick.', quoted: m })
    }
}
