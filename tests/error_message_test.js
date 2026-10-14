const { expect } = require('chai');
const { formatErrorMessage } = require('../src/lib/utils');

describe('formatErrorMessage', () => {
  it('should format 504 responses without a body', () => {
    const message = formatErrorMessage({
      statusCode: 504,
      statusMessage: 'Gateway Timeout',
    });

    expect(message).to.equal('Request timed out (504 Gateway Timeout)');
  });

  it('should use server body message when response has a body', () => {
    const message = formatErrorMessage({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      body: JSON.stringify({ message: 'Export failed' }),
    });

    expect(message).to.equal('Request failed (500 Internal Server Error): Export failed');
  });

  it('should keep regular Error messages', () => {
    expect(formatErrorMessage(new Error('Server error'))).to.equal('Server error');
  });

  it('should not return undefined for plain objects', () => {
    expect(formatErrorMessage({ code: 'ECONNRESET' })).to.equal('{"code":"ECONNRESET"}');
  });
});
