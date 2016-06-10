'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const createHTTPServer = (port = 58080) => {

    const moronLocalPath = path.dirname(module.filename);
    const pathToImage = path.join(moronLocalPath, 'moron.jpeg');
    createHTTPServer.imageBase64 = (fs.readFileSync(pathToImage)).toString('base64');

    return new Promise((resolve, reject) => {

        const server = http.createServer();

        server.listen(port);

        server.on('error', err => { throw new Error(err); });

        server.on('listening', () => resolve());

        server.on('request', (req, res) => {

            const parsedUrl = url.parse(req.url);

            switch (parsedUrl.pathname) {
                case '/moron.jpeg' :
                    console.log('moron.jpeg');
                    res.setHeader('Content-Type', 'image/jpeg');
                    const readableStream = fs.createReadStream(pathToImage);
                    readableStream.pipe(res);
                    break;
                case '/binaryContent' :
                    res.setHeader('Content-Type', 'text/html');
                    res.writeHeader(200);
                    res.write('<html><body><img src="moron.jpeg"></body></html>');
                    res.end();
                    break;
                default:
                    res.setHeader('Content-Type', 'text/html');
                    res.setHeader('Header1', 'value1');
                    res.setHeader('Header2', 'value2');
                    res.writeHeader(200);
                    res.write('<html><body><h1>MoronHTTP</h1></body></html>');
                    res.end();
                    break;
            }

        });
    });
};

module.exports = createHTTPServer;