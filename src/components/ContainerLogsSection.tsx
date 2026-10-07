import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useContainerLogs } from '../api/hooks';
import { DEFAULT_LOG_RANGE, formatLogText, type LogRange } from '../lib/logs';
import { theme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { LogControls } from './LogControls';
import { LogFullscreen } from './LogFullscreen';
import { LogLineRow } from './LogLineRow';
import { LogRangePicker } from './LogRangePicker';
import { useStickToBottom } from './useStickToBottom';

/**
 * Inline, only the most recent lines are drawn, unvirtualised inside the
 * page's scroll: full screen has the whole range.
 */
const INLINE_LINES = 200;

export function ContainerLogsSection({
  endpointId,
  containerId,
  containerName,
}: {
  endpointId: number;
  containerId: string;
  containerName: string;
}) {
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<LogRange>(DEFAULT_LOG_RANGE);
  const [follow, setFollow] = useState(false);
  const [timestamps, setTimestamps] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inline = useRef<ScrollView>(null);
  const stick = useStickToBottom();
  const logs = useContainerLogs(endpointId, containerId, range, { enabled: visible, follow });

  // The check mark confirms the copy, then steps aside: the logs keep moving.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!visible) {
    return (
      <Button label="Afficher les logs" variant="secondary" onPress={() => setVisible(true)} />
    );
  }

  const lines = logs.data ?? [];
  const shown = lines.slice(-INLINE_LINES);

  async function copy() {
    await Clipboard.setStringAsync(formatLogText(lines, timestamps));
    setCopied(true);
  }

  function share() {
    Share.share({
      title: `Logs de ${containerName}`,
      message: formatLogText(lines, timestamps),
    }).catch(() => Alert.alert('Partage impossible', "Les logs n'ont pas pu être partagés."));
  }

  function changeRange(next: LogRange) {
    setRange(next);
    setCopied(false);
    stick.reset();
  }

  const controls = (
    <LogControls
      follow={follow}
      onToggleFollow={() => setFollow((on) => !on)}
      timestamps={timestamps}
      onToggleTimestamps={() => setTimestamps((on) => !on)}
      copied={copied}
      onCopy={() => void copy()}
      onShare={share}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((on) => !on)}
      disabled={lines.length === 0}
    />
  );
  const rangePicker = <LogRangePicker value={range} onChange={changeRange} />;
  const status = (
    <Text style={styles.status}>
      {logs.isPending
        ? 'Chargement…'
        : `${lines.length} ligne${lines.length > 1 ? 's' : ''}${follow ? ' · en direct' : ''}`}
    </Text>
  );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Logs
        </Text>
        {status}
      </View>
      {controls}
      {rangePicker}

      {logs.error ? (
        <Text style={styles.error}>
          {logs.error instanceof Error ? logs.error.message : 'Logs indisponibles.'}
        </Text>
      ) : (
        <ScrollView
          ref={inline}
          nestedScrollEnabled
          style={styles.box}
          contentContainerStyle={styles.boxContent}
          scrollEventThrottle={64}
          onScroll={stick.onScroll}
          onContentSizeChange={() =>
            stick.follow(() => inline.current?.scrollToEnd({ animated: false }))
          }>
          {shown.length === 0 && !logs.isPending ? (
            <Text style={styles.muted}>Aucune sortie sur cette période.</Text>
          ) : (
            shown.map((line, index) => (
              <LogLineRow
                key={`${line.timestamp}#${index}`}
                line={line}
                showTimestamp={timestamps}
              />
            ))
          )}
        </ScrollView>
      )}
      {lines.length > shown.length ? (
        <Text style={styles.muted}>
          {shown.length} dernières lignes affichées : passez en plein écran pour tout lire.
        </Text>
      ) : null}

      <LogFullscreen
        visible={fullscreen}
        title={`Logs · ${containerName}`}
        lines={lines}
        showTimestamps={timestamps}
        status={status}
        controls={controls}
        rangePicker={rangePicker}
        onClose={() => setFullscreen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(3) },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  status: { color: theme.colors.textMuted, fontSize: 12 },
  box: {
    maxHeight: 360,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.sm,
  },
  boxContent: { padding: theme.spacing(3) },
  muted: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  error: { color: theme.colors.danger, fontSize: 13 },
});
