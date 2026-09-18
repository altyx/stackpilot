import { StyleSheet, Text, View } from 'react-native';
import { containerName } from '../lib/format';
import type { StackSection } from '../lib/stacks';
import { theme } from '../theme';
import { StatusDot } from './StatusDot';

/** Au-delà, la liste des conteneurs est résumée pour garder la feuille compacte. */
const MAX_LISTED = 6;

export function StackMemberList({ section }: { section: StackSection }) {
  const listed = section.members.slice(0, MAX_LISTED);
  const hidden = section.members.length - listed.length;
  return (
    <View style={styles.members}>
      {listed.map((container) => (
        <View key={container.Id} style={styles.member}>
          <StatusDot state={container.State} />
          <Text style={styles.memberName} numberOfLines={1}>
            {containerName(container)}
          </Text>
        </View>
      ))}
      {hidden > 0 ? (
        <Text style={styles.more}>
          et {hidden} autre{hidden > 1 ? 's' : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  members: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    gap: theme.spacing(2),
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  memberName: { color: theme.colors.text, fontSize: 14, flex: 1 },
  more: { color: theme.colors.textMuted, fontSize: 13 },
});
