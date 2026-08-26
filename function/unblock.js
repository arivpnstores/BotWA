module.exports = {
    trigger: 'unblock',
    execute: async (sock, m, args, { isOwner }) => {
        const remoteJid = m.key.remoteJid
        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        let target = ''
        if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant
        } else if (args.length) {
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        }

        if (!target)
            return sock.sendMessage(remoteJid, { text: '⚠️ Reply atau tag user yang mau di-unblock.\nAtau: .unblock 628xxx', quoted: m })

        await sock.updateBlockStatus(target, 'unblock')
        await sock.sendMessage(remoteJid, { text: `✅ Berhasil unblock: ${target.split('@')[0]}`, quoted: m })
    }
}
