import { StyleSheet, Text, View } from 'react-native';

export function FailureHint({ hint }: { hint: { title: string; body: string } | null }) {
  if (!hint) return null;
  return <View style={styles.card}>
    <Text style={styles.title}>{hint.title}</Text>
    <Text style={styles.body}>{hint.body}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: 12, borderRadius: 10, gap: 6,
    backgroundColor: '#0B1C26', borderWidth: 1, borderColor: '#244752' },
  title: { color: '#9DCBD5', fontSize: 11, fontWeight: '800' },
  body: { color: '#D2E3EB', fontSize: 13, lineHeight: 20 },
});
