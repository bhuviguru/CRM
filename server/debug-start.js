const fs = require('fs');

process.on('uncaughtException', (err) => {
    const errorLog = `Error: ${err.message}\nStack: ${err.stack}\n`;
    fs.writeFileSync('crash_full.log', errorLog);
    console.error('CRASH CAUGHT AND WRITTEN TO crash_full.log');
    process.exit(1);
});

console.log('Starting via debug script...');
require('./src/index.js');
