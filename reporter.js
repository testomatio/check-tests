const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io/api/load';
const isHttps = URL.startsWith('https');
const { request } = isHttps ? require('https') : require('http');

class Reporter {

  constructor(apiKey) {
    if (!apiKey) {
      console.error('Cant send report, api key not set');
    }
    this.apiKey = apiKey;
    this.tests = [];
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  send() {
    console.log('\n 🚀 Sending data to testomat.io\n');

    const data = JSON.stringify(this.tests);

    const req = request(URL + '?api_key=' + this.apiKey, {
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
          console.log(' 🎉 Data sent to Testomat.io');
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