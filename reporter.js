const URL = process.env.API_URL || 'https://app.testomatio/api/send-tests';
const isHttps = URL.startsWith('https');
const { request } = isHttps ? require('https') : require('http');

class Reporter {

  constructor(apiKey) {
    this.apiKey = apiKey;
    this.tests = [];
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  send() {

    const data = JSON.stringify(this.tests);
    const req = request(URL + '?api_key=' + this.apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
    }, (resp) => {
    
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        console.log('Data send to Testomat.io');
      });
    
    });

    req.on("error", (err) => {
      console.log("Error: " + err.message);
    });

    req.write(data)
    req.end();    
    
  }

}

module.exports = Reporter;