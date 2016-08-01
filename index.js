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

/** Class - client for interaction with BrowserMob Proxy REST API Server. */
class browserMobProxyClientApi {

    constructor(urlServerAPI, clientHost, clientPort, trustAllServers = true) {
        //save url to BrowserMob Proxy API Server
        this.serverUrl = urlServerAPI;

        //api path and options
        let apiUrl = `${this.serverUrl}/proxy?trustAllServers=${trustAllServers}`;
        const options = { method : 'POST' };

        //connect to external proxy, if needed
        if(clientHost && clientPort){
            apiUrl = `${this.serverUrl}/proxy?httpProxy=${clientHost}:${clientPort}&trustAllServers=${trustAllServers}`;
        }
        //create new proxy
        const self = this;

        return co(function* (){
            const port = yield browserMobProxyClient[bmpRequest](apiUrl, options);
            self.port = port.port;
            self.apiUrl = `${self.serverUrl}/proxy/${self.port}`;
            return self;
        });
    };

    //new version
    newHar(boolCaptureHeaders = true, boolCaptureBody = false, boolCaptureAllContent = false, pageRef, pageTitle) {

        const form = {captureHeaders : boolCaptureHeaders, captureContent : boolCaptureBody, captureBinaryContent : boolCaptureAllContent};

        if(pageRef) {
            form.initialPageRef = pageRef;
        }

        if(pageTitle) {
            form.initialPageTitle = pageTitle;
        }

        let apiUrl = `${this.apiUrl}/har`;
        let options = { method : 'PUT', form : form};

        return co(function* (){
            let result = yield browserMobProxyClient[bmpRequest](apiUrl, options);
            return result;
        });
    };
    //new version
    startPage({pageRef, pageTitle} = {}) {
        const form = {};

        if(pageRef) {
            form.pageRef  = pageRef;
        }

        if(pageTitle) {
            form.pageTitle = pageTitle;
        }
        let apiUrl = `${this.apiUrl}/har/pageRef`;
        let options = { method : 'PUT', form : form};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl,options);
        });
    };
    //new version
    close() {
        const apiUrl = `${this.apiUrl}`;
        const options = {method : 'DELETE'};

        return co(function* (){
            return browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    //new version
    getHar() {
        const apiUrl = `${this.apiUrl}/har`;
        let options = { method : 'GET' };

        return co(function* (){
            let result = yield browserMobProxyClient[bmpRequest](apiUrl, options);
            return result;
        });
    };
    //new version
    getWhiteList() {

        const apiUrl = `${this.apiUrl}/whitelist`;
        const options = { method : 'GET' };

        return co(function* (){
            let result = yield browserMobProxyClient[bmpRequest](apiUrl, options);
            return result;
        });
    };
    //new version
    setWhiteList(httpCodeStatus, regexps) {

        const apiUrl = `${this.apiUrl}/whitelist`;
        const options = { method : 'PUT', form : {regex : regexps.join(','), status : httpCodeStatus}};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    //new version
    clearWhiteList() {

        const apiUrl = `${this.apiUrl}/whitelist`;
        let options = { method : 'DELETE'};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    //new version
    getBlackList() {

        const apiUrl = `${this.apiUrl}/blacklist`;
        const options = { method : 'GET' };

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    //new version
    /**
     * Object that represent black list item
     * @typedef {object} BlackListedUrl
     * @property urlPattern {string} incoming regexp for blocking
     * @property statusCode {number} incoming http code is returned for blocked url
     * @property httpMethodPattern {string} incoming  regular expression for matching HTTP method (GET, POST, PUT, etc). If null processing all HTTP method.
     * @property method {string} regular expression for matching HTTP method (GET, POST, PUT, etc). If null processing all HTTP method.
     * @property responseCode {number} http code is returned for blocked url
     * @property pattern {string} incoming regexp for blocking
     */
    /**
     * Setup url to black list
     * @param {number} httpCodeStatus - The HTTP status code to return for URLs that are blacklisted
     * @param {string} regexp - The blacklist regular expression
     * @param {string} [methodsRegexp] - The regular expression for matching HTTP method (GET, POST, PUT, etc). Optional, by default processing all HTTP method
     * @returns {Promise<BlackListedUrl[]>}
     */
    setBlackList(httpCodeStatus, regexp, methodsRegexp) {

        let form = {regex : regexp, status : httpCodeStatus};

        if(methodsRegexp){
            form.method = methodsRegexp;
        }

        const apiUrl = `${this.apiUrl}/blacklist`;
        const options = { method : 'PUT', form : form};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    //new version
    clearBlackList() {

        const apiUrl = `${this.apiUrl}/blacklist`;
        let options = { method : 'DELETE'};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    //new version
    /**
     * Object for setting up limits of BrowserMob Proxy
     * @typedef {object} LimitsSetterObject
     * @property {number} [downstreamKbps] - Downstream bandwidth limit in kbps
     * @property {number} [downstreamBps] - Downstream bandwidth limit in bit per second
     * @property {number} [upstreamKbps] - Upstream bandwidth limit in kbps
     * @property {number} [upstreamBps] - Upstream bandwidth limit in bit per second
     * @property {number} [downstreamMaxKB] - Specifies how many kilobytes in total the client is allowed to download through the proxy
     * @property {number} [upstreamMaxKB] - Specifies how many kilobytes in total the client is allowed to upload through the proxy
     * @property {number} [latency=0] - Add the given latency to each HTTP request. By default all requests are invoked without latency
     * @property {boolean} [enable=false] - A boolean that enable bandwidth limiter. Setting any of the properties above will implicitly enable throttling
     * @property {number} [payloadPercentage] - Specifying what percentage of data sent is payload, e.g. use this to take into account overhead due to tcp/ip
     * @property {number} [maxBitsPerSecond] - The max bits per seconds you want this instance of StreamManager to respect
     */
    /**
     * Sets the downstream bandwidth limit in kbps
     * @param {LimitsSetterObject} [browserMobProxyLimitObject]
     * @returns {Promise}
     */
    setLimits(limitsSetterObject) {

        const apiUrl = `${this.apiUrl}/limit`;
        const options = { method : 'PUT', form : limitsSetterObject};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    /**
     * Object describes amount of data remaining to be uploaded/downloaded until the limit is reached
     * @typedef {object} LimitsGetterObject
     * @property {number} maxUpstreamKB - Show maxUpstreamKB set by {@link browserMobProxyClientApi#setLimits}
     * @property {number} maxDownstreamKB - Show maxDownstreamKB set by {@link browserMobProxyClientApi#setLimits}
     * @property {number} remainingUpstreamKB - Show how many kilobytes will be uploaded before the limit is reached
     * @property {number} remainingDownstreamKB - Show how many kilobytes will be downloaded before the limit is reached
     */
    /**
     * Displays the amount of data remaining to be uploaded/downloaded until the limit is reached
     * @returns {Promise<LimitsGetterObject>}
     */
    getLimits() {

        const apiUrl = `${this.apiUrl}/limit`;
        const options = { method : 'GET' };

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    /**
     * Set and override HTTP Request headers
     * @param {object} headers - Represents set of headers, where key is a header name and value is a value of HTTP header
     * @returns {Promise}
     */
    setHeaders(headers) {

        const apiUrl = `${this.apiUrl}/headers`;
        const options = { method : 'POST',  json : true, body : headers};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };

    /**
     * Overrides normal DNS lookups and remaps the given hosts with the associated IP address
     * @param {object} dns - Represents set of of hosts, where key is a host name and value is a IP address which associated with host name
     * @returns {Promise}
     */
    overrideDNS (dns) {

        const apiUrl = `${this.apiUrl}/hosts`;
        const options = { method : 'POST',  json : true, body : dns};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };
    /**
     * Sets automatic basic authentication for the specified domain. This method supports only BASIC authentication.
     * @param {object} auth - Object describes authentication data
     * @param {string} auth.username - Login
     * @param {string} auth.password - Password
     * @param {string} domain - At the domain will be applying basic auth
     * @returns {Promise}
     */
    setAutoAuthentication (auth, domain) {

        const apiUrl = `${this.apiUrl}/auth/basic/${domain}`;
        const options = { method : 'POST',  json : true, body : auth};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    }

    /**
     * Wait till all request are being made
     * @param {object} waitObject - Object describes waits data
     * @param {number} waitObject.quietPeriodInMs - amount of time after which network traffic will be considered "stopped"
     * @param {number} waitObject.timeoutInMs - maximum amount of time to wait for network traffic to stop
     * @returns {Promise}
     */
    setWait(waitObject){

        for(let waitProperty in waitObject) {
            waitObject[waitProperty] = waitObject[waitProperty].toString();
        }

        const apiUrl = `${this.apiUrl}/wait`;
        const options = { method : 'PUT',  form : waitObject};



        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    }

    /**
     * Handles different proxy timeouts. The new LittleProxy implementation requires that all timeouts be set before start Proxy, because of it tests skipped.
     * @param {object} timeoutObj - Describes timeout object
     * @param {number} requestTimeout - Request timeout in milliseconds. timeout value of -1 is interpreted as infinite timeout.
     * @param {number} readTimeout  - Read timeout in milliseconds. Which is the timeout for waiting for data or, put differently, a maximum period inactivity between two consecutive data packets. A timeout value of zero is interpreted as an infinite timeout.
     * @param {number} connectionTimeout  - Determines the timeout in milliseconds until a connection is established. A timeout value of zero is interpreted as an infinite timeout.
     * @param {number} dnsCacheTimeout  -  Sets the maximum length of time that records will be stored in this Cache. A nonpositive value disables this feature
     * @returns {Promise}
     */
    setTimeouts(timeoutObj){

        for(let timeoutProperty in timeoutObj) {
            timeoutObj[timeoutProperty] = timeoutObj[timeoutProperty].toString();
        }

        const apiUrl = `${this.apiUrl}/timeout`;
        const options = { method : 'PUT',  json : true, body : timeoutObj};



        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    }

    /**
     * Redirecting URL's
     * @param redirectObj - Describes redirect object
     * @param {string} redirectObj.matchRegex - a matching URL regular expression
     * @param {string} redirectObj.replace - replacement URL
     * @returns {Promise}
     */
    setRedirectUrls(redirectObj){

        const apiUrl = `${this.apiUrl}/rewrite`;
        const options = { method : 'PUT',  form : redirectObj};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };

    /**
     * Removes all URL redirection rules currently in effect
     * @returns {Promise}
     */
    removeRedirects(){

        const apiUrl = `${this.apiUrl}/rewrite`;
        const options = { method : 'DELETE'};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };

    /**
     * Setting the retry count
     * @param {number} numberOfTries - The number of times a method will be retried
     * @returns {Promise}
     */
    setRetries(numberOfTries){

        const apiUrl = `${this.apiUrl}/retry`;
        const options = { method : 'PUT',  form : {retrycount : numberOfTries}};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
        });
    };

    /**
     * Empties the DNS cache
     * @returns {Promise}
     */
    clearDNSCache(){

        const apiUrl = `${this.apiUrl}/dns/cache`;
        const options = { method : 'DELETE'};

        return co(function* (){
            return yield browserMobProxyClient[bmpRequest](apiUrl, options);
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
