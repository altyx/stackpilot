import { useRef, type ReactNode } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LogLine } from '../lib/logs';
import { theme } from '../theme';
import { LogLineRow } from './LogLineRow';
import { useStickToBottom } from './useStickToBottom';

/**
 * Logs over the whole screen, for reading long output. Virtualised, unlike
 * the inline view: up to the follow cap of lines stays smooth. Opens on the
 * newest lines, like the inline view.
 */
export function LogFullscreen({
  visible,
  title,
  lines,
  showTimestamps,
  status,
  controls,
  rangePicker,
  onClose,
}: {
  visible: boolean;
  title: string;
  lines: LogLine[];
  showTimestamps: boolean;
  status?: ReactNode;
  controls: ReactNode;
  rangePicker: ReactNode;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<LogLine>>(null);
  const stick = useStickToBottom();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {controls}
          {rangePicker}
          {status}
        </View>
        <FlatList
          ref={list}
          data={lines}
          keyExtractor={(line, index) => `${line.timestamp}#${index}`}
          renderItem={({ item }) => <LogLineRow line={item} showTimestamp={showTimestamps} />}
          contentContainerStyle={styles.content}
          scrollEventThrottle={64}
          onScroll={stick.onScroll}
          onContentSizeChange={() =>
            stick.follow(() => list.current?.scrollToEnd({ animated: false }))
          }
          ListEmptyComponent={<Text style={styles.empty}>No output in this range.</Text>}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    gap: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  content: { padding: theme.spacing(4) },
  empty: { color: theme.colors.textMuted, fontSize: 13 },
});
