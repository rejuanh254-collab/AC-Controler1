export default async function handler(req, res) {
  try {
    const mod = await import('./index.js');
    return res.json({
      status: 'import_ok',
      hasDefault: Boolean(mod.default),
      keys: Object.keys(mod),
    });
  } catch (err) {
    return res.status(200).json({
      status: 'import_failed',
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : null,
    });
  }
}
