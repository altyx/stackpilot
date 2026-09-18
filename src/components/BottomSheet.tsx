import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

const OPEN_MS = 260;
const CLOSE_MS = 200;
/** Downward drag distance beyond which releasing closes the sheet. */
const DISMISS_DISTANCE = 80;
/** Flick velocity, in px/ms, that closes the sheet even over a short distance. */
const DISMISS_VELOCITY = 0.8;

export interface BottomSheetProps {
  visible: boolean;
  /** Backdrop tapped, sheet dragged down, or Android back button. */
  onRequestClose: () => void;
  /**
   * Called once the sheet has fully retracted. This is where a confirmed
   * action should fire: on iOS, an alert presented while a modal is closing
   * disappears with it.
   */
  onClosed?: () => void;
  children: ReactNode;
}

/**
 * Modal sheet that rises from the bottom of the screen.
 *
 * Built on `Modal` and `Animated` rather than a library: nothing to install,
 * and it also works in Expo Go.
 *
 * Only one sheet at a time: iOS refuses to present a modal while another is
 * retracting, and the second one simply never appears. Chaining two steps
 * therefore happens within the same sheet, as in `StackActionSheet`.
 */
export function BottomSheet({ visible, onRequestClose, onClosed, children }: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  // Mounted during render as soon as `visible` flips: the modal exists on the
  // same pass that starts the opening animation. Unmounting waits for the
  // closing animation, in its completion callback.
  if (visible && !mounted) setMounted(true);
  // Lazily initialised state rather than refs: these are read during render
  // (styles, pan handlers), which React reserves for state and props.
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));

  // The gesture is created once: it reads the up-to-date callbacks here.
  const callbacks = useRef({ onRequestClose, onClosed });
  useEffect(() => {
    callbacks.current = { onRequestClose, onClosed };
  });

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Reopening during close interrupts the animation: we keep the modal mounted.
      if (finished) setMounted(false);
    });
  }, [visible, progress, drag]);

  const wasMounted = useRef(false);
  useEffect(() => {
    if (mounted) {
      wasMounted.current = true;
    } else if (wasMounted.current) {
      wasMounted.current = false;
      callbacks.current.onClosed?.();
    }
  }, [mounted]);

  /* eslint-disable react-hooks/refs -- the handlers read `callbacks` at
     gesture time; the rule can't tell that `PanResponder.create` never calls
     them during render. */
  const [panResponder] = useState(() =>
    PanResponder.create({
      // Only clearly vertical drags are captured: taps stay with the buttons.
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          callbacks.current.onRequestClose();
        } else {
          Animated.spring(drag, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  );
  /* eslint-enable react-hooks/refs */

  const translateY = useMemo(
    () =>
      Animated.add(
        progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
        drag.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: 'clamp' }),
      ),
    [progress, drag, height],
  );

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => callbacks.current.onRequestClose()}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={StyleSheet.absoluteFill}
            onPress={() => callbacks.current.onRequestClose()}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + theme.spacing(4), transform: [{ translateY }] },
          ]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: theme.colors.backdrop },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing(5),
    paddingTop: theme.spacing(2),
    gap: theme.spacing(4),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
});
