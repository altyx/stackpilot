import { useState, type ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStrings } from '../i18n';
import { createStyles, useTheme } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Card } from './Card';
import { SettingsChoiceRow } from './SettingsChoiceRow';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * A setting shown as its current value, chosen in a sheet: the list of
 * options only takes room on screen while choosing.
 */
export function SettingsSelect<T extends string>({
  title,
  icon,
  options,
  value,
  onChange,
}: {
  /** Names the setting, in the sheet and for screen readers. */
  title: string;
  icon: IconName;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${current?.label ?? value}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
        <Text style={styles.value}>{current?.label ?? value}</Text>
        <Ionicons name="chevron-expand-outline" size={18} color={theme.colors.textMuted} />
      </Pressable>
      <BottomSheet visible={open} onRequestClose={() => setOpen(false)}>
        <SheetHeader title={title} />
        <Card style={styles.options}>
          {options.map((option, index) => (
            <SettingsChoiceRow
              key={option.value}
              label={option.label}
              selected={option.value === value}
              first={index === 0}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
            />
          ))}
        </Card>
        <SheetActions>
          <Button label={t.common.cancel} variant="secondary" onPress={() => setOpen(false)} />
        </SheetActions>
      </BottomSheet>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    minHeight: theme.spacing(12),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
  },
  value: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  // The card carries the rows edge to edge, as on the settings screen.
  options: { padding: 0, overflow: 'hidden' },
  pressed: { opacity: 0.75 },
}));
