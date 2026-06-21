const ftp = require('basic-ftp');
const path = require('path');
const settings = require('./.ftpdeploy.js');

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await client.access({
            host: settings.host,
            port: settings.port,
            user: settings.user,
            password: settings.password,
            secure: false // set true if using FTPS
        });

        const localRoot = path.join(__dirname, 'dist');
        const remoteRoot = settings.remoteRoot;

        // --- PASS 1: Upload JS files ---
        await uploadFiltered(client, localRoot, remoteRoot, (file) => {
            return file.endsWith('.js') || file.includes('.js.');
        });

        // --- PASS 2: Upload everything else except excluded ---
        await uploadFiltered(client, localRoot, remoteRoot, (file) => {
            if (file.endsWith('.js') || file.includes('.js.')) return false;
            if (file.startsWith('font/') || file.startsWith('images/')) return false;
            return true;
        });

        console.log('Deploy complete');
    } catch (err) {
        console.error(err);
    }

    client.close();
}

const fs = require('fs');

async function uploadFiltered(client, localDir, remoteDir, filterFn, baseDir = localDir) {
    const entries = fs.readdirSync(localDir, { withFileTypes: true });

    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const relativePath = path.relative(baseDir, localPath).replace(/\\/g, '/');
        const remotePath = path.posix.join(remoteDir, relativePath);

        if (entry.isDirectory()) {
            await uploadFiltered(client, localPath, remoteDir, filterFn, baseDir);
        } else {
            if (!filterFn(relativePath)) continue;

            await client.ensureDir(path.dirname(remotePath));
            await client.uploadFrom(localPath, remotePath);

            console.log(`Uploaded: ${relativePath}`);
        }
    }
}

deploy();