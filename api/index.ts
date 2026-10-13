import app from '../server';

export default function handler(req: any, res: any) {
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  return app(req, res);
}
