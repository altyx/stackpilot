import { memo } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { formatLogTime, type LogLine } from '../lib/logs';
import { theme } from '../theme';

/** One log line, its time dimmed in front when shown. Memoised: lists re-render on every poll. */
export const LogLineRow = memo(function LogLineRow({
  line,
  showTimestamp,
}: {
  line: LogLine;
  showTimestamp: boolean;
}) {
  const time = showTimestamp ? formatLogTime(line.timestamp) : '';
  return (
    <Text selectable style={styles.line}>
      {time ? <Text style={styles.time}>{time} </Text> : null}
      {line.text || ' '}
    </Text>
  );
});

const styles = StyleSheet.create({
  line: {
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  time: { color: theme.colors.textMuted },
});
