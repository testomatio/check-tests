function getResponse(error) {
  return error && (error.response || error.res);
}

function getStatus(error) {
  const response = getResponse(error);
  return error?.statusCode || error?.status || response?.statusCode || response?.status;
}

function getStatusText(error) {
  const response = getResponse(error);
  return error?.statusMessage || error?.statusText || response?.statusMessage || response?.statusText;
}

function getBody(error) {
  const response = getResponse(error);
  return error?.body || error?.data || response?.body || response?.data;
}

function extractBodyMessage(body) {
  if (!body) return '';
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return '';

    try {
      return extractBodyMessage(JSON.parse(trimmed)) || trimmed;
    } catch {
      return trimmed;
    }
  }

  if (typeof body !== 'object') return String(body);
  if (body.message) return String(body.message);
  if (body.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
  if (body.errors) return Array.isArray(body.errors) ? body.errors.join(', ') : JSON.stringify(body.errors);
  return '';
}

function formatStatusMessage(status, statusText) {
  return statusText ? `${status} ${statusText}` : String(status);
}

function formatErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error.trim() || 'Unknown error';

  const status = getStatus(error);
  const statusText = getStatusText(error);
  const bodyMessage = extractBodyMessage(getBody(error));

  if (status) {
    const statusMessage = formatStatusMessage(status, statusText);
    const message =
      Number(status) === 504 ? `Request timed out (${statusMessage})` : `Request failed (${statusMessage})`;
    return bodyMessage ? `${message}: ${bodyMessage}` : message;
  }

  if (error.message) return error.message;

  try {
    const json = JSON.stringify(error);
    return json && json !== '{}' ? json : String(error);
  } catch {
    return String(error);
  }
}

module.exports = {
  formatErrorMessage,
};
