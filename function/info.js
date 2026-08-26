module.exports = {
    trigger: 'info', // Command .info
    execute: async (sock, m, args, { settings }) => {
        // Ambil raw JID pengirim
        const rawJid = m.key.fromMe ? sock.user.id : (m.key.participant || m.key.remoteJid)
        const originalNumber = rawJid.split('@')[0] // nomor asli dari JID

        // Fungsi bersihkan nomor untuk cek owner
        const cleanNumber = (number) => number.replace(/\D/g, '').slice(-10)
        const isOwner = settings.ownerNumber.some(owner => cleanNumber(owner) === cleanNumber(originalNumber)) || m.key.fromMe

        // Buat pesan info tanpa Cleaned No
        const infoMessage = `
📌 Info Sender
- Original JID : ${originalNumber}
- Is Owner    : ${isOwner ? '✅ Yes' : '❌ No'}
- Push Name   : ${m.pushName || 'Unknown'}
- Remote JID  : ${m.key.remoteJid}
        `.trim()

        // Kirim balasan
        await sock.sendMessage(m.key.remoteJid, { text: infoMessage }, { quoted: m })

        // Optional: log di console juga
        console.log(`[INFO] Sender: ${originalNumber} | Owner: ${isOwner}`)
    }
}
