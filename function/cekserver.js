const net = require('net');

const VPS_LIST = [
  { name: 'SG-ALIBABA', host: '47.84.120.134', ports: [22] },
  { name: 'PANEL-BOT', host: 'petro.rajaserver.web.id', ports: [22] },
  { name: 'SG-VIP', host: 'ssl-sgvip.rajaserver.web.id', ports: [22] },
  { name: 'SG-VVIP', host: 'ssl-sgvvip.rajaserver.web.id', ports: [22] },
  { name: 'SG-VVIP2', host: 'ssl-sgvvip2.rajaserver.web.id', ports: [22] },
  { name: 'SG-VVIP3', host: 'ssl-sgvvip3.rajaserver.web.id', ports: [22] },
  { name: 'SG-TEAM1', host: 'ssl-sgteam1.rajaserver.web.id', ports: [22] },
  { name: 'ID-NUSA', host: 'ssl-idnusa.rajaserver.web.id', ports: [22] },
  { name: 'ID-TECHNO', host: 'ssl-idtechno.rajaserver.web.id', ports: [22] },
  { name: 'ID-TECHNO2', host: 'ssl-idtechno2.rajaserver.web.id', ports: [22] },
  { name: 'ID-ATHA', host: 'ssl-idatha.rajaserver.web.id', ports: [22] },
  { name: 'ID-BIZNET', host: 'idbiznet.rajaserver.web.id', ports: [22] },
  { name: 'ID-BIZNET2', host: 'idbiznet2.rajaserver.web.id', ports: [22] },
  { name: 'ID-BIZNET3', host: 'idbiznet3.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-1', host: 'newmedia.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-2', host: 'newmedia2.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-3', host: 'newmedia3.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-4', host: 'newmedia4.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-5', host: 'newmedia5.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-6', host: 'newmedia6.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-7', host: 'newmedia7.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-8', host: 'newmedia8.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-9', host: 'newmedia9.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-10', host: 'newmedia10.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-11', host: 'newmedia11.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-12', host: 'newmedia12.rajaserver.web.id', ports: [22] },
  { name: 'SG-NEWMEDIA-13', host: 'newmedia13.rajaserver.web.id', ports: [22] }
];

function checkPort(host, port, timeout = 2000) {
  return new Promise(resolve => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// cek sesuai port masing-masing
async function checkPorts(host, ports = []) {
  for (let port of ports) {
    const isOpen = await checkPort(host, port);
    if (isOpen) {
      return { status: '✅ Aman', port };
    }
  }

  return { status: '❌ Semua port mati', port: null };
}

module.exports = {
  trigger: ['cekserver', 'cekport'],
  execute: async (sock, m, args) => {
    const remoteJid = m.key.remoteJid;
    let resultText = '';

    for (let vps of VPS_LIST) {
      const res = await checkPorts(vps.host, vps.ports);

      resultText += `\n📌 ${vps.name}\n`;

      if (res.port) {
        resultText += `• ${res.status} (Port ${res.port} hidup)\n`;
      } else {
        resultText += `• ${res.status}\n`;
      }
    }

    await sock.sendMessage(
      remoteJid,
      { text: `✅ Hasil cek server:\n${resultText}` },
      { quoted: m }
    );
  }
};