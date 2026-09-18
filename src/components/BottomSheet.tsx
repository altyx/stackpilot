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
/** Glissement vers le bas au-delà duquel relâcher ferme la feuille. */
const DISMISS_DISTANCE = 80;
/** Vitesse de lancer, en px/ms, qui ferme la feuille même sur une courte distance. */
const DISMISS_VELOCITY = 0.8;

export interface BottomSheetProps {
  visible: boolean;
  /** Fond tapé, feuille glissée vers le bas, ou bouton retour Android. */
  onRequestClose: () => void;
  /**
   * Appelé une fois la feuille entièrement retirée. C'est là qu'une action
   * confirmée doit partir : sur iOS, une alerte présentée pendant la fermeture
   * d'une modale disparaît avec elle.
   */
  onClosed?: () => void;
  children: ReactNode;
}

/**
 * Feuille modale qui monte depuis le bas de l'écran.
 *
 * Construite sur `Modal` et `Animated` plutôt que sur une bibliothèque : rien à
 * installer, et elle fonctionne aussi dans Expo Go.
 *
 * Une seule feuille à la fois : iOS refuse de présenter une modale pendant
 * qu'une autre se retire, et la seconde n'apparaît tout simplement pas.
 * Enchaîner deux étapes se fait donc dans la même feuille, comme
 * `StackActionSheet`.
 */
export function BottomSheet({ visible, onRequestClose, onClosed, children }: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  // Le geste est créé une seule fois : il lit ici les rappels à jour.
  const callbacks = useRef({ onRequestClose, onClosed });
  useEffect(() => {
    callbacks.current = { onRequestClose, onClosed };
  });

  useEffect(() => {
    if (visible) {
      setMounted(true);
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
      // Une réouverture pendant la fermeture interrompt l'animation : on garde la modale.
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

  const panResponder = useRef(
    PanResponder.create({
      // Seuls les glissements franchement verticaux sont capturés : les taps restent aux boutons.
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
  ).current;

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
