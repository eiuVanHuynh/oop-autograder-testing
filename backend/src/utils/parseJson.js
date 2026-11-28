// A jsonb/text column read back from the DB. pg gives jsonb as an object already, text as a string.
// A row written by an older migration can hold invalid JSON: that must not turn a list page into a 500,
// so a broken value reads as null and the caller decides what to do (404/409/empty).
module.exports = (value) => {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
