module.exports = {
    trigger: 'upsw',
    execute: async (sock, m, args, ctx) => {

        try {
            // Ambil text
            const text = args.join(' ') || m.quoted?.text || ''

            // Ambil media kalau ada
            let media = null
            let type = null

            if (m.quoted) {
                const mime = m.quoted.mimetype || ''

                if (mime.includes('image')) {
                    media = await m.quoted.download()
                    type = 'image'
                } else if (mime.includes('video')) {
                    media = await m.quoted.download()
                    type = 'video'
                }
            }

            // JID status
            const statusJid = 'status@broadcast'

            // ========== KIRIM STATUS ==========
            if (media && type === 'image') {
                await sock.sendMessage(statusJid, {
                    image: media,
                    caption: text || '📸'
                })
            } 
            else if (media && type === 'video') {
                await sock.sendMessage(statusJid, {
                    video: media,
                    caption: text || '🎬'
                })
            } 
            else {
                // Text only
                if (!text) {
                    return sock.sendMessage(m.key.remoteJid, {
                        text: '⚠️ Kirim text atau reply media.\nContoh: .upsw halo',
                        quoted: m
                    })
                }

                await sock.sendMessage(statusJid, {
                    text: text
                })
            }

            // Notif sukses
            await sock.sendMessage(m.key.remoteJid, {
                text: '✅ Status berhasil diupload!',
                quoted: m
            })

        } catch (err) {
            console.error(err)
            await sock.sendMessage(m.key.remoteJid, {
                text: '❌ Gagal upload status.',
                quoted: m
            })
        }
    }
}