'use strict';

const should = require('should');
const nconf = require('nconf');
const path = require('path');
const childProcess = require('child_process');
const co = require('co');
const webdriverio = require('webdriverio');

const bmpClient = require('../index.js');
const moronHTTP = require('./helper/moronHTTP.js');
const seleniumHelper = require('./helper/seleniumHelper.js');

const configFileName = 'conf';

//using configuration file to setup some preferences for current tests
nconf.file(configFileName, path.join(__dirname, 'conf', `${configFileName}.json`));
nconf.use(configFileName);

const defaultLpClassInstance = nconf.get('bmpAddress');

//It starts the BrowserMob Proxy
const startBrowserMobProxy  = (pathToBmp, host, port) => {
    return new Promise((resolve, reject) => {
        let bmpProcess = childProcess.spawn(`java`, [`-jar`, path.resolve(pathToBmp), `-address`, host, `-port`, port]);
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
//It stars the Selenium
const startSelenium = (pathToSelenium, port) => {
    return new Promise((resolve, reject) => {
        let seleniumProcess = childProcess.spawn(`java`, [`-jar`, path.resolve(pathToSelenium), `-port`, port]);
        seleniumProcess.stderr.on('data', (data) => {
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
//host, port and BrowserMob Proxy location in system
const bmpHost = nconf.get('bmpAddress:host');
const bmpPort = nconf.get('bmpAddress:port');
const bmpPath = nconf.get('bmpPath');
//port and Selenium location in system
const seleniumPort = nconf.get('seleniumPort');
const seleniumPath = nconf.get('seleniumPath');

//Test HTTP server port
const moronPort = 58080;
//Test HTTP server url
const moronHTTPUrl = `http://127.0.0.1:${moronPort}`;

//BrowserMob Proxy process
let bmpProcess = undefined;
//Selenium hub process
let seleniumProcess = undefined;



describe('BrowserMob Proxy Client general test', () => {

    before((done) => {
        //start BrowserMobProxy
        (startBrowserMobProxy(bmpPath, bmpHost, bmpPort))
            .then( (bmpProcessSpawned) => {
                console.log('BrowserMob Proxy started.');
                bmpProcess = bmpProcessSpawned;
                return moronHTTP(moronPort);
            })
            .then( () => {
                return startSelenium(seleniumPath, seleniumPort);
            })
            .then((seleniumProcessSpawned) => {
                seleniumProcess = seleniumProcessSpawned;
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

        describe.skip('should create a new HAR - newHar()', () => {

            it('should capture headers', (done) => {

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        //Create new selenium session
                        return seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port)
                            .url(moronHTTPUrl);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {

                        let responseHeaders = [];
                        const responseCount = har.log.entries.length;

                        for(let i = 0; i < responseCount; i++){
                            responseHeaders.push(...har.log.entries[i].response.headers);
                        }
                        responseHeaders.should.containDeep( [{ name: 'Header1', value: 'value1' },
                            { name: 'Header2', value: 'value2' }]);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });

            it('should capture body content', (done) => {
                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        //Create new selenium session
                        return seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port)
                            .url(moronHTTPUrl);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {

                        let responseContents = [];
                        const responseCount = har.log.entries.length;

                        for(let i = 0; i < responseCount; i++){
                            responseContents.push(har.log.entries[i].response.content.text);
                        }
                        responseContents.should.containEql('<html><body><h1>MoronHTTP</h1></body></html>');
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });

            it('should capture binary content', (done) => {


                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true, true);
                    })
                    .then(() => {
                        //Create new selenium session
                        return seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port)
                            .url(`${moronHTTPUrl}/binaryContent`);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {

                        const imageElement = har.log.entries.find((entri) => {
                            return entri.response.content.mimeType == 'image/jpeg';
                        });

                        imageElement.response.content.text.should.be.eql(moronHTTP.imageBase64);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });

            it('should set initial page id', (done) => {

                const pageID = 'testPageTitle';
                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true, true, pageID);
                    })
                    .then(() => {
                        //Create new selenium session
                        return seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port)
                            .url(`${moronHTTPUrl}`);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {
                        har.log.pages[0].id.should.be.eql(pageID);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });

            it('should set initial page title', (done) => {

                const pageTitle = 'someTitle';
                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true, true, undefined, pageTitle);
                    })
                    .then(() => {
                        //Create new selenium session
                        return seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port)
                            .url(`${moronHTTPUrl}`);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {
                        har.log.pages[0].title.should.be.eql(pageTitle);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });
        });

        describe('should start new page on the existing HAR - startPage()', () => {

            it('should add new page on existing HAR', (done) => {

                let browserMobProxyClient =  undefined;
                let seleniumInstance = undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        //Create new selenium session
                        seleniumInstance = seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port);
                        return seleniumInstance.url(`${moronHTTPUrl}`);
                    })
                    .then(() => {
                        browserMobProxyClient.startPage();
                    })
                    .then(() => {
                        return seleniumInstance.url(`${moronHTTPUrl}/binaryContent`);

                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {
                        har.log.pages.length.should.be.eql(2);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });

            it('should add new page on existing HAR with page ref (ID)', (done) => {

                const pageRef = 'somePageRef';


                let browserMobProxyClient =  undefined;
                let seleniumInstance = undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        //Create new selenium session
                        seleniumInstance = seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port);
                        return seleniumInstance.url(`${moronHTTPUrl}`);
                    })
                    .then(() => {
                        browserMobProxyClient.startPage({pageRef : pageRef});
                    })
                    .then(() => {
                        return seleniumInstance.url(`${moronHTTPUrl}/binaryContent`);

                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {
                        har.log.pages.length.should.be.eql(2);
                        har.log.pages[1].id.should.be.eql(pageRef);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });

            it('should add new page on existing HAR with page ref (ID) and title', (done) => {

                const pageTitle = 'somePageTitle';


                let browserMobProxyClient =  undefined;
                let seleniumInstance = undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        //Create new selenium session
                        seleniumInstance = seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port);
                        return seleniumInstance.url(`${moronHTTPUrl}`);
                    })
                    .then(() => {
                        browserMobProxyClient.startPage({pageTitle : pageTitle});
                    })
                    .then(() => {
                        return seleniumInstance.url(`${moronHTTPUrl}/binaryContent`);

                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then((har) => {
                        har.log.pages.length.should.be.eql(2);
                        har.log.pages[1].title.should.be.eql(pageTitle);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });
        });

    });

    after((done) => {
        bmpProcess.kill();
        seleniumHelper.closeAllSession(seleniumPort)
        .then(() => {
            seleniumProcess.kill();
            done();
        })
        .catch((err) => { done(new Error(err)); });
    });
});

