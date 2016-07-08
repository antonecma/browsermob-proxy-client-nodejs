'use strict';

const webdriverio = require('webdriverio');
const childProcess = require('child_process');
const path = require('path');
/*const blackUrl = 'http://www.google.com';

webdriverio.remote({port : 4444, desiredCapabilities: { browserName : 'firefox' }}).init().url(blackUrl);*/
const pathToSelenium = '/home/antonecma/projects/browsermob-proxy-client/tests/utils/selenium-2.53/selenium-server-standalone-2.53.1.jar';
const startSelenium = (pathToSelenium, port) => {
    return new Promise((resolve, reject) => {
        let seleniumProcess = childProcess.spawn(`java`, [`-jar`, path.resolve(pathToSelenium), `-port`, port], { stdio: ['ignore', 'pipe', 'pipe'] });
        seleniumProcess.stderr.on('data', (data) => {
            console.log('Selenium proc : ', data.toString());
            if(data.includes('Selenium Server is up and running')){
                resolve(seleniumProcess);
            }
            if(data.includes('Failed to start')){
                seleniumProcess.kill();
                reject(new Error(`Selenium error : ${data}`));
            }
        });
    });
};

startSelenium(pathToSelenium, 5555).then((result) => { console.log('ok');})
    .catch((err) => { console.log(err);});