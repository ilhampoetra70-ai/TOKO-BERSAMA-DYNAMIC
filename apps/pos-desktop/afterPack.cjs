const fs = require('node:fs');
const path = require('node:path');

module.exports = async function afterPack(context) {
  const systemNodeBinary = process.env.TOKOBERSAMA_NODE_BINARY || 'C:\\Program Files\\nodejs\\node.exe';

  if (!fs.existsSync(systemNodeBinary)) {
    throw new Error(`Node runtime tidak ditemukan: ${systemNodeBinary}`);
  }

  const targetDir = path.join(context.appOutDir, 'resources', 'bin');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(systemNodeBinary, path.join(targetDir, 'node.exe'));

  fs.writeFileSync(
    path.join(context.appOutDir, 'artifact-manifest.json'),
    JSON.stringify({
      target: 'single',
      builtAt: new Date().toISOString(),
      appExecutable: 'TOKOBERSAMA-POS-Portable.exe',
    }, null, 2)
  );
};
