import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Circle } from '@shopify/react-native-skia';

/**
 * Phase 1 smoke screen — environment verification only.
 * No gameplay systems live here yet.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Text style={styles.title}>DON'T MOVE</Text>
          <Text style={styles.subtitle}>React Native Prototype</Text>

          <Canvas style={styles.canvas}>
            <Circle cx={80} cy={80} r={36} color="#E8332A" />
          </Canvas>

          <Text style={styles.caption}>Skia smoke test</Text>
          <StatusBar style="light" />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A1220',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0A1220',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 8,
    color: '#9AA3B2',
    fontSize: 16,
  },
  canvas: {
    marginTop: 40,
    width: 160,
    height: 160,
  },
  caption: {
    marginTop: 12,
    color: '#5C6675',
    fontSize: 13,
  },
});
