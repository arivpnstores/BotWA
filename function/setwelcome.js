const fs = require('fs')
const path = require('path')

const welcomePath = path.join(__dirname, '..', 'welcome_data.json')

function readData() {
    try {
        if (!fs.existsSync(welcomePath)) return { groups: [] }
        const raw = JSON.parse(fs.readFileSync(welcomePath, 'utf-8'))
        if (Array.isArray(raw)) return { groups: raw }
        return raw
    } catch { return { groups: [] } }
}

function writeData(data) {
    fs.writeFileSync(welcomePath, JSON.stringify(data, null, 2))
}

module.exports = {
    trigger: 'setwelcome',
    execute: async (sock, m, args, { isOwner }) => {
        const remoteJid = m.key.remoteJid
        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        const data = readData()

        if (!args.length) {
            const teks = data.welcomeText
                ? `📋 Teks welcome saat ini:\n\n${data.welcomeText}\n\nKetik .setwelcome <teks> untuk mengubah.\nKetik .setwelcome reset untuk kembali ke default.`
                : '📋 Teks welcome: Default\n\nGunakan .setwelcome <teks> untuk custom.'
            return sock.sendMessage(remoteJid, { text: teks }, { quoted: m })
        }

        const input = args.join(' ')
        if (input.toLowerCase() === 'reset') {
            delete data.welcomeText
            writeData(data)
            return sock.sendMessage(remoteJid, { text: '✅ Teks welcome direset ke default.' }, { quoted: m })
        }

        data.welcomeText = input
        writeData(data)
        await sock.sendMessage(remoteJid, {
            text: `✅ Teks welcome berhasil diubah menjadi:\n\n${input}\n\nGunakan @user untuk tag anggota baru.`
        }, { quoted: m })
    }
}
