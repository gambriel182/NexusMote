import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ConnectionScreen from './screens/ConnectionScreen';
import TouchpadScreen from './screens/TouchpadScreen';
import NexusMoteClient from './services/client';

export default function App() {
  const [client] = useState(() => new NexusMoteClient());
  const [screen, setScreen] = useState('connect');
  const [connected, setConnected] = useState(false);

  const handleConnect = useCallback(async (ip, port, deviceName) => {
    const wsUrl = `ws://${ip}:${port}/ws`;
    try {
      await client.connect(wsUrl, deviceName, 'nexusmote-default-token-change-me');
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
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});