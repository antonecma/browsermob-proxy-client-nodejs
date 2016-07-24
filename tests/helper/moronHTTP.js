'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const buffer = require('buffer').Buffer;


const createHTTPServer = (port = 58080) => {
    
    const moronLocalPath = path.dirname(module.filename);
    const imageName = 'moron.jpeg';
    const pathToImage = path.join(moronLocalPath, imageName);

    createHTTPServer.imageName = imageName;
    createHTTPServer.image = (fs.readFileSync(pathToImage));
    createHTTPServer.imageBase64 = createHTTPServer.image.toString('base64');
    createHTTPServer.oneMbitBuffer = buffer.alloc(1024 * 1024, 74);
    fs.stat(pathToImage, (err, stat) => {
        createHTTPServer.imageSize = stat.size;
    });
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
                    res.end(createHTTPServer.image);
                    break;
                case '/binaryContent' :
                    res.setHeader('Content-Type', 'text/html');
                    res.writeHeader(200);
                    res.write('<html><body><img src="moron.jpeg"></body></html>');
                    res.end();
                    break;
                case '/1MbitContent' :
                    res.setHeader('Content-Type', 'text/plain');
                    res.writeHeader(200);
                    res.write(createHTTPServer.oneMbitBuffer);
                    res.end();
                    break;
                case '/upload1Mbit':
                    req.on('data', (data) => {
                        return;
                    });
                    req.on('end', () => {                                           
                        res.setHeader('Content-Type', 'text/plain');
                        res.writeHeader(200);
                        res.end();                        
                    });
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