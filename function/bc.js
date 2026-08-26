module.exports = {
    trigger: 'bc',
    execute: async (sock, m, args, { isOwner, store }) => {
        const remoteJid = m.key.remoteJid
        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        const text = args.join(' ')
        if (!text)
            return sock.sendMessage(remoteJid, { text: '⚠️ Contoh:\n.bc Halo semua, promo hari ini...', quoted: m })

        const contacts = Object.keys(store).filter(j => j.endsWith('@s.whatsapp.net'))
        if (!contacts.length)
            return sock.sendMessage(remoteJid, { text: '❌ Tidak ada kontak tersimpan.', quoted: m })

        const msg = await sock.sendMessage(remoteJid, {
            text: `⏳ Mengirim broadcast ke ${contacts.length} kontak...`
        })

        let success = 0, fail = 0
        for (const c of contacts) {
            try {
                await sock.sendMessage(c, { text })
                success++
            } catch {
                fail++
            }
        }

        await sock.sendMessage(remoteJid, {
            text: `✅ *Broadcast PM Selesai*\n\nTotal kontak: ${contacts.length}\nBerhasil: ${success}\nGagal: ${fail}`
        })
    }
}
