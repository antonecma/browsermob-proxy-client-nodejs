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
<a name="clientMethods"></a>
##Client methods

<a name="browserMobProxyClientApi+newHar"></a>

##### newHar([boolCaptureHeaders], [boolCaptureBody], [boolCaptureAllContent], [pageRef], [pageTitle])
Creates a new HAR attached to the proxy and returns the HAR content if there was a previous HAR


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [boolCaptureHeaders] | <code>boolean</code> | <code>true</code> | capture headers or not |
| [boolCaptureBody] | <code>boolean</code> | <code>false</code> | capture content bodies or not |
| [boolCaptureAllContent] | <code>boolean</code> | <code>false</code> | capture binary content or not. |
| [pageRef] | <code>string</code> | <code>&quot;Page 1&quot;</code> | the string name of the first page ref that should be used in the HAR |
| [pageTitle] | <code>string</code> | <code>&quot;Page 1&quot;</code> | the title of first HAR page |

*Fulfill returned value* : Object that represent [HAR](http://www.softwareishard.com/blog/har-12-spec)

<a name="browserMobProxyClientApi+startPage"></a>
##### startPage([newPageTitleObject], [pageRef], [pageTitle])
Starts a new page on the existing HAR

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [newPageTitleObject] | <code>object</code> |  | - |
| [pageRef] | <code>string</code> | <code>&quot;Page N&quot;</code> | The string name of the first page ref that should be used in the HAR. |
| [pageTitle] | <code>string</code> | <code>&quot;Page N&quot;</code> | The title of new HAR page |

*Fulfill returned value* : undefined

<a name="browserMobProxyClientApi+close"></a>
##### close()
Shuts down the proxy and closes the port.

*Fulfill returned value* : undefined
<a name="browserMobProxyClientApi+getHar"></a>

##### getHar()
Returns the JSON/HAR content representing all the HTTP traffic passed through the proxy
(provided you have already created the HAR with this [method](#browserMobProxyClientApi+newHar))

*Fulfill returned value* : Object that represent [HAR](http://www.softwareishard.com/blog/har-12-spec)

<a name="browserMobProxyClientApi+getWhiteList"></a>
##### getWhiteList()
Displays whitelisted items

*Fulfill returned value* : Array of urls which have set before by [setWhiteList() method](#browserMobProxyClientApi+setWhiteList) 

<a name="browserMobProxyClientApi+setWhiteList"></a>
##### setWhiteList(httpCodeStatus, regexps)
Sets a list of URL patterns to whitelist

| Param | Type | Description |
| --- | --- | --- |
| httpCodeStatus | <code>number</code> | the HTTP status code to return for URLs that do not match the whitelist. |
| regexps | <code>string</code> | a comma separated list of regular expressions. |

*Fulfill returned value* : undefined

<a name="browserMobProxyClientApi+clearWhiteList"></a>
##### clearWhiteList()
Clears all URL patterns from the whitelist

*Fulfill returned value* : undefined

##### getBlackList()
Displays blacklisted items

*Fulfill returned value* : Array of object that represent black list item

*Fulfill returned value description* : It's one object desccription from array

| Name | Type | Description |
| --- | --- | --- |
| urlPattern | <code>string</code> | incoming regexp for blocking |
| statusCode | <code>number</code> | incoming http code is returned for blocked url |
| httpMethodPattern | <code>string</code> | incoming  regular expression for matching HTTP method (GET, POST, PUT, etc). If null processing all HTTP method. |
| method | <code>string</code> | regular expression for matching HTTP method (GET, POST, PUT, etc). If null processing all HTTP method. |
| responseCode | <code>number</code> | http code is returned for blocked url |
| pattern | <code>string</code> | incoming regexp for blocking |

<a name="browserMobProxyClientApi+setBlackList"></a>
##### setBlackList(httpCodeStatus, regexp, [methodsRegexp])
Setup url to black list

| Param | Type | Description |
| --- | --- | --- |
| httpCodeStatus | <code>number</code> | The HTTP status code to return for URLs that are blacklisted |
| regexp | <code>string</code> | The blacklist regular expression |
| [methodsRegexp] | <code>string</code> | The regular expression for matching HTTP method (GET, POST, PUT, etc). Optional, by default processing all HTTP method |

*Fulfill returned value* : undefined

<a name="browserMobProxyClientApi+clearBlackList"></a>
##### clearBlackList() 
Clears all URL patterns from the blacklist

*Fulfill returned value* : undefined

<a name="browserMobProxyClientApi+setLimits"></a>
##### setLimits([browserMobProxyLimitObject])
Sets the downstream bandwidth limit in kbps

| Param | Type |
| --- | --- |
| [browserMobProxyLimitObject] | <code>[LimitsSetterObject](#LimitsSetterObject)</code> | 

<a name="LimitsSetterObject"></a>
###### LimitsSetterObject : <code>object</code>
Object for setting up limits of BrowserMob Proxy

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| downstreamKbps | <code>number</code> |  | Downstream bandwidth limit in kbps |
| downstreamBps | <code>number</code> |  | Downstream bandwidth limit in bit per second |
| upstreamKbps | <code>number</code> |  | Upstream bandwidth limit in kbps |
| upstreamBps | <code>number</code> |  | Upstream bandwidth limit in bit per second |
| downstreamMaxKB | <code>number</code> |  | Specifies how many kilobytes in total the client is allowed to download through the proxy |
| upstreamMaxKB | <code>number</code> |  | Specifies how many kilobytes in total the client is allowed to upload through the proxy |
| latency | <code>number</code> | <code>0</code> | Add the given latency to each HTTP request. By default all requests are invoked without latency |
| enable | <code>boolean</code> | <code>false</code> | A boolean that enable bandwidth limiter. Setting any of the properties above will implicitly enable throttling |
| payloadPercentage | <code>number</code> |  | Specifying what percentage of data sent is payload, e.g. use this to take into account overhead due to tcp/ip |
| maxBitsPerSecond | <code>number</code> |  | The max bits per seconds you want this instance of StreamManager to respect |


*Fulfill returned value* : undefined

<a name="browserMobProxyClientApi+getLimits"></a>
##### getLimits()
Displays the amount of data remaining to be uploaded/downloaded until the limit is reached

*Fulfill returned value* : [LimitsGetterObject](#LimitsGetterObject)

*Fulfill returned value description* : 
<a name="LimitsGetterObject"></a>
###### LimitsGetterObject : <code>object</code>
Object describes amount of data remaining to be uploaded/downloaded until the limit is reached

| Name | Type | Description |
| --- | --- | --- |
| maxUpstreamKB | <code>number</code> | Show maxUpstreamKB set by [setLimits](#browserMobProxyClientApi+setLimits) |
| maxDownstreamKB | <code>number</code> | Show maxDownstreamKB set by [setLimits](#browserMobProxyClientApi+setLimits) |
| remainingUpstreamKB | <code>number</code> | Show how many kilobytes will be uploaded before the limit is reached |
| remainingDownstreamKB | <code>number</code> | Show how many kilobytes will be downloaded before the limit is reached |


<a name="browserMobProxyClientApi+setHeaders"></a>
##### setHeaders(headers)
Set and override HTTP Request headers

| Param | Type | Description |
| --- | --- | --- |
| headers | <code>object</code> | Represents set of headers, where key is a header name and value is a value of HTTP header |

*Fulfill returned value* : undefined

<a name="browserMobProxyClientApi+overrideDNS"></a>
##### overrideDNS(dns)
Overrides normal DNS lookups and remaps the given hosts with the associated IP address

| Param | Type | Description |
| --- | --- | --- |
| dns | <code>object</code> | Represents set of of hosts, where key is a host name and value is a IP address which associated with host name |

*Fulfill returned value* : undefined

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
