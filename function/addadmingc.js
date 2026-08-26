module.exports = {
    trigger: 'addadmingc',
    execute: async (sock, m, args) => {
        const remoteJid = m.key.remoteJid
        if (!remoteJid.endsWith('@g.us'))
            return sock.sendMessage(remoteJid, { text: '❌ Command ini hanya untuk grup.', quoted: m })

        let users = []
        if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid)
            users.push(...m.message.extendedTextMessage.contextInfo.mentionedJid)
        if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const p = m.message.extendedTextMessage.contextInfo.participant
            if (p) users.push(p)
        }
        if (args.length) {
            args.forEach(a => {
                if (a.includes('@')) users.push(a.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
            })
        }

        users = [...new Set(users)]
        if (!users.length)
            return sock.sendMessage(remoteJid, { text: '⚠️ Tag atau reply anggota yang mau di-promote.', quoted: m })

        await sock.groupParticipantsUpdate(remoteJid, users, 'promote')
        await sock.sendMessage(remoteJid, { text: `✅ ${users.length} anggota berhasil di-promote jadi admin.`, quoted: m })
    }
}
