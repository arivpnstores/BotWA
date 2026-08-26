module.exports = {
  trigger: 'autoread',
  execute: async (sock, m, args, { settings, saveSettings, isOwner }) => {
    if (!isOwner) return;

    // pastikan struktur ada
    settings.autoRead ??= {
      enabled: false,
      scope: 'all',
      ignoreOwner: true,
      delayMs: [500, 1500]
    };

    const opt = (args[0] || '').toLowerCase();
    const ar = settings.autoRead;

    // ===============================
    // VALIDASI & UPDATE
    // ===============================
    if (opt === 'on') ar.enabled = true;
    else if (opt === 'off') ar.enabled = false;
    else if (['all', 'group', 'private'].includes(opt)) ar.scope = opt;
    else if (opt === 'owner') ar.ignoreOwner = false;
    else if (opt === 'noowner') ar.ignoreOwner = true;
    else {
      // jika salah / kosong → tampilkan status
      return sock.sendMessage(
        m.key.remoteJid,
        {
          text:
`📘 AutoRead Settings
• enabled      : ${ar.enabled ? 'ON' : 'OFF'}
• scope        : ${ar.scope}
• ignoreOwner  : ${ar.ignoreOwner}
• delay        : ${ar.delayMs[0]}-${ar.delayMs[1]} ms

Format:
.autoread on/off
.autoread all/group/private
.autoread owner/noowner`
        },
        { quoted: m }
      );
    }

    saveSettings();

    await sock.sendMessage(
      m.key.remoteJid,
      {
        text:
`✅ AutoRead berhasil diupdate
• enabled      : ${ar.enabled ? 'ON' : 'OFF'}
• scope        : ${ar.scope}
• ignoreOwner  : ${ar.ignoreOwner}
• delay        : ${ar.delayMs[0]}-${ar.delayMs[1]} ms`
      },
      { quoted: m }
    );
  }
};
