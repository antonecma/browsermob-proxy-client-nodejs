'use strict';

const request = require('request');
const co = require('co');
const typed = require('typedproxy');
const net = require('net');


const typesBrowserMobProxyClient = {
    'ip4' : (value) => {

        const typeOfValue = {}.toString.call(value).slice(8, -1);

        if (typeOfValue !== 'String') {
            throw new TypeError(`ip4 parameter must be String instance, not ${typeOfValue}`);
        }
        if (!net.isIPv4(value)) {
            throw new TypeError(`ip4 parameter must be String instance, not ${typeOfValue}`);
        }
    },
    'port' : (value) => {

        const typeOfValue = {}.toString.call(value).slice(8, -1);

        if (typeOfValue !== 'Number') {
            throw new TypeError(`port parameter must be Number instance, not ${typeOfValue}`);
        }
        if (!Number.isSafeInteger(value)) {
            throw new TypeError(`port parameter must be safe integer value`);
        }
        if (value < 0 || value > 65535 ) {
            throw new TypeError(`port parameter must be more than 0, and less than 65535, not ${value}`);
        }
    }
};

const clients = Symbol();
const closeProxyMethod = Symbol();
const bmpRequest = Symbol();

const browserMobProxyClient = class browserMobProxyClient {

    constructor(ip4Host, portPort){

        this.host = ip4Host;
        this.port = portPort;
        this.url = `http://${ip4Host}:${portPort}`;
        this[clients] = [];

    };

    static [bmpRequest](urlApi, anyParam) {

        anyParam = anyParam || {method : 'GET'};

        return new Promise((resolve, reject) => {
            request(urlApi, anyParam, (error, response, body) => {
                console.log(`request : ${urlApi}; method : ${anyParam.method}`);
                if(error) {
                    console.log('Error (FAIL) : ', error);
                    return reject(error);
                } else {
                    try {
                        console.log('parsed body : ', JSON.parse(body));
                        return resolve(JSON.parse(body));
                    }catch(bodyError){
                        try{
                            if(response.statusCode == 200 || response.statusCode == 204){
                                console.log('parsed status (OK) : ', response.statusCode);
                                if(body) {
                                    return resolve(JSON.parse(body));
                                } else {
                                    return resolve();
                                }
                            } else {
                                console.log('parsed status (FAIL) : ', response.statusCode);
                                return reject(response);
                            }
                        } catch(responseError) {
                            console.log('responseError (FAIL) : ', response.statusCode);
                            return reject(responseError);
                        }
                    }
                };
            });
        });
    };

    getProxiesList() {

        const apiUrl = `${this.url}/proxy`;

        return co(function* (){
            let list = yield browserMobProxyClient[bmpRequest](apiUrl);
            return list.proxyList;
        });
    };

    [closeProxyMethod](portProxy) {

        const apiUrl = `${this.url}/proxy/${portProxy}`;
        const options = {method : 'DELETE'};

        return browserMobProxyClient[bmpRequest](apiUrl, options);
    };

    create() {

        const self = this;

        return co(function* (){
            const client = new browserMobProxyClientApi(self.url);
            self[clients].push(client);
            return client;
        });
    };
    getOwnProxiesList(){
        const self = this;

        return co(function* (){
            let proxyList = [];
            for(let resolvedPromiseClient of self[clients]){
                const client = yield resolvedPromiseClient;
                proxyList.push(client);
            };
            return proxyList;
        });
    };
    closeAllOwnProxies() {
        const self = this;

        return co(function* (){
            const proxyList = yield self.getOwnProxiesList();
            for(let proxy of proxyList){
                yield self[closeProxyMethod](proxy.port);
                self[clients].shift();
            }
        });
    };

};

class browserMobProxyClientApi {

    constructor(urlServerAPI, clientHost, clientPort) {
        //save url to BrowserMob Proxy API Server
        this.serverUrl = urlServerAPI;

        //api path and options
        let apiUrl = `${this.serverUrl}/proxy`;
        const options = { method : 'POST' };

        //connect to external proxy, if needed
        if(clientHost && clientPort){
            apiUrl = `${this.serverUrl}/proxy?httpProxy=${clientHost}:${clientPort}`;
        }
        //create new proxy
        const self = this;

        return co(function* (){
            const port = yield browserMobProxyClient[bmpRequest](apiUrl, options);
            self.port = port.port;
            return self;
        });
    };

    attach({port}) {
        if(parseInt(port)) this._lpPort = port;
        else throw new Error('To attach to little proxy instance, you must use NUMBER of created port');
        return;
    };

    close() {
        if(this._lpPort){
            let self = this;
            return co(function* (){
                yield self.closeProxy({port : self._lpPort})
            });
        }
        else{
            throw new Error(`_lpProt does't setup. It looks like that you does't invoke create() of lpClass instance.`);
        }
    };

    newHar(boolCaptureHeaders = true, boolCaptureBody = false, boolCaptureAllContent = false, pageRef, pageTitle) {

        const form = {captureHeaders : boolCaptureHeaders, captureContent : boolCaptureBody, captureBinaryContent : boolCaptureAllContent};

        if(pageRef) {
            form.initialPageRef = pageRef;
        }

        if(pageTitle) {
            form.initialPageTitle = pageTitle;
        }

        let apiUrl = `${this.serverUrl}/proxy/${this.port}/har`;
        let options = { method : 'PUT', form : form};

        return co(function* (){
            let result = yield browserMobProxyClient[bmpRequest](apiUrl, options);
            return result;
        });
    };

    newPage({pageRef='', pageTitle=''}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/har/pageRef`;
        let options = { method : 'PUT', form : {pageRef : pageRef, pageTitle : pageTitle}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl,options);
            return result;
        });
    };

    getHar() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/har`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    displayWhiteList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/whitelist`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    setWhiteList({regex = '', status = 200}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/whitelist`;
        let options = { method : 'PUT', form : {regex : regex, status : status}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    clearWhiteList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/whitelist`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    displayBlackList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/blacklist`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    setBlackList({regex = '', status = 200, method = ''}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/blacklist`;
        let options = { method : 'PUT', form : {regex : regex, status : status, method : method}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    clearBlackList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/blacklist`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    setLimit({downstreamKbps = 0, upstreamKbps = 0, upstreamMaxKbps = 0, latency = 0, enable = false,
        payloadPercentage = 100, maxBitsPerSecond = 0}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/limit`;

        let limitParameter = {downstreamKbps : downstreamKbps, upstreamKbps : upstreamKbps,
            upstreamMaxKbps : upstreamMaxKbps, latency : latency, enable : enable, payloadPercentage : payloadPercentage,
            maxBitsPerSecond : maxBitsPerSecond};

        let options = { method : 'PUT', form : limitParameter};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    getLimit() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/limit`;
        let options = { method : 'GET'};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    setHeaders(headers) {

        headers = headers || {};

        let apiUrl = `${this.url}/proxy/${this._lpPort}/headers`;
        try {
            let options = { method : 'POST', json : true, body : headers};

            return co(function* (){
                let result = yield lpClass[bmpRequest](apiUrl, options);
                return result;
            });
        } catch (err){
            throw err;
        }
    };

    overrideDNS (dns) {

        dns = dns || {};

        let apiUrl = `${this.url}/proxy/${this._lpPort}/headers`;
        let options = { method : 'POST', json : dns};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    //does it work? test fails
    waitRequests({quitePeriodInMs = 0, timeoutInMs = 0}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/wait`;
        let options = { method : 'PUT', form : {quitePeriodInMs : quitePeriodInMs, timeoutInMs : timeoutInMs}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    //does not significant than payload must be in json coded type?
    setTimeouts({requestTimeout = -1, readTimeout = 60000, connectionTimeout = 60000, dnsCacheTimeout = 0}) {
        let apiUrl = `${this.url}/proxy/${this._lpPort}/timeout`;
        let options = { method : 'PUT', json : {requestTimeout : requestTimeout, readTimeout : readTimeout,
            connectionTimeout : connectionTimeout, dnsCacheTimeout : dnsCacheTimeout}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    redirectUrls({matchRegex = '', replace = ''}) {
        let apiUrl = `${this.url}/proxy/${this._lpPort}/rewrite`;
        let options = { method : 'PUT', form : {matchRegex : matchRegex, replace : replace}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    removeRedirectedUrls(){

        let apiUrl = `${this.url}/proxy/${this._lpPort}/rewrite`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    //does this method clear the DNS cache?
    clearCache(){

        let apiUrl = `${this.url}/proxy/${this._lpPort}/dns/cache`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    setAuthToDomain({domain,  username, password}){

        let apiUrl = `${this.url}/proxy/${this._lpPort}/auth/basic/${domain}`;
        let options = { method : 'POST', json : {username : username, password : password}};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    changeHeader({headerName, headerValue}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/filter/request`;
        let options = { method : 'POST',
            body : `request.headers().remove('${headerName}'); request.headers().add('${headerName}', '${headerValue}');`};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };

    deleteHeader({headerName}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/filter/request`;
        let options = { method : 'POST',
            body : `request.headers().remove('${headerName}');`};

        return co(function* (){
            let result = yield lpClass[bmpRequest](apiUrl, options);
            return result;
        });
    };
};

const typedBrowserMobProxyClient = new typed(browserMobProxyClient, typesBrowserMobProxyClient);
module.exports = typedBrowserMobProxyClient;
