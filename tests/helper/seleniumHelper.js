'use strict';

const webdriverio = require('webdriverio');

const closeAllSessions = (port) => {
    const options = {port : port};
    return  webdriverio.remote(options).endAll();
};

const initWithProxy = (seleniumPort, proxyHost, proxyPort) => {
    const options = {
        port : seleniumPort,
        desiredCapabilities: {
            browserName: 'firefox',
            proxy : {
                proxyType : 'manual',
                httpProxy : `${proxyHost}:${proxyPort}`
            }
        }
    };
    return webdriverio.remote(options).init();
};
module.exports = { closeAllSession : closeAllSessions, initWithProxy : initWithProxy};