'use strict';

const should = require('should');
const nconf = require('nconf');
const path = require('path');
const childProcess = require('child_process');

const bmpClient = require('../index.js');
const configFileName = 'conf';

nconf.file(configFileName, path.join(__dirname, 'conf', `${configFileName}.json`));
nconf.use(configFileName);

const defaultLpClassInstance = nconf.get('bmpAddress');


let startBrowserMobProxy  = (path, host, port) => {
    return new Promise((resolve, reject) => {
        let bmpProcess = childProcess.exec(`java -jar ${path} -address ${host} -port ${port}`, (err, stdin, stdout) => {
            if(err){
                reject(err);
            }
        });
        bmpProcess.stdout.on('data', (data) => {
            if(data.includes('(main) Started')){
                resolve(bmpProcess);
            }
        });
        bmpProcess.stderr.on('data', (data) => {
            bmpProcess.kill();
            reject(new Error(`BrowserMob Proxy error : ${data}`));
        });
    });

};

const bmpHost = nconf.get('bmpAddress:host');
const bmpPort = nconf.get('bmpAddress:port');
const bmpPath = nconf.get('bmpPath');


(startBrowserMobProxy(bmpPath, bmpHost, bmpPort))
    .then( (bmpProcess) => {
        console.log('BrowserMob Proxy started.');
        bmpProcess.kill();
    })
    .catch( (err) => {
        console.log('BrowserMob Proxy started Error.');
    });