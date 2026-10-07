import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Touchpad = ({ client }) => {
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isPressed = useSharedValue(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const touchStartTime = useRef(0);
  const longPressTriggered = useRef(false);

  const handlePan = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      touchStartTime.current = Date.now();
      longPressTriggered.current = false;
      isPressed.value = true;
      ctx.startX = translationX.value;
      ctx.startY = translationY.value;
    },
    onActive: (event, ctx) => {
      const dx = event.translationX;
      const dy = event.translationY;

      if (event.numberOfTouches === 2) {
        // Two-finger scroll
        const scrollDy = dy - (ctx.lastScrollY || 0);
        ctx.lastScrollY = dy;
        if (Math.abs(scrollDy) > 1) {
          runOnJS(client.scroll)(scrollDy * 0.5);
        }
      } else if (event.numberOfTouches === 1) {
        // Single-finger move
        const moveX = dx - (ctx.lastMoveX || 0);
        const moveY = dy - (ctx.lastMoveY || 0);
        ctx.lastMoveX = dx;
        ctx.lastMoveY = dy;

        if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
          runOnJS(client.move)(moveX, moveY);
        }
      }
    },
    onEnd: () => {
      isPressed.value = false;
      // Check for tap vs long press
      const duration = Date.now() - touchStartTime.current;
      if (!longPressTriggered.current && duration < 300) {
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          client.click('left');
        })();
      }
    },
  });

  const handleLongPress = () => {
    if (!longPressTriggered.current) {
      longPressTriggered.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      client.click('right');
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleLongPress, 500);
    return () => clearTimeout(timer);
  }, [isPressed.value]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: isPressed.value ? 0.9 : 1,
      transform: [{ scale: scale.value }],
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
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>🟢 Connected</Text>
        <Text style={styles.statusText}>Drag = move • Tap = L-click • Hold = R-click • 2 fingers = scroll</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  statusBar: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  touchpad: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 24,
    backgroundColor: '#0f172a',
  },
  btn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3b82f6',
  },
  disconnectBtn: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TouchpadScreen;