'use strict';

const webdriverio = require('webdriverio');

const closeAllSessions = (port) => {
    const options = {port : port};
    return  webdriverio.remote(options).endAll();
};

module.exports = { closeAllSession : closeAllSessions };