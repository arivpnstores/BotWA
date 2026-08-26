const SERVERS = require('../servers/config_servers');

module.exports = {
  trigger: ['listserver', 'daftarserver', 'serverlist'],
  execute: async (sock, m, args, { isOwner }) => {
    const chat = m.key.remoteJid;
    
    let resultText = '📋 *DAFTAR SERVER*\n';
    resultText += '='.repeat(30) + '\n\n';
    
    const serverEntries = Object.entries(SERVERS);
    
    if (serverEntries.length === 0) {
      return sock.sendMessage(chat, { text: '❌ Tidak ada server yang tersedia.' }, { quoted: m });
    }
    
    serverEntries.forEach(([id, server]) => {
      resultText += `🔢 *Server ID:* ${id}\n`;
      resultText += `🌐 *Domain:* ${server.domain}\n`;
      resultText += `📊 *Limit IP:* ${server.limitip}\n`;
      resultText += `💾 *Kuota:* ${server.kuota === 0 ? 'Unlimited' : server.kuota + ' MB'}\n`;
      resultText += '-'.repeat(25) + '\n\n';
    });
    
    resultText += `💡 *Total Server:* ${serverEntries.length}\n`;
    resultText += `📝 *Gunakan:* .addssh <server_id> <username> <password> <hari>\n`;
    resultText += `🔍 *Cek Status:* .cekserver`;
    
    await sock.sendMessage(chat, { text: resultText }, { quoted: m });
  }
};