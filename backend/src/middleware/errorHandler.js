// Centralized async error wrapper — avoids try/catch in every route handler.
// Usage: router.get('/', asyncHandler(async (req, res) => { ... }));

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
