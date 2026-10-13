export default async function handler(req: any, res: any) {
  try {
    const mod = await import('./index.js');
    return res.json({
      status: 'import_ok',
      hasDefault: Boolean(mod.default),
      keys: Object.keys(mod),
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'import_failed',
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
