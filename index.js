'use strict';

var request = require('request');
var co = require('co');




class browserMobProxyClient {

    constructor(options){

    };

    static _request(url, param) {
        param = param || {method : 'GET'};
        return new Promise((resolve, reject) => {
            request(url, param, (error, response, body) => {
                if(error) return reject(error);
                else {
                    try {
                        return resolve(JSON.parse(body));
                    }catch(bodyError){
                        try{
                            if(response.statusCode == 200 || response.statusCode == 204) return resolve(response);
                            else return reject(response);
                        }catch(responseError){
                            return reject(responseError);
                        }
                    }
                };
            });
        });
    };

    getProxiesList() {
        let apiUrl = `${this.url}/proxy`;

        return co(function* (){
            let list = yield lpClass._request(apiUrl);
            return list.proxyList;
        });
    };
    closeProxy({port}) {
        let apiUrl = `${this.url}/proxy/${port}`;
        let options = {method : 'DELETE'};

        return co(function* (){
            yield lpClass._request(apiUrl, options);
            return;
        });

    };

    closeAllProxies() {

        let self = this;

        return co(function* (){
            let list = yield self.getProxiesList();

            for(let item of list){
                yield self.closeProxy(item);
            }
        });
    };

};

class lpClientClass extends browserMobProxyClient {

    constructor(paramObj) {
        paramObj = paramObj || {};
        super(paramObj);
    };


    create({optionalPort, proxyAddress, proxyPort}) {

        let self = this;
        let apiUrl = '';
        let options = { method : 'POST' };


        if(proxyAddress || proxyPort){

            this._proxyAddres = proxyAddress;
            this._proxyPort = proxyPort;

            apiUrl = `${this.url}/proxy?httpProxy=${proxyAddress}:${proxyPort}`;
        }
        else apiUrl = `${this.url}/proxy`;



        return co(function* (){

            let port = yield lpClass._request(apiUrl, options);
            self._lpPort = port.port;
            return port.port;

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

    newHar({initialPageRef='', initialPageTitle='', captureHeaders = true, captureContent = false, captureBinaryContent = false}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/har`;
        let options = { method : 'PUT', form : {initialPageRef : initialPageRef, initialPageTitle : initialPageTitle,
        captureHeaders : captureHeaders, captureContent : captureContent, captureBinaryContent : captureBinaryContent}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl,options);
            return result;
        });
    };

    newPage({pageRef='', pageTitle=''}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/har/pageRef`;
        let options = { method : 'PUT', form : {pageRef : pageRef, pageTitle : pageTitle}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl,options);
            return result;
        });
    };

    getHar() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/har`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    displayWhiteList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/whitelist`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    setWhiteList({regex = '', status = 200}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/whitelist`;
        let options = { method : 'PUT', form : {regex : regex, status : status}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    clearWhiteList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/whitelist`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    displayBlackList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/blacklist`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    setBlackList({regex = '', status = 200, method = ''}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/blacklist`;
        let options = { method : 'PUT', form : {regex : regex, status : status, method : method}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    clearBlackList() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/blacklist`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
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
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    getLimit() {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/limit`;
        let options = { method : 'GET'};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    setHeaders(headers) {

        headers = headers || {};

        let apiUrl = `${this.url}/proxy/${this._lpPort}/headers`;
        try {
            let options = { method : 'POST', json : true, body : headers};

            return co(function* (){
                let result = yield lpClass._request(apiUrl, options);
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
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    //does it work? test fails
    waitRequests({quitePeriodInMs = 0, timeoutInMs = 0}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/wait`;
        let options = { method : 'PUT', form : {quitePeriodInMs : quitePeriodInMs, timeoutInMs : timeoutInMs}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    //does not significant than payload must be in json coded type?
    setTimeouts({requestTimeout = -1, readTimeout = 60000, connectionTimeout = 60000, dnsCacheTimeout = 0}) {
        let apiUrl = `${this.url}/proxy/${this._lpPort}/timeout`;
        let options = { method : 'PUT', json : {requestTimeout : requestTimeout, readTimeout : readTimeout,
            connectionTimeout : connectionTimeout, dnsCacheTimeout : dnsCacheTimeout}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    redirectUrls({matchRegex = '', replace = ''}) {
        let apiUrl = `${this.url}/proxy/${this._lpPort}/rewrite`;
        let options = { method : 'PUT', form : {matchRegex : matchRegex, replace : replace}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    removeRedirectedUrls(){

        let apiUrl = `${this.url}/proxy/${this._lpPort}/rewrite`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    //does this method clear the DNS cache?
    clearCache(){

        let apiUrl = `${this.url}/proxy/${this._lpPort}/dns/cache`;
        let options = { method : 'DELETE'};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    setAuthToDomain({domain,  username, password}){

        let apiUrl = `${this.url}/proxy/${this._lpPort}/auth/basic/${domain}`;
        let options = { method : 'POST', json : {username : username, password : password}};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    changeHeader({headerName, headerValue}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/filter/request`;
        let options = { method : 'POST',
            body : `request.headers().remove('${headerName}'); request.headers().add('${headerName}', '${headerValue}');`};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };

    deleteHeader({headerName}) {

        let apiUrl = `${this.url}/proxy/${this._lpPort}/filter/request`;
        let options = { method : 'POST',
            body : `request.headers().remove('${headerName}');`};

        return co(function* (){
            let result = yield lpClass._request(apiUrl, options);
            return result;
        });
    };
};

module.exports = browserMobProxyClient;
