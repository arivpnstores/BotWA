const fs = require('fs')
const path = require('path')

const banPath = path.join(__dirname, '..', 'ban.json')

function getBanned() {
    try {
        if (!fs.existsSync(banPath)) return []
        return JSON.parse(fs.readFileSync(banPath, 'utf-8'))
    } catch { return [] }
}

function saveBanned(list) {
    fs.writeFileSync(banPath, JSON.stringify(list, null, 2))
}

module.exports = {
    trigger: 'ban',
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
            return sock.sendMessage(remoteJid, { text: '⚠️ Reply atau tag user yang mau di-ban.\nAtau: .ban 628xxx', quoted: m })

        const banned = getBanned()
        if (banned.includes(target))
            return sock.sendMessage(remoteJid, { text: '❌ User sudah di-ban.', quoted: m })

        banned.push(target)
        saveBanned(banned)
        await sock.sendMessage(remoteJid, { text: `✅ Berhasil ban: ${target.split('@')[0]}`, quoted: m })
    }
}
