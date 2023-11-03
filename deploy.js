const FtpDeploy = require('ftp-deploy');
const ftpDeploy1 = new FtpDeploy();
const ftpDeploy2 = new FtpDeploy();
const settings = require('./.ftpdeploy.js');

const config1 = {
    user: settings.user,
    // Password optional, prompted if none given
    password: settings.password,
    host: settings.host,
    port: settings.port,
    localRoot: __dirname + '/dist',
    remoteRoot: settings.remoteRoot,
    include: ["*.js*",],
    // DON'T delete ALL existing files at destination before uploading, if true
    deleteRemote: false,
    // Passive mode is forced (EPSV command is not sent)
    forcePasv: true,
    // use sftp or ftp
    sftp: false,
};

const config2 = {
    user: settings.user,
    // Password optional, prompted if none given
    password: settings.password,
    host: settings.host,
    port: settings.port,
    localRoot: __dirname + '/dist',
    remoteRoot: settings.remoteRoot,
    include: ['*'], // this would upload everything except dot files
    // e.g. do not copy what was copied in config1.  Also skip fonts and images because
    //      they (almost) never change and if they do, just add them one time.
    exclude: ['*.js*', 'font/*', 'images/*'],
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
        ftpDeploy2
            .deploy(config2)
            .then((res) => {
                for (let i in res[0]) {
                    console.log(res[0][i]);
                }
            })
            .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
