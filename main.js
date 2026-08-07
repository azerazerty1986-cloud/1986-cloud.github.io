// main.js - خادم المربع
console.log('🟢 خادم المربع جاهز!');

const ServerData = {
    name: 'خادم اللعبة',
    status: 'نشط',
    version: '1.0',
    requests: 0
};

window.TileServer = {
    info: () => ServerData,
    getPlayers: () => [{ id: 1, name: 'مغامر', level: 5, score: 1000 }],
    getWorlds: () => [{ name: 'العالم الرئيسي', players: 1 }],
    ping: () => ({ status: 'online', timestamp: Date.now() })
};

window.servers = window.servers || {};
window.servers['5_3'] = window.TileServer;
