import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUIAudio } from '../../game/audio/useGameAudio';
import { useMonetization } from '../../game/monetization/MonetizationContext';
import { useMenu } from './MenuContext';
import { removeAdsView } from './removeAdsView';

/**
 * Settings → Remove Ads. One card: what the product is, what it costs (the store's localized price), buy, restore,
 * and whether it is owned. It only presents; buying and restoring are the monetization provider's.
 */
export function RemoveAdsCard() {
  const { t } = useMenu();
  const playUI = useUIAudio();
  const monetization = useMonetization();
  const view = removeAdsView(monetization);
  const owned = view.state === 'purchased';
  return <View accessibilityLabel={t('removeAds')} style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>{t('removeAds')}</Text>
    {owned ? <>
      <Text style={styles.owned}>{t('removeAdsOwned')}</Text>
      <Text style={styles.body}>{t('removeAdsOwnedDetail')}</Text>
    </> : <>
      <Text style={styles.body}>{t('removeAdsDetail')}</Text>
      {view.price
        ? <Text accessibilityLabel={view.price} style={styles.price}>{view.price}</Text>
        : !!view.priceNote && <Text accessibilityLiveRegion="polite" style={styles.priceNote}>{t(view.priceNote)}</Text>}
    </>}
    {view.showBuy && <Pressable accessibilityRole="button" accessibilityState={{ disabled: view.buyDisabled, busy: view.state === 'purchasing' }}
      disabled={view.buyDisabled} onPress={() => {
        playUI('ui_select');
        void (view.primaryAction === 'retryStore' ? monetization.refreshProducts() : monetization.purchaseRemoveAds());
      }}
      style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed, view.buyDisabled && styles.disabled]}>
      <Text style={[styles.buttonText, styles.primaryText]}>{t(view.buyLabel)}</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: view.restoreDisabled, busy: view.state === 'restoring' }}
      disabled={view.restoreDisabled} onPress={() => { playUI('ui_select'); void monetization.restorePurchases(); }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, view.restoreDisabled && styles.disabled]}>
      <Text style={styles.buttonText}>{t(view.restoreLabel)}</Text>
    </Pressable>
    {!!view.message && <Text accessibilityLiveRegion="polite" style={styles.message}>{t(view.message)}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#344E5D', borderRadius: 14, backgroundColor: '#041019', paddingHorizontal: 18, paddingVertical: 18, gap: 10 },
  title: { color: '#F7F5EC', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  body: { color: '#BFD8E1', fontSize: 13, lineHeight: 19 },
  price: { color: '#3EC5FF', fontSize: 24, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  priceNote: { color: '#9EB9C5', fontSize: 13, marginTop: 2 },
  owned: { color: '#8FDB9A', fontSize: 16, fontWeight: '700' },
  button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#60727B', borderRadius: 14, backgroundColor: '#020C14', paddingHorizontal: 12, paddingVertical: 10 },
  primary: { borderColor: '#3ED5FA', borderWidth: 1.5, backgroundColor: '#06222E', marginTop: 4 },
  pressed: { backgroundColor: '#12313E' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#F7F5EC', fontSize: 14, fontWeight: '600', letterSpacing: 0.8, textAlign: 'center' },
  primaryText: { color: '#54DDF7', fontWeight: '800' },
  message: { color: '#EFF5F6', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
