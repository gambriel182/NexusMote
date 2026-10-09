import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { NexusMoteClient } from './src/client';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Touchpad = ({ client }) => {
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const lastMoveX = useRef(0);
  const lastMoveY = useRef(0);
  const lastScrollY = useRef(0);
  const touchStartTime = useRef(0);
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const handleLongPress = useCallback(() => {
    if (!longPressTriggered.current) {
      longPressTriggered.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      client.click('right');
    }
  }, [client]);

  const startLongPressTimer = useCallback(() => {
    longPressTimer.current = setTimeout(handleLongPress, 500);
  }, [handleLongPress]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePan = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      touchStartTime.current = Date.now();
      longPressTriggered.current = false;
      isPressed.value = true;
      ctx.startX = translationX.value;
      ctx.startY = translationY.value;
      lastMoveX.current = 0;
      lastMoveY.current = 0;
      lastScrollY.current = 0;
      runOnJS(startLongPressTimer)();
    },
    onActive: (event, ctx) => {
      const dx = event.translationX;
      const dy = event.translationY;

      if (event.numberOfTouches === 2) {
        const scrollDy = dy - (lastScrollY.current || 0);
        lastScrollY.current = dy;
        if (Math.abs(scrollDy) > 1) {
          runOnJS(client.scroll)(scrollDy * 0.5);
        }
      } else if (event.numberOfTouches === 1) {
        const moveX = dx - lastMoveX.current;
        const moveY = dy - lastMoveY.current;
        lastMoveX.current = dx;
        lastMoveY.current = dy;

        if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
          runOnJS(client.move)(moveX, moveY);
        }
      }
    },
    onEnd: () => {
      isPressed.value = false;
      runOnJS(clearLongPressTimer)();
      const duration = Date.now() - touchStartTime.current;
      if (!longPressTriggered.current && duration < 300) {
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          client.click('left');
        })();
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: isPressed.value ? 0.9 : 1,
    };
  });

  return (
    <PanGestureHandler onGestureEvent={handlePan}>
      <Animated.View style={[styles.touchpad, animatedStyle]} />
    </PanGestureHandler>
  );
};

const TouchpadScreen = ({ client, onDisconnect }) => {
  return (
    <View style={styles.touchpadContainer}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>🟢 Connected</Text>
        <Text style={styles.statusHint}>Drag = move • Tap = L-click • Hold = R-click • 2 fingers = scroll</Text>
      </View>

      <Touchpad client={client} />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            client.click('left');
          }}
        >
          <Text style={styles.btnText}>L</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            client.click('right');
          }}
        >
          <Text style={styles.btnText}>R</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );
};

const ConnectionScreen = ({ onConnect }) => {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8080');
  const [deviceName, setDeviceName] = useState('My Phone');
  const [token, setToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  const handleConnect = async () => {
    if (!ip.trim()) {
      setError('Enter the PC IP address');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await onConnect(ip.trim(), port || '8080', deviceName.trim() || 'My Phone', token);
    } catch (err) {
      setError(err.message || 'Connection failed');
      setConnecting(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (!data) return;
    setScanning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let clean = data;
      if (clean.startsWith('ws://')) clean = clean.slice(5);
      if (clean.startsWith('nexusmote://')) {
        const url = new URL(clean);
        const scannedIp = url.hostname || '';
        const scannedPort = url.port || '';
        const scannedToken = url.searchParams.get('token');
        if (scannedIp) setIp(scannedIp);
        if (scannedPort) setPort(scannedPort);
        if (scannedToken) setToken(scannedToken);
        return;
      }
      const [ipPart, portPart] = clean.split(':');
      if (ipPart) setIp(ipPart);
      if (portPart) setPort(portPart);
    } catch (err) {
      console.warn('QR parse failed', err);
    }
  };

  if (hasCameraPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Requesting camera permission…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SafeAreaView style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="mouse" size={56} color="#3b82f6" />
        </View>
        <Text style={styles.title}>NexusMote</Text>
        <Text style={styles.subtitle}>Turn your phone into a wireless touchpad</Text>
      </SafeAreaView>

      {!scanning ? (
        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Ionicons name="server" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="192.168.1.10"
              placeholderTextColor="#475569"
              value={ip}
              onChangeText={setIp}
              autoCapitalize="none"
              autoComplete="ip"
              kbType="ip-address"
            />
          </View>

          <View style={[styles.inputRow, { maxWidth: 120 }]}>
            <Ionicons name="hash" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="8080"
              placeholderTextColor="#475569"
              value={port}
              onChangeText={setPort}
              kbType="number-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="phone-portrait" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="My Phone"
              placeholderTextColor="#475569"
              value={deviceName}
              onChangeText={setDeviceName}
            />
          </View>

          {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, connecting && styles.btnDisabled]}
            onPress={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Connect</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => setScanning(true)}>
            <Ionicons name="qr-code" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
            <Text style={styles.scanBtnText}>Scan QR Code</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Tip: scan the QR code on your PC or type the IP shown there.</Text>
        </View>
      ) : (
        hasCameraPermission ? (
          <View style={styles.scannerContainer}>
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>Point at QR code on your PC</Text>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setScanning(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.container}>
            <Text style={styles.error}>Camera permission required to scan QR codes.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => setScanning(false)}>
              <Text style={styles.btnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </ScrollView>
  );
};

export default function App() {
  const [client] = useState(() => new NexusMoteClient());
  const [screen, setScreen] = useState('connect');
  const [connected, setConnected] = useState(false);

  const handleConnect = useCallback(async (ip, port, deviceName, token) => {
    const wsUrl = `ws://${ip}:${port}/ws`;
    try {
      await client.connect(wsUrl, deviceName, token || null);
      setScreen('touchpad');
      setConnected(true);
    } catch (err) {
      Alert.alert('Connection Failed', err.message);
      throw err;
    }
  }, [client]);

  const handleDisconnect = useCallback(() => {
    client.disconnect();
    setScreen('connect');
    setConnected(false);
  }, [client]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {screen === 'connect' ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <TouchpadScreen client={client} onDisconnect={handleDisconnect} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flex: 1, padding: 24, justifyContent: 'center', paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  form: { gap: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, color: '#f1f5f9', fontSize: 16 },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scanBtn: { backgroundColor: 'transparent', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginTop: 4 },
  scanBtnText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  hint: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8 },
  scannerContainer: { flex: 1, justifyContent: 'center' },
  scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scannerFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#3b82f6', borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.1)' },
  scannerText: { color: '#94a3b8', fontSize: 14, marginTop: 16, textAlign: 'center' },
  cancelBtn: { position: 'absolute', bottom: 40, padding: 12, backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 8 },
  cancelText: { color: '#94a3b8', fontSize: 16 },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  touchpadContainer: { flex: 1, backgroundColor: '#0f172a' },
  statusBar: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  statusText: { color: '#22c55e', fontSize: 16, fontWeight: '600' },
  statusHint: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  touchpad: { flex: 1, backgroundColor: '#1e293b' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 24, backgroundColor: '#0f172a' },
  disconnectBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1e293b' },
  disconnectText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});