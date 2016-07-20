const request = require('request');

const promiseRequest = (url, anyParam) => {
    
    anyParam = anyParam || {method : 'GET'};

    return new Promise((resolve, reject) => {
        request(url, anyParam, (error, response, body) => {
            console.log(`request : ${url}; method : ${anyParam.method}`);
            if(error) {
                console.log('Error (FAIL) : ', error);
                return reject(error);
            } else {
                try {
                    console.log('parsed body : ', JSON.parse(body));
                    return resolve(JSON.parse(body));
                } catch(bodyError) {
                    try {
                        if(response.statusCode == 200 || response.statusCode == 204){
                            console.log('parsed status (OK) : ', response.statusCode);
                            return resolve();
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

module.exports = promiseRequest;
