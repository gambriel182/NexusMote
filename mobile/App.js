import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ConnectionScreen from './screens/ConnectionScreen';
import TouchpadScreen from './screens/TouchpadScreen';
import NexusMoteClient from './services/client';

const Stack = createStackNavigator();

export default function App() {
  const [client] = useState(() => new NexusMoteClient());

  const handleConnect = useCallback(async (ip, port, deviceName) => {
    const wsUrl = `ws://${ip}:${port}/ws`;
    try {
      await client.connect(wsUrl, deviceName, 'nexusmote-default-token-change-me');
    } catch (err) {
      Alert.alert('Connection Failed', err.message);
      throw err;
    }
  }, [client]);

  const handleDisconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="Connect"
            component={ConnectionScreen}
            options={{ onConnect: handleConnect }}
          />
          <Stack.Screen
            name="Touchpad"
            component={TouchpadScreen}
            options={{
              client,
              onDisconnect: handleDisconnect,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});