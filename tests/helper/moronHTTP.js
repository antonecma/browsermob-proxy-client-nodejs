'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');

const createHTTPServer = (port = 58080) => {

    return new Promise((resolve, reject) => {

        const server = http.createServer();

        server.listen(port);

        server.on('error', err => { throw new Error(err); });

        server.on('listening', () => resolve());

        server.on('request', (req, res) => {

            const parsedUrl = url.parse(req.url);

            switch (parsedUrl.pathname) {
                default:
                    res.setHeader('Content-Type', 'text/html');
                    res.setHeader('Header1', 'value1');
                    res.setHeader('Header2', 'value2');
                    res.writeHeader(200);
                    res.write('<html><body><h1>MoronHTTP</h1></body></html>');
                    break;
            }
            res.end();
        });
    });
};

module.exports = createHTTPServer;