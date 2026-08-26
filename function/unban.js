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
    trigger: 'unban',
    execute: async (sock, m, args, { isOwner }) => {
        const remoteJid = m.key.remoteJid
        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        if (args[0]?.toLowerCase() === 'list') {
            const banned = getBanned()
            if (!banned.length)
                return sock.sendMessage(remoteJid, { text: '📋 Tidak ada user yang di-ban.', quoted: m })
            const list = banned.map(j => '• ' + j.split('@')[0]).join('\n')
            return sock.sendMessage(remoteJid, { text: `📋 *Daftar Banned:*\n\n${list}\n\nTotal: ${banned.length}`, quoted: m })
        }

        let target = ''
        if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant
        } else if (args.length) {
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        }

        if (!target)
            return sock.sendMessage(remoteJid, { text: '⚠️ Reply atau tag user yang mau di-unban.\nAtau: .unban 628xxx\n.unban list = lihat daftar banned', quoted: m })

        const banned = getBanned()
        if (!banned.includes(target))
            return sock.sendMessage(remoteJid, { text: '❌ User tidak ada di daftar ban.', quoted: m })

        const updated = banned.filter(j => j !== target)
        saveBanned(updated)
        await sock.sendMessage(remoteJid, { text: `✅ Berhasil unban: ${target.split('@')[0]}`, quoted: m })
    }
}
