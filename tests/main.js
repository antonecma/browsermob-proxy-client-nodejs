'use strict';

const should = require('should');
const nconf = require('nconf');
const path = require('path');
const childProcess = require('child_process');
const co = require('co');

const bmpClient = require('../index.js');
const moronHTTP = require('./helper/moronHTTP.js');

const configFileName = 'conf';

//using configuration file to setup some preferences for current tests
nconf.file(configFileName, path.join(__dirname, 'conf', `${configFileName}.json`));
nconf.use(configFileName);

const defaultLpClassInstance = nconf.get('bmpAddress');

//It starts the BrowserMob Proxy
const startBrowserMobProxy  = (path, host, port) => {
    return new Promise((resolve, reject) => {
        let bmpProcess = childProcess.spawn(`java`, [`-jar`, path, `-address`, host, `-port`, port]);
        bmpProcess.stdout.on('data', (data) => {
            if(data.includes('(main) Started')){
                resolve(bmpProcess);
            }/* else {
                console.log(data.toString());
            }*/
        });
        bmpProcess.stderr.on('data', (data) => {
            bmpProcess.kill();
            reject(new Error(`BrowserMob Proxy error : ${data}`));
        });
    });

};

//host, port and BrowserMob Proxy location in system
const bmpHost = nconf.get('bmpAddress:host');
const bmpPort = nconf.get('bmpAddress:port');
const bmpPath = nconf.get('bmpPath');

//BrowserMob Proxy process

let bmpProcess = undefined;

//Test HTTP server port
const moronPort = 58080;

describe('BrowserMob Proxy Client general test', () => {

    before((done) => {
        //start BrowserMobProxy
        (startBrowserMobProxy(bmpPath, bmpHost, bmpPort))
            .then( (bmpProcessSpawned) => {
                console.log('BrowserMob Proxy started.');
                bmpProcess = bmpProcessSpawned;
                return moronHTTP(moronPort);
            })
            .then(() => {
                done();
            })
            .catch( (err) => {
                console.log(err);
                done(err);
            });
    });

    describe('BrowserMob Proxy Client Class', () =>{

        it('should contain url to REST API server', () => {
            ((new bmpClient(bmpHost, bmpPort)).url).should.be.eql(`http://${bmpHost}:${bmpPort}`);
        });

        it('should fetch current proxies list from server', (done) => {
            const browserMobProxyClient = new bmpClient(bmpHost, bmpPort);
            browserMobProxyClient.getProxiesList()
                .then((value) => { value.should.be.eql([]); done();})
                .catch(value => {done(new Error(value));});
        });
        it('should create new BrowserMob Proxy Client instance', (done) => {
            const browserMobProxyClient = new bmpClient(bmpHost, bmpPort);
            browserMobProxyClient.create()
                .then((value) => {value.should.have.properties(['port', 'serverUrl']); done();})
                .catch((value) => {done(new Error(value));});
        });

        it('should fetch current own proxies list', (done) => {
            const browserMobProxyClient1 = new bmpClient(bmpHost, bmpPort);
            const browserMobProxyClient2 = new bmpClient(bmpHost, bmpPort);
            let proxyList1;
            browserMobProxyClient1.create()
                .then(() => {
                    return browserMobProxyClient2.create();
                })
                .then(() => {
                    return browserMobProxyClient1.getOwnProxiesList();
                })
                .then((proxyList) => {
                    proxyList1 = proxyList;
                    return browserMobProxyClient2.getOwnProxiesList();
                })
                .then((proxyList2) => {
                    proxyList2.should.not.be.eql(proxyList1);
                    done();
                })
                .catch((err) => { done(new Error(err)); });
        });

        it('should shutdown all own proxies', (done) => {
            const browserMobProxyClient = new bmpClient(bmpHost, bmpPort);
            browserMobProxyClient.create()
            .then(() => {
                return browserMobProxyClient.closeAllOwnProxies();
            })
            .then(() => {
                return browserMobProxyClient.getOwnProxiesList();
            })
            .then((list) => { list.should.be.eql([]); done(); })
            .catch((err) => { done(new Error(err)); });
        });
    });

    describe('BrowserMob Proxy Client instance [returned by create()]', () => {

        describe('should create a new HAR', () => {

            it('should capture headers', (done) => {
                const browserMobProxyClient = new bmpClient(bmpHost, bmpPort);
                browserMobProxyClient.create()
                    .then((client) => {
                        //capture header by default
                        return client.createHAR();
                    })
                    .catch((value) => {done(new Error(value));});
            });
        });

    });

    after(() => {
        bmpProcess.kill();
    });
});

