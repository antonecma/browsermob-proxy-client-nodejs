# Browsermob-proxy-client-nodejs
HTTP client is interacting with BrowserMobProxy backend trough REST API. With LittleProxy implementation only.
##Installation
```
npm i browsermob-proxy-client-nodejs
```
##Example
```javascript
const bmpClient = require('browsermob-proxy-client-nodejs');

const bmpHost = '127.0.0.1'; //ip where BrowserMob Proxy was started
const bmpPort = 9090; //tcp port where BrowserMob Proxy was started

let browserMobProxyClient = undefined;

(new bmpClient(bmpHost, bmpPort)).create()
  .then((client) => {
    //Browser Mob Client
    browserMobProxyClient = client;
  })
  .then(() => {
  //start capture a traffic
    return browserMobProxyClient.newHar();
  })
  .then(() => {
    //make some request through browsermob proxy, that has started above
    const proxy = `http://${bmpHost}:${browserMobProxyClient.port}` 
    return makeSomeRequestThroughProxy(proxy); //it is a imaginary function
  })
  .then(() => {
    //get HAR
    return browserMobProxyClient.getHar();
  })
 .then((har) => {
    //make some action with HAR
    console.log(har);
  })
 .catch((value) => {done(new Error(value));});
```

##Usage
First, you must start BrowserMob Proxy something like :
```
java -jar ./path/to/browsermobproxy.jar -port 9090
```

Ok, we may start coding:

-

> Include **browsermob-proxy-client-nodejs** module in your application : 

```javascript
const bmp = require('browsermob-proxy-client-nodejs');
```

-

> Create an object(**bmpSet**)for service set of browserMob Proxy instances. : 

```javascript
const bmpHost = '127.0.0.1';
const bmpPort = 9090; 

const bmpSet = new bmp(bmpHost, bmpPort);
```

-

> Now, we are ready to create client for interacting with BrowserMob Proxy. 
Then, we can invoke all methods, that described [below](#clientMethods). Each method is Promise. 

```javascript
bmpSet.create()
  .then((client) => {
    return client.close();
  });
```

##Client methods

<a name="browserMobProxyClientApi+newHar"></a>

##### newHar([boolCaptureHeaders], [boolCaptureBody], [boolCaptureAllContent], [pageRef], [pageTitle])
Creates a new HAR attached to the proxy and returns the HAR content if there was a previous HAR


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [boolCaptureHeaders] | <code>boolean</code> | <code>true</code> | capture headers or not |
| [boolCaptureBody] | <code>boolean</code> | <code>false</code> | capture content bodies or not |
| [boolCaptureAllContent] | <code>boolean</code> | <code>false</code> | capture binary content or not. |
| [pageRef] | <code>string</code> | <code>&quot;&#x27;Page 1&#x27;&quot;</code> | the string name of the first page ref that should be used in the HAR |
| [pageTitle] | <code>string</code> | <code>&quot;&#x27;Page 1&#x27;&quot;</code> | the title of first HAR page |

<a name="browserMobProxyClientApi+startPage"></a>

### browserMobProxyClientApi.startPage([newPageTitleObject], [pageRef], [pageTitle]) ⇒ <code>Promise.&lt;(undefined\|Error)&gt;</code>
Starts a new page on the existing HAR

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [newPageTitleObject] | <code>object</code> |  | - |
| [pageRef] | <code>string</code> | <code>&quot;&#x27;Page N&#x27;&quot;</code> | The string name of the first page ref that should be used in the HAR. |
| [pageTitle] | <code>string</code> | <code>&quot;&#x27;Page N&#x27;&quot;</code> | The title of new HAR page |

<a name="browserMobProxyClientApi+close"></a>

### browserMobProxyClientApi.close() ⇒ <code>Promise.&lt;(undefined\|Error)&gt;</code>
Shuts down the proxy and closes the port.

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+getHar"></a>

### browserMobProxyClientApi.getHar() ⇒ <code>Promise.&lt;(harObject\|Error)&gt;</code>
Returns the JSON/HAR content representing all the HTTP traffic passed through the proxy
(provided you have already created the HAR with this [method](#browserMobProxyClientApi+newHar))

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+getWhiteList"></a>

### browserMobProxyClientApi.getWhiteList() ⇒ <code>Promise.&lt;(Array.&lt;string&gt;\|Error)&gt;</code>
Displays whitelisted items

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
**Returns**: <code>Promise.&lt;(Array.&lt;string&gt;\|Error)&gt;</code> - - Array of urls which have set before  
<a name="browserMobProxyClientApi+setWhiteList"></a>

### browserMobProxyClientApi.setWhiteList(httpCodeStatus, regexps) ⇒ <code>Promise.&lt;(undefined\|Error)&gt;</code>
Sets a list of URL patterns to whitelist

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| httpCodeStatus | <code>string</code> | the HTTP status code to return for URLs that do not match the whitelist. |
| regexps | <code>string</code> | a comma separated list of regular expressions. |

<a name="browserMobProxyClientApi+clearWhiteList"></a>

### browserMobProxyClientApi.clearWhiteList() ⇒ <code>Promise.&lt;(undefined\|Error)&gt;</code>
Clears all URL patterns from the whitelist

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+getBlackList"></a>

### browserMobProxyClientApi.getBlackList() ⇒ <code>Promise.&lt;(Array.&lt;BlackListedUrl&gt;\|Error)&gt;</code>
Displays blacklisted items

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+setBlackList"></a>

### browserMobProxyClientApi.setBlackList(httpCodeStatus, regexp, [methodsRegexp]) ⇒ <code>Promise.&lt;Array.&lt;BlackListedUrl&gt;&gt;</code>
Setup url to black list

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| httpCodeStatus | <code>number</code> | The HTTP status code to return for URLs that are blacklisted |
| regexp | <code>string</code> | The blacklist regular expression |
| [methodsRegexp] | <code>string</code> | The regular expression for matching HTTP method (GET, POST, PUT, etc). Optional, by default processing all HTTP method |

<a name="browserMobProxyClientApi+clearBlackList"></a>

### browserMobProxyClientApi.clearBlackList() ⇒ <code>Promise.&lt;(undefined\|Error)&gt;</code>
Clears all URL patterns from the blacklist

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+setLimits"></a>

### browserMobProxyClientApi.setLimits([browserMobProxyLimitObject]) ⇒ <code>Promise</code>
Sets the downstream bandwidth limit in kbps

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type |
| --- | --- |
| [browserMobProxyLimitObject] | <code>[LimitsSetterObject](#LimitsSetterObject)</code> | 

<a name="browserMobProxyClientApi+getLimits"></a>

### browserMobProxyClientApi.getLimits() ⇒ <code>[Promise.&lt;LimitsGetterObject&gt;](#LimitsGetterObject)</code>
Displays the amount of data remaining to be uploaded/downloaded until the limit is reached

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+setHeaders"></a>

### browserMobProxyClientApi.setHeaders(headers) ⇒ <code>Promise</code>
Set and override HTTP Request headers

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| headers | <code>object</code> | Represents set of headers, where key is a header name and value is a value of HTTP header |

<a name="browserMobProxyClientApi+overrideDNS"></a>

### browserMobProxyClientApi.overrideDNS(dns) ⇒ <code>Promise</code>
Overrides normal DNS lookups and remaps the given hosts with the associated IP address

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| dns | <code>object</code> | Represents set of of hosts, where key is a host name and value is a IP address which associated with host name |

<a name="browserMobProxyClientApi+setAutoAuthentication"></a>

### browserMobProxyClientApi.setAutoAuthentication(auth, domain) ⇒ <code>Promise</code>
Sets automatic basic authentication for the specified domain. This method supports only BASIC authentication.

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| auth | <code>object</code> | Object describes authentication data |
| auth.username | <code>string</code> | Login |
| auth.password | <code>string</code> | Password |
| domain | <code>string</code> | At the domain will be applying basic auth |

<a name="browserMobProxyClientApi+setWait"></a>

### browserMobProxyClientApi.setWait(waitObject) ⇒ <code>Promise</code>
Wait till all request are being made

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| waitObject | <code>object</code> | Object describes waits data |
| waitObject.quietPeriodInMs | <code>number</code> | amount of time after which network traffic will be considered "stopped" |
| waitObject.timeoutInMs | <code>number</code> | maximum amount of time to wait for network traffic to stop |

<a name="browserMobProxyClientApi+setTimeouts"></a>

### browserMobProxyClientApi.setTimeouts(timeoutObj) ⇒ <code>Promise</code>
Handles different proxy timeouts. The new LittleProxy implementation requires that all timeouts be set before start Proxy, because of it tests skipped.

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| timeoutObj | <code>object</code> | Describes timeout object |
| timeoutObj.requestTimeout | <code>number</code> | Request timeout in milliseconds. timeout value of -1 is interpreted as infinite timeout. |
| timeoutObj.readTimeout | <code>number</code> | Read timeout in milliseconds. Which is the timeout for waiting for data or, put differently, a maximum period inactivity between two consecutive data packets. A timeout value of zero is interpreted as an infinite timeout. |
| timeoutObj.connectionTimeout | <code>number</code> | Determines the timeout in milliseconds until a connection is established. A timeout value of zero is interpreted as an infinite timeout. |
| timeoutObj.dnsCacheTimeout | <code>number</code> | Sets the maximum length of time that records will be stored in this Cache. A nonpositive value disables this feature |

<a name="browserMobProxyClientApi+setRedirectUrls"></a>

### browserMobProxyClientApi.setRedirectUrls(redirectObj) ⇒ <code>Promise</code>
Redirecting URL's

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| redirectObj |  | Describes redirect object |
| redirectObj.matchRegex | <code>string</code> | a matching URL regular expression |
| redirectObj.replace | <code>string</code> | replacement URL |

<a name="browserMobProxyClientApi+removeRedirects"></a>

### browserMobProxyClientApi.removeRedirects() ⇒ <code>Promise</code>
Removes all URL redirection rules currently in effect

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+setRetries"></a>

### browserMobProxyClientApi.setRetries(numberOfTries) ⇒ <code>Promise</code>
Setting the retry count

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| numberOfTries | <code>number</code> | The number of times a method will be retried |

<a name="browserMobProxyClientApi+clearDNSCache"></a>

### browserMobProxyClientApi.clearDNSCache() ⇒ <code>Promise</code>
Empties the DNS cache

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  
<a name="browserMobProxyClientApi+setRequestInterception"></a>

### browserMobProxyClientApi.setRequestInterception(rule) ⇒ <code>Promise</code>
Describe your own request interception

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| rule | <code>string</code> | a string which determines interceptor rules. |

<a name="browserMobProxyClientApi+setResponseInterception"></a>

### browserMobProxyClientApi.setResponseInterception(rule) ⇒ <code>Promise</code>
Describe your own response interception

**Kind**: instance method of <code>[browserMobProxyClientApi](#browserMobProxyClientApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| rule | <code>string</code> | a string which determines interceptor rules. |
