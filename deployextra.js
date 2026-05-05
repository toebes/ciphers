const ftp = require('basic-ftp');
const path = require('path');
const settings = require('./.ftpdeploy.js');

async function deployExtra() {
    const client = new ftp.Client();
    client.ftp.verbose = falce;

    try {
        await client.access({
            host: settings.host,
            port: settings.port,
            user: settings.user,
            password: settings.password,
            secure: false // FTP. Use true for FTPS
        });

        const localRoot = path.join(__dirname, 'samples');
        const remoteRoot = settings.remoteRoot + 'Samples';

        await client.ensureDir(remoteRoot);

        // Upload everything (matches your old include: ["*"])
        await client.uploadFromDir(localRoot);

        console.log('Extra deploy complete');
    } catch (err) {
        console.error(err);
    } finally {
        client.close();
    }
}

deployExtra();