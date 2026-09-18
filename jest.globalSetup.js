// Runs once in the parent process, before any worker starts: formatted dates
// are asserted as literal strings, so every test must see the same timezone.
// Set from a setup file instead, it would come too late for Intl.
module.exports = () => {
  process.env.TZ = 'UTC';
};
