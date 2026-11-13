// Tugas 7.6.1 – Splash Screen custom
// Ditampilkan di atas aplikasi saat pertama kali dibuka: logo termometer
// muncul dengan efek pegas, tiga gelombang cincin memancar, nama aplikasi
// dan identitas kelompok naik perlahan, bilah progres terisi, lalu seluruh
// layar memudar dan aplikasi utama tampil.
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export const SPLASH_DURATION = 2800;
const BG = "#0B1B3F";
const ACCENT = "#38BDF8";

function Ripple({ delay }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1)
      )
    );
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 0.6 + p.value * 1.6 }],
  }));
  return <Animated.View style={[styles.ripple, style]} />;
}

export function SplashScreen({ onFinish }) {
  const logo = useSharedValue(0);
  const text = useSharedValue(0);
  const bar = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    logo.set(withSpring(1, { damping: 9, stiffness: 120 }));
    text.set(withDelay(350, withTiming(1, { duration: 600 })));
    bar.set(withDelay(300, withTiming(1, { duration: SPLASH_DURATION - 700 })));
    // Waktu dihitung di UI thread: splash baru ditutup setelah animasi
    // memudar benar-benar selesai, sehingga tetap utuh walau perangkat lambat.
    fade.set(
      withDelay(
        SPLASH_DURATION - 350,
        withTiming(0, { duration: 350 }, (finished) => {
          if (finished && onFinish) scheduleOnRN(onFinish);
        })
      )
    );
  }, [logo, text, bar, fade, onFinish]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logo.value }, { rotate: `${(1 - logo.value) * -90}deg` }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 16 }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
      <View style={styles.center}>
        <Ripple delay={0} />
        <Ripple delay={530} />
        <Ripple delay={1060} />
        <Animated.View style={[styles.logo, logoStyle]}>
          <Ionicons name="thermometer" size={56} color={BG} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.title}>LiveTemp</Text>
        <Text style={styles.subtitle}>Real-time Temperature Monitoring</Text>
      </Animated.View>
      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
        <Text style={styles.group}>Kelompok 27 · Praktikum PPB 2026</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  center: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { alignItems: "center", marginTop: 12 },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontFamily: "monospace",
  },
  subtitle: { color: "#BAE6FD", fontSize: 14, marginTop: 4 },
  bottom: {
    position: "absolute",
    bottom: 72,
    left: 48,
    right: 48,
    alignItems: "center",
    gap: 12,
  },
  track: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  fill: { height: 4, borderRadius: 2, backgroundColor: ACCENT },
  group: { color: "#94A3B8", fontSize: 12, letterSpacing: 0.5 },
});
