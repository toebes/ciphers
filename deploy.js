const FtpDeploy = require('ftp-deploy');
const ftpDeploy1 = new FtpDeploy();
const ftpDeploy2 = new FtpDeploy();
const settings = require('./.ftpdeploy.js');

const config1 = {
    user: settings.user, //'oauthexample@ftconshape.com',
    // Password optional, prompted if none given
    password: settings.password, // 'OauthSec.42@@!',
    host: settings.host, //'ftp.ftconshape.com',
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
    user: settings.user, //'oauthexample@ftconshape.com',
    // Password optional, prompted if none given
    password: settings.password, // 'OauthSec.42@@!',
    host: settings.host, //'ftp.ftconshape.com',
    port: settings.port,
    localRoot: __dirname + '/dist',
    remoteRoot: settings.remoteRoot,
    include: ['*'], // this would upload everything except dot files
    //include: ["*.js", "dist/*", ".*"],
    // e.g. exclude sourcemaps, and ALL files in node_modules (including dot files)
    exclude: ['*.js*', '*.js.LICENSE.txt', 'font/*', 'images/*'],
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
