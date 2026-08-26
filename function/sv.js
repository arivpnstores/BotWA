module.exports = {
    trigger: 'sv',
    execute: async (sock, m, args, { isOwner, store }) => {
        const remoteJid = m.key.remoteJid
        if (!isOwner)
            return sock.sendMessage(remoteJid, { text: '❌ Hanya owner yang bisa menggunakan command ini.', quoted: m })

        const isGroup = remoteJid.endsWith('@g.us')

        if (isGroup) {
            await sock.sendMessage(remoteJid, { text: '⏳ Mengumpulkan semua anggota dari semua grup...' })

            const allMembers = new Map()
            let groupCount = 0

            try {
                const groups = await sock.groupFetchAllParticipating()
                groupCount = Object.keys(groups).length

                for (const [gid, meta] of Object.entries(groups)) {
                    if (meta.participants) {
                        for (const p of meta.participants) {
                            const jid = p.id || p
                            if (!allMembers.has(jid)) {
                                allMembers.set(jid, true)
                            }
                        }
                    }
                }
            } catch (e) {
                return sock.sendMessage(remoteJid, { text: '❌ Gagal mengambil data grup.' })
            }

            if (!allMembers.size)
                return sock.sendMessage(remoteJid, { text: '❌ Tidak ada anggota di semua grup.' })

            const vcfLines = []
            for (const jid of allMembers.keys()) {
                const num = jid.split('@')[0]
                vcfLines.push(
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    `FN:Buyyer RAJASERVER ${num}`,
                    `TEL;TYPE=CELL:${num}`,
                    'END:VCARD',
                    ''
                )
            }

            const vcfContent = vcfLines.join('\n')

            await sock.sendMessage(remoteJid, {
                document: Buffer.from(vcfContent, 'utf-8'),
                mimetype: 'text/vcard',
                fileName: `RAJASERVER_ALL_GROUP_MEMBERS.vcf`
            })
        } else {
            await sock.sendMessage(remoteJid, { text: '⏳ Membuat VCF dari semua kontak PM...' })

            const pmJids = Object.keys(store).filter(j => j.endsWith('@s.whatsapp.net'))
            if (!pmJids.length)
                return sock.sendMessage(remoteJid, { text: '❌ Tidak ada kontak tersimpan.' })

            const vcfLines = []
            for (const jid of pmJids) {
                const num = jid.split('@')[0]
                vcfLines.push(
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    `FN:Buyyer RAJASERVER ${num}`,
                    `TEL;TYPE=CELL:${num}`,
                    'END:VCARD',
                    ''
                )
            }

            const vcfContent = vcfLines.join('\n')

            await sock.sendMessage(remoteJid, {
                document: Buffer.from(vcfContent, 'utf-8'),
                mimetype: 'text/vcard',
                fileName: `RAJASERVER_CONTACTS.vcf`
            })
        }
    }
}
