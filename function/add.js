module.exports = {
    trigger: 'add',
    execute: async (sock, m, args, ctx) => {
        const remoteJid = m.key.remoteJid

        // Cek grup
        if (!remoteJid.endsWith('@g.us'))
            return sock.sendMessage(remoteJid, { text: '❌ Command ini hanya untuk grup.', quoted: m })

        // Pastikan ada args
        if (!args.length)
            return sock.sendMessage(remoteJid, { text: '⚠️ Contoh: .add 628xxxx', quoted: m })

        // Ambil nomor dari args
        let rawNumber = args.join(' ')
        let number = rawNumber.replace(/\D/g, '') // hapus semua karakter kecuali angka

        // Validasi nomor WA
        if (!number.startsWith('62') || number.length < 10 || number.length > 15)
            return sock.sendMessage(remoteJid, { text: '❌ Format nomor salah, gunakan 62xxxxxxxxx', quoted: m })

        const user = number + '@s.whatsapp.net'

        // Eksekusi add
        try {
            await sock.groupParticipantsUpdate(remoteJid, [user], 'add')
            await sock.sendMessage(remoteJid, { text: '✅ Member berhasil ditambahkan.', quoted: m })
        } catch (e) {
            console.error(e)
            await sock.sendMessage(remoteJid, {
                text: '❌ Gagal add member. Pastikan nomor valid dan belum keluar/kicked dari grup.',
                quoted: m
            })
        }
    }
}
