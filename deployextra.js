const FtpDeploy = require('ftp-deploy');
const ftpDeploy1 = new FtpDeploy();
const settings = require('./.ftpdeploy.js');

const config1 = {
    user: settings.user,
    // Password optional, prompted if none given
    password: settings.password,
    host: settings.host,
    port: settings.port,
    localRoot: __dirname + '/samples',
    remoteRoot: settings.remoteRoot + 'samples',
    include: ["*",],
    // DON'T delete ALL existing files at destination before uploading, if true
    deleteRemote: false,
    // Passive mode is forced (EPSV command is not sent)
    forcePasv: true,
    // use sftp or ftp
    sftp: false,
};

ftpDeploy1
    .deploy(config1)
    .then((res) => {
        for (let i in res[0]) {
            console.log(res[0][i]);
        }
    })
    .catch((err) => console.log(err));
