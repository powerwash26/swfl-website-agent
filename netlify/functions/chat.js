exports.handler = async () => ({
  statusCode: 410,
  body: JSON.stringify({ error: 'This endpoint is retired — the site no longer uses AI chat.' })
});
