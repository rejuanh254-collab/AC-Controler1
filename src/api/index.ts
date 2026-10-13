import app from '../../server.js';

function handler(req: any, res: any) {
  let targetUrl = req.originalUrl || req.url || '/';
  if (!targetUrl.startsWith('/api')) {
    targetUrl = `/api${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
  }
  req.url = targetUrl;
  return app(req, res);
}

export default handler;
export { handler };
