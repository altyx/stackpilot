import 'react-native-gesture-handler/jestSetup';

// Formatted dates are asserted as literal strings: pin the timezone so the
// suite behaves the same on a developer machine and in CI.
process.env.TZ = 'UTC';
