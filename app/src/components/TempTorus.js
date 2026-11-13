// Tugas 7.6.4 – UI Animation
// Pengganti animasi sphere bawaan (TempOrb). Titik-titik disusun menjadi
// cincin torus (donat) yang berputar pada dua sumbu. Kecepatan putar
// mengikuti suhu (makin panas makin cepat), warna titik bergradasi dari
// warna status ke warna terang, dan setiap data MQTT baru memicu efek
// "denyut" (cincin mengembang lalu kembali) disertai getaran ringan.
import { useEffect, useMemo, useRef } from "react";
import {
  Atlas,
  Canvas,
  FilterMode,
  MipmapMode,
  Skia,
  rect,
  useRSXformBuffer,
  usePictureAsTexture,
} from "react-native-skia";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

const RING_SEGMENTS = 56; // titik sepanjang lingkar besar
const TUBE_SEGMENTS = 7; // titik sepanjang penampang tabung
const DOT_COUNT = RING_SEGMENTS * TUBE_SEGMENTS;
const MAJOR = 0.8; // jari-jari besar torus (ternormalisasi)
const MINOR = 0.2; // jari-jari tabung
const TEX = 32;
const BASE_SPEED = 0.25;
const MIN_TEMP = 20;
const MAX_TEMP = 35;

// Titik dasar torus: u = sudut lingkar besar, v = sudut tabung.
function buildTorus() {
  const pts = new Array(DOT_COUNT);
  let k = 0;
  for (let i = 0; i < RING_SEGMENTS; i++) {
    const u = (i / RING_SEGMENTS) * Math.PI * 2;
    for (let j = 0; j < TUBE_SEGMENTS; j++) {
      // geser fase tiap ring agar titik membentuk pola spiral
      const v = (j / TUBE_SEGMENTS) * Math.PI * 2 + i * 0.35;
      const ring = MAJOR + MINOR * Math.cos(v);
      pts[k++] = [ring * Math.cos(u), MINOR * Math.sin(v), ring * Math.sin(u), u];
    }
  }
  return pts;
}

const BASE_PTS = buildTorus();

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Campur warna status dengan putih berdasarkan posisi sudut u.
function gradientColors(tint) {
  const [r, g, b] = hexToRgb(tint.startsWith("#") ? tint : color.primary);
  return BASE_PTS.map((p) => {
    const t = (Math.cos(p[3]) + 1) / 2; // 0..1
    const mix = 0.15 + 0.55 * t;
    const cr = Math.round(r + (255 - r) * mix * 0.6);
    const cg = Math.round(g + (255 - g) * mix * 0.6);
    const cb = Math.round(b + (255 - b) * mix * 0.6);
    return `rgb(${cr},${cg},${cb})`;
  });
}

export function TempTorus({
  tint = color.primary,
  temperature = null,
  beatKey = 0,
  size = 200,
  dimmed = false,
}) {
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();
  const spin = useSharedValue(0.4);
  const wobble = useSharedValue(0);
  const spinBoost = useSharedValue(0);
  const pulse = useSharedValue(0);
  const heat = useSharedValue(0);
  const dimSV = useSharedValue(dimmed ? 1 : 0);
  const firstBeat = useRef(true);

  const R = (size * 0.74) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // tekstur satu titik bulat yang dipakai ulang oleh Atlas
  const dotPicture = useMemo(() => {
    try {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(rect(0, 0, TEX, TEX));
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color("white"));
      canvas.drawCircle(TEX / 2, TEX / 2, TEX / 2 - 1, paint);
      return recorder.finishRecordingAsPicture();
    } catch {
      return null;
    }
  }, []);
  const dotImg = usePictureAsTexture(dotPicture, { width: TEX, height: TEX });

  const sprites = useMemo(
    () => new Array(DOT_COUNT).fill(0).map(() => rect(0, 0, TEX, TEX)),
    []
  );

  // proyeksi 3D -> 2D untuk setiap titik, dijalankan di UI thread (worklet)
  const transforms = useRSXformBuffer(DOT_COUNT, (val, i) => {
    "worklet";
    const p = BASE_PTS[i];
    const a = spin.value;
    const tilt = 1.05 + Math.sin(wobble.value) * 0.18; // kemiringan cincin
    const roll = Math.sin(wobble.value * 0.7) * 0.25; // goyangan sumbu Z
    const swell = 1 + 0.08 * pulse.value;
    // putar terhadap sumbu Y
    const x1 = p[0] * Math.cos(a) + p[2] * Math.sin(a);
    const z1 = -p[0] * Math.sin(a) + p[2] * Math.cos(a);
    // efek gelombang pada tabung saat denyut
    const wave = 1 + 0.12 * pulse.value * Math.sin(p[3] * 4 + a * 3);
    const y0 = p[1] * wave;
    // miringkan terhadap sumbu X
    const y1 = y0 * Math.cos(tilt) - z1 * Math.sin(tilt);
    const z2 = y0 * Math.sin(tilt) + z1 * Math.cos(tilt);
    // goyang terhadap sumbu Z
    const x2 = x1 * Math.cos(roll) - y1 * Math.sin(roll);
    const y2 = x1 * Math.sin(roll) + y1 * Math.cos(roll);
    const depth = (z2 + 1) / 2;
    const s = 3 / (3 - z2);
    const sx = cx + x2 * R * swell * s;
    const sy = cy + y2 * R * swell * s;
    const sc = 0.2 * (0.55 + 0.85 * depth) * (1 + 0.15 * pulse.value);
    val.set(sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc);
  });

  useEffect(() => {
    dimSV.set(withTiming(dimmed ? 1 : 0, { duration: 400 }));
  }, [dimmed, dimSV]);

  // suhu dinormalisasi ke 0..1 untuk mengatur kecepatan putar
  useEffect(() => {
    if (typeof temperature !== "number") return;
    const n = Math.min(1, Math.max(0, (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)));
    heat.set(withTiming(n, { duration: 600 }));
  }, [temperature, heat]);

  // denyut setiap kali data baru masuk
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed || reduceMotion) return;
    pulse.set(0);
    pulse.set(
      withSequence(
        withTiming(1, { duration: 160 }),
        withTiming(0.3, { duration: 200 }),
        withTiming(0.8, { duration: 140 }),
        withTiming(0, { duration: 420 })
      )
    );
    spinBoost.set(1.8);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics tidak tersedia, animasi tetap berjalan
    }
  }, [beatKey, dimmed, reduceMotion, pulse, spinBoost]);

  const frame = useFrameCallback((info) => {
    "worklet";
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    spinBoost.value *= Math.pow(0.03, dt);
    spin.value += dt * (BASE_SPEED + heat.value * 0.9 + spinBoost.value);
    wobble.value += dt * 0.6;
  });

  useEffect(() => {
    frame.setActive(focused && !reduceMotion && !dimmed);
  }, [focused, reduceMotion, dimmed, frame]);

  // opasitas diatur pada View pembungkus (bukan saveLayer Skia) agar ringan
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - 0.6 * dimSV.value),
  }));

  const colors = useMemo(() => gradientColors(tint), [tint]);

  return (
    <Animated.View style={[{ width: size, height: size }, wrapStyle]} accessible={false}>
      <Canvas style={{ width: size, height: size }}>
        <Atlas
            image={dotImg}
            sprites={sprites}
            transforms={transforms}
            colors={colors}
            colorBlendMode="modulate"
            sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
        />
      </Canvas>
    </Animated.View>
  );
}
