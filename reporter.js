const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
const isHttps = URL.startsWith('https');
const { request } = isHttps ? require('https') : require('http');

class Reporter {

  constructor(apiKey, framework) {
    if (!framework) {
      console.error('Framework cannot be empty');
    }
    if (!apiKey) {
      console.error('Cant send report, api key not set');
    }
    this.apiKey = apiKey;
    this.framework = framework;
    this.tests = [];
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  send() {
    console.log('\n 🚀 Sending data to testomat.io\n');

    const data = JSON.stringify({ tests: this.tests, framework: this.framework });

    const req = request(URL + '/api/load?api_key=' + this.apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
    }, (resp) => {
    
      // The whole response has been received. Print out the result.
      let message = '';

      resp.on('end', () => {
        if (resp.statusCode !== 200) {
          console.log(' ✖️ ', message);
        } else {
          console.log(' 🎉 Data received at Testomat.io');
        }
      });

      resp.on('data', (chunk) => {
        message += chunk.toString();
      });

      resp.on('aborted', () => {
        console.log(' ✖️ Data was not sent to Testomat.io');
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