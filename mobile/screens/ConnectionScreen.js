import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConnectionScreen({ onConnect }) {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8080');
  const [deviceName, setDeviceName] = useState('My Phone');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!ip.trim()) {
      setError('Enter the PC IP address');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await onConnect(ip.trim(), port || '8080', deviceName.trim() || 'My Phone');
    } catch (err) {
      setError(err.message || 'Connection failed');
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mouse" size={48} color="#3b82f6" />
        <Text style={styles.title}>NexusMote</Text>
        <Text style={styles.subtitle}>Turn your phone into a wireless touchpad</Text>
      </View>

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
           _kbType="ip-address"
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

        <Text style={styles.hint}>Tip: scan the QR code on your PC or type the IP shown there.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 32, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: '#f1f5f9', marginTop: 12 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 6, textAlign: 'center' },
  form: { gap: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, color: '#f1f5f9', fontSize: 16 },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  btn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  hint: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8 },
});