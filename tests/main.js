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
const request = require('./helper/request.js');

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
        let seleniumProcess = childProcess.spawn(`java`, [`-jar`, path.resolve(pathToSelenium), `-port`, port], { stdio: ['ignore', 'pipe', 'pipe'] });
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

        describe('should create a new HAR - newHar()', () => {

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
                        responseContents.should.containEql(moronHTTP.defaultContent);
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

        describe('should close client - close()', () => {

            it('should close', (done) => {

                const browserMobProxy = new bmpClient(bmpHost, bmpPort);

                let client = undefined;
                let currentCountOfProxy = undefined;

                browserMobProxy.create()
                    .then((bmpClient) => {
                        client = bmpClient;
                        return browserMobProxy.getProxiesList();
                    })
                    .then((list) => {
                        currentCountOfProxy = list.length;
                        return client.close();
                    })
                    .then(() => {
                        return browserMobProxy.getProxiesList();
                    })
                    .then((list) => {
                        list.length.should.be.eql(currentCountOfProxy - 1);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});

            });
        });

        describe('should return HAR - getHAR()', () => {

            it('should return HAR created by newHar() - getHar()', (done) => {

                let browserMobProxyClient = undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        //Browser Mob Client
                        browserMobProxyClient = client;
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        return seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port)
                            .url(`${moronHTTPUrl}`);
                    })
                    .then(() => {
                        //Create new selenium session
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        har.log.should.have.properties(['version' , 'creator', 'browser', 'pages', 'entries',  'comment']);
                        done();
                    })
                    .catch((value) => {done(new Error(value));});
            });
        });

        describe('work with whitelists - getWhiteList(), setWhiteList(), clearWhiteList()', () => {

            describe('getWhiteList()', () => {

                it('should return empty list of white domain, if we did not add domain before', (done) => {

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            return client.getWhiteList();
                        })
                        .then((list) => {
                            list.should.be.empty();
                            done();
                        })
                        .catch((value) => {done(new Error(value));});
                });
            });

            describe('setWhiteList()', () => {

                it('should set list', (done) => {

                    const whiteList = [`${moronHTTPUrl}`];
                    const codeForNonWhiteList = 404;
                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setWhiteList(codeForNonWhiteList, whiteList);
                        })
                        .then(() => {
                            return browserMobProxyClient.getWhiteList();
                        })
                        .then((list) => {
                            list.should.be.eql(whiteList);
                            done();
                        })
                        .catch((value) => {done(new Error(value));});

                });

                it('should not return resource which not placed in list', (done) => {

                    const whiteList = [`${moronHTTPUrl}`];
                    const codeForNonWhiteList = 404;
                    let browserMobProxyClient =  undefined;
                    let seleniumInstance = undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setWhiteList(codeForNonWhiteList, whiteList);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            //Create new selenium session
                            seleniumInstance = seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port);
                           return seleniumInstance.url(`${whiteList[0]}/binaryContent`);
                        })
                        .then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {
                            har.log.entries.should.be.empty();
                            done();
                        })
                        .catch((value) => {done(new Error(value));});
                });
            });

            describe('clearWhiteList()', () => {

                it('should empty list after add some url - clearWhiteList()', (done) => {

                    const whiteList = [`${moronHTTPUrl}`];
                    const codeForNonWhiteList = 404;
                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setWhiteList(codeForNonWhiteList, whiteList);
                        })
                        .then(() => {
                            return browserMobProxyClient.clearWhiteList();
                        })
                        .then(() => {
                            return browserMobProxyClient.getWhiteList();
                        })
                        .then((list) => {
                            list.should.be.empty();
                            done();
                        })
                        .catch((value) => {done(new Error(value));});
                });

            });
        });

        describe('work with blacklists - getBlackList(), setBlackList(), clearBlackList()', () => {

            describe('getBlackList()', () => {

                it('should return empty list of black domain, if we did not add domain before', (done) => {

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            return client.getBlackList();
                        })
                        .then((list) => {
                            list.should.be.empty();
                            done();
                        })
                        .catch((value) => {done(new Error(value));});
                });
            });

            describe('setBlackList()', () => {

                it('should set list', (done) => {

                    const blackList = [`${moronHTTPUrl}`, `${moronHTTPUrl}/binaryContent`];
                    const codeForInList= 404;
                    const method = 'get|post';
                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setBlackList(codeForInList, blackList[0]);
                        })
                        .then(() => {
                            return browserMobProxyClient.setBlackList(codeForInList, blackList[1], method);
                        })
                        .then(() => {
                            return browserMobProxyClient.getBlackList();
                        })
                        .then((list) => {

                            list.should.be.length(2);

                            list[0].should.have.property('pattern').eql(blackList[0]);
                            list[1].should.have.property('pattern').eql(blackList[1]);

                            done();
                        })
                        .catch((value) => {done(new Error(value));});

                });

                it('should not return resource which placed in list', (done) => {

                    const blackList = ['https?://www\\.google\\.com/.*'];
                    const blackUrl = 'http://www.google.com';
                    const codeForNonWhiteList = 500;

                    let browserMobProxyClient =  undefined;
                    let seleniumInstance = undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setBlackList(codeForNonWhiteList, blackList[0]);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            //Create new selenium session
                            seleniumInstance = seleniumHelper.initWithProxy(seleniumPort, bmpHost, browserMobProxyClient.port);
                            return seleniumInstance.url(blackUrl);
                        })
                        .then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {

                            let request = har.log.entries.find( (item) => {
                                return item.request.url == blackUrl;
                            });

                            should.not.exist(request);
                            done();
                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
            });

            describe('clearBlackList()', () => {

                it('should clear black list', (done) => {

                    const blackList = [`${moronHTTPUrl}`, `${moronHTTPUrl}/binaryContent`];
                    const codeForInList= 404;
                    const method = 'get|post';
                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            //Browser Mob Client
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setBlackList(codeForInList, blackList[0]);
                        })
                        .then(() => {
                            return browserMobProxyClient.setBlackList(codeForInList, blackList[1], method);
                        })
                        .then(() => {
                            return browserMobProxyClient.clearBlackList();
                        })
                        .then(() => {
                            return browserMobProxyClient.getBlackList();
                        })
                        .then((list) => {

                            list.should.be.empty();

                            done();
                        })
                        .catch((value) => {done(new Error(value));});

                });

            });
        });

        describe('Limit the bandwidth through the proxy  - setLimits(), getLimits()', () => {

            describe('setLimits()', () => {

                it('should setup upstream bandwidth limit ', (done) => {

                    const upstreamKbps = 100;
                    const deltaInPercent = 10;
                    const limitsSetterObject = { upstreamKbps : upstreamKbps};

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            return request(`${moronHTTPUrl}/1MbitContent`,
                                {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                        })
                        .then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {
                            const duration = har.log.entries[0].timings.receive;
                            const currentUpstreamSpeed = (moronHTTP.oneMbitBuffer.length / 1024) / (duration / 1000);

                            let currentDeltaInPercent =  currentUpstreamSpeed/upstreamKbps * 100 - 100;
                           
                            if(currentDeltaInPercent > deltaInPercent){
                                currentDeltaInPercent = upstreamKbps/currentUpstreamSpeed * 100 - 100;
                                if(currentDeltaInPercent <= deltaInPercent) {
                                    done();
                                } else {
                                    done(new Error('Delta between current upstream speed and expected is too big'));
                                }
                            } else {
                                    done();
                            }

                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
                it('should setup downstream bandwidth limit ', (done) => {

                    const downstreamKbps = 100;
                    const deltaInPercent = 10;
                    const limitsSetterObject = { downstreamKbps : downstreamKbps};

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            return request(`${moronHTTPUrl}/upload1Mbit`,
                                {method : 'POST', form : {data : moronHTTP.oneMbitBuffer.toString()},
                                    proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                        })
                        .then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {

                            const duration = har.log.entries[0].timings.send + har.log.entries[0].timings.wait ;
                            const currentDownstreamSpeed = (moronHTTP.oneMbitBuffer.length / 1024) / (duration / 1000);

                            let currentDeltaInPercent =  currentDownstreamSpeed/downstreamKbps * 100 - 100;

                            if(currentDeltaInPercent > deltaInPercent){
                                currentDeltaInPercent = downstreamKbps/currentDownstreamSpeed * 100 - 100;
                                if(currentDeltaInPercent <= deltaInPercent) {
                                    done();
                                } else {
                                    done(new Error('Delta between current downstream speed and expected is too big'));
                                }
                            } else {
                                done();
                            }

                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
                it('should setup latency', (done) => {

                    const latency = 1000;
                    const limitsSetterObject = { latency : latency};

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            return request(`${moronHTTPUrl}`, {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                        })
                        .then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {
                            har.log.entries[0].timings.receive.should.be.aboveOrEqual(latency);
                            done();
                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
                it('should setup how many kilobytes in total the client is allowed to download through the proxy ',
                    (done) => {

                    const downstreamMaxKB = 100;
                    const limitsSetterObject = { downstreamMaxKB : downstreamMaxKB};

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.getLimits();
                        })
                        .then((limits) => {
                            limits.should.have.property('maxDownstreamKB').eql(downstreamMaxKB);
                            done();
                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
                it('should setup how many kilobytes in total the client is allowed to upload through the proxy ',
                    (done) => {

                    const upstreamMaxKB = 100;
                    const limitsSetterObject = { upstreamMaxKB : upstreamMaxKB};

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.getLimits();
                        })
                        .then((limits) => {
                            limits.should.have.property('maxUpstreamKB').eql(upstreamMaxKB);
                            done();
                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
                /*
                skip - look here : https://github.com/lightbody/browsermob-proxy/issues/510
                 */
                it.skip('should disable limits', (done) => {

                    const upstreamKbps = 100;
                    const deltaInPercent = 1;
                    const enable = 'false';


                    let limitsSetterObject = { upstreamKbps : upstreamKbps};
                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            limitsSetterObject = {enable : enable};
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            return request(`${moronHTTPUrl}/1MbitContent`,
                                {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                        })
                        .then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {
                            console.log(har.log.entries[0].timings);
                            const duration = har.log.entries[0].timings.receive;
                            const currentUpstreamSpeed = (moronHTTP.oneMbitBuffer.length / 1024) / (duration / 1000);
                            const currentDeltaInPercent = (currentUpstreamSpeed > upstreamKbps) ?
                                (100 - (currentUpstreamSpeed - upstreamKbps) / currentUpstreamSpeed * 100)
                                : (100 - (upstreamKbps - currentUpstreamSpeed) / upstreamKbps * 100);

                            console.log(`duration : ${duration/1000}, curentDeltaInPercent : ${currentDeltaInPercent}%`);
                            if(currentDeltaInPercent <= deltaInPercent) {
                                done();
                            } else {
                                done(new Error('Delta between current upstream speed and expected is too big'));
                            }

                        })
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
                /*
                 skip - look here : https://github.com/lightbody/browsermob-proxy/issues/511
                 */
                it.skip('should setup percentage of data sent is payload', (done) => {

                    const payloadPercentage = 1;
                    const limitsSetterObject = { payloadPercentage : payloadPercentage};

                    let browserMobProxyClient =  undefined;

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            browserMobProxyClient = client;
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.setLimits(limitsSetterObject);
                        })
                        .then(() => {
                            return browserMobProxyClient.newHar();
                        })
                        .then(() => {
                            return request(`${moronHTTPUrl}/upload1Mbit`,
                                {method : 'POST', form : {data : moronHTTP.oneMbitBuffer.toString()},
                                    proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                        })
                        .then(() => {
                            console.log(`request is ended`);
                            done(new Error('not tested'));
                        })
                        /*.then(() => {
                            return browserMobProxyClient.getHar();
                        })
                        .then((har) => {
                            console.log(har.log.entries[0].timings);
                            const duration = har.log.entries[0].timings.receive;
                            const currentUpstreamSpeed = (moronHTTP.oneMbitBuffer.length / 1024) / (duration / 1000);
                            const currentDeltaInPercent = (currentUpstreamSpeed > upstreamKbps) ?
                                (100 - (currentUpstreamSpeed - upstreamKbps) / currentUpstreamSpeed * 100)
                                : (100 - (upstreamKbps - currentUpstreamSpeed) / upstreamKbps * 100);

                            console.log(`duration : ${duration/1000}, curentDeltaInPercent : ${currentDeltaInPercent}%`);
                            if(currentDeltaInPercent <= deltaInPercent) {
                                done();
                            } else {
                                done(new Error('Delta between current upstream speed and expected is too big'));
                            }

                        })*/
                        .catch((value) => {
                            console.log(value);
                            done(new Error(value));});
                });
            });

            describe('getLimits()',  () => {

                it('should return limits', (done) => {

                    (new bmpClient(bmpHost, bmpPort)).create()
                        .then((client) => {
                            return client.getLimits();
                        })
                        .then((limits) => {
                            limits.should.have.property('maxUpstreamKB', 0);
                            limits.should.have.property('maxDownstreamKB', 0);
                            limits.should.have.property('remainingUpstreamKB', 0);
                            limits.should.have.property('remainingDownstreamKB', 0);
                            done();
                        })
                        .catch((value) => {done(new Error(value));});
                });
            });
        });

        describe('Overrides normal DNS lookups and remaps the given hosts with the associated IP address - overrideDNS()', () => {

            it('should overrides normal DNS lookups ', (done) => {

                const overrideDNS = {};
                const url = 'http://www.example.com:58080';
                const urlToOverride = 'www.example.com';
                const urlRemapped = bmpHost;

                let browserMobProxyClient =  undefined;

                overrideDNS[urlToOverride] = urlRemapped;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.overrideDNS(overrideDNS);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        //Create new selenium session
                        return request(`${url}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        const content = har.log.entries[0].response.content.text;
                        content.should.be.equal(moronHTTP.defaultContent);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });
        });

        describe('Sets automatic basic authentication for the specified domain - setAutoAuthentication ()', () => {

            it('should set automatic basic authentication  ', (done) => {

                const auth = { 'username' : moronHTTP.authUserName, 'password' : moronHTTP.authPassword};
                const domain  = bmpHost;

                let browserMobProxyClient =  undefined;


                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setAutoAuthentication(auth, domain);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/auth`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        const content = har.log.entries[0].response.content.text;
                        content.should.be.equal(moronHTTP.defaultContent);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });
        });

        //TODO write a right test suite for setWait() method. See here : https://github.com/lightbody/browsermob-proxy/blob/f65e9b3aea1672a8b6b121a7a7c41f973e7cfedf/browsermob-core/src/main/java/net/lightbody/bmp/BrowserMobProxy.java#L552
        describe.skip('Wait till all request are being made - setWait()', () => {

            it('should ...', (done) => {

                const quietPeriodInMs = 5000;

                let browserMobProxyClient =  undefined;
                let startTime = undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        startTime = Date.now();
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        browserMobProxyClient.setWait({quietPeriodInMs : quietPeriodInMs, timeoutInMs : quietPeriodInMs});
                        return request(`${moronHTTPUrl}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});

                    })
                    .then(() => {
                        console.log(`time : ${Date.now() - startTime}`);
                        startTime = Date.now();
                        return request(`${moronHTTPUrl}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        console.log(har.log.entries)
                        console.log(`time : ${Date.now() - startTime}`);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });
        });

        //TODO write a right a nd all tests suite for setTimeouts() method.
        describe.skip('Handles different proxy timeouts - setTimeouts()', () => {
            //TODO write a right test for 'requestTimeout' param. See here : https://github.com/lightbody/browsermob-proxy/blob/9443605d3e6458248831663ab19e041c0859316f/browsermob-core/src/main/java/net/lightbody/bmp/BrowserMobProxyServer.java#L695
            it('should set request timeout', (done) => {

                const requestTimeout = 1;

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setTimeouts({requestTimeout : requestTimeout});
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/readTimeout`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        har.log.entries.forEach((entry) => {

                            console.log(entry.timings);
                        });
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

            it('should set read timeout', (done) => {

                const readTimeout = 1;

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setTimeouts({readTimeout : readTimeout});
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar();
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/readTimeout`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        har.log.entries.forEach((entry) => {

                            console.log(entry.timings);
                        });
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });
        });

        describe('Redirecting URL\'s - setRedirectUrls(), removeRedirects()', () => {

            it('should set redirect url - setRedirectUrls()', (done) => {

                const replace = `${moronHTTPUrl}`;
                const match = `https?://www\\.google\\.com/.*`;
                const url = 'http://www.google.com';

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setRedirectUrls({matchRegex : match, replace : replace});
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        return request(`${url}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        const content = har.log.entries[0].response.content.text;
                        content.should.be.equal(moronHTTP.defaultContent);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

            it('should delete redirect url - removeRedirects()', (done) => {

                const replace = `${moronHTTPUrl}`;
                const match = `https?://www\\.google\\.com/.*`;
                const url = 'http://www.google.com';

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setRedirectUrls({matchRegex : match, replace : replace});
                    })
                    .then(() => {
                        return browserMobProxyClient.removeRedirects();
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        return request(`${url}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        const content = har.log.entries[0].response.content.text;
                        content.should.not.be.equal(moronHTTP.defaultContent);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });
        });

        describe('Setting the retry count - setRetries()', () => {

            it('should set retries number - setRetries()', (done) => {

                const retries = 5;
                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setRetries(retries);
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}//retries`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        const content = har.log.entries[0].response.content.text;
                        content.should.be.equal(retries);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

        });

        //TODO write a right tests suite for clearDNSCache() method.

        describe.skip('Empties the DNS cache - clearDNSCache()', () => {

            it('should clear DNS cache - clearDNSCache()', (done) => {

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.clearDNSCache();
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true, true);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        done(new Error('No test yet!'));
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

        });

        describe('Describe your own request interception - setRequestInterception()', () => {

            it('should set userAgent by interception - setRequestInterception()', (done) => {

                const headerName = 'User-Agent';
                const headerValue = 'INTERCEPTION';
                const interceptionRule = `request.headers().add('${headerName}', '${headerValue}');`;

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.clearDNSCache();
                    })
                    .then(() => {
                        return browserMobProxyClient.newHar(true);
                    })
                    .then(() => {
                        return browserMobProxyClient.setRequestInterception(interceptionRule);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then(() => {
                        return browserMobProxyClient.getHar();
                    })
                    .then((har) => {
                        const userAgent = har.log.entries[0].request.headers.find((header) => {
                            return header.name === headerName;
                        });
                        userAgent.value.should.be.equal(headerValue);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

        });
        describe('Describe your own response interception - setResponseInterception()', () => {

            it('should change response content by interception - setResponseInterception()', (done) => {

                const interceptionContent = 'INTERCEPTION';
                const interceptionRule = `contents.setTextContents('${interceptionContent}');`;

                let browserMobProxyClient =  undefined;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setResponseInterception(interceptionRule);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/plain`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then((response) => {
                        response.should.be.equal(interceptionContent);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));
                    });
            });

        });

        describe('Set and override HTTP Request headers - setHeaders()', () => {

            it('should set HTTP header', (done) => {

                const headerName = "some";
                const headerValue = "BrowserMob-Proxy";
                const header = {};

                let browserMobProxyClient = undefined;

                header[headerName] = headerValue;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setHeaders(header);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/returnHeaders`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then((response) => {
                        response.should.have.property(headerName).equal(headerValue);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

            it('should add header value to existing header name', (done) => {

                const headerName = "some-header";
                const headerValue = "some-value-of-header";
                const headerValueAdded = "value-of-header-added";
                const requestHeaders = {}
                const headerOverride = {};

                let browserMobProxyClient = undefined;

                requestHeaders[headerName] = headerValue;
                headerOverride[headerName] = headerValueAdded;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setHeaders(headerOverride);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/returnHeaders`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`,
                                headers : requestHeaders});
                    })
                    .then((response) => {
                        response.should.have.property(headerName).equal(`${headerValue}, ${headerValueAdded}`);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
            });

            it('should override header value', (done) => {

                const headerName = "some-header";
                const headerValue = "some-value-of-header";
                const headerValueOverride = "value-of-header-override";
                const header = {}
                const headerOverride = {};

                let browserMobProxyClient = undefined;

                header[headerName] = headerValue;
                headerOverride[headerName] = headerValueOverride;

                (new bmpClient(bmpHost, bmpPort)).create()
                    .then((client) => {
                        browserMobProxyClient = client;
                        return browserMobProxyClient.setHeaders(header);
                    })
                    .then(() => {
                        return browserMobProxyClient.setHeaders(headerOverride);
                    })
                    .then(() => {
                        return request(`${moronHTTPUrl}/returnHeaders`,
                            {method : 'GET', proxy : `http://${bmpHost}:${browserMobProxyClient.port}`});
                    })
                    .then((response) => {
                        response.should.have.property(headerName).equal(headerValueOverride);
                        done();
                    })
                    .catch((value) => {
                        console.log(value);
                        done(new Error(value));});
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

