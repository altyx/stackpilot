import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

/**
 * L'espace entre cartes vient d'un séparateur et non d'une marge sur la carte :
 * `Link asChild` fusionne le style de son enfant par étalement d'objet, et un
 * style fonction de `Pressable` y est perdu, marge comprise.
 */
export function ContainerRowSeparator() {
  return <View style={styles.rowSeparator} />;
}

const styles = StyleSheet.create({
  rowSeparator: { height: theme.spacing(2) },
});
