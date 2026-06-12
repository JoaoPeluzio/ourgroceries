import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';

export const AppPreloader: React.FC = () => {
  // Animation drivers
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(-1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Bounce & scale loop (0 -> 1 -> 0)
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Rotate loop (-1 -> 1 -> -1)
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Ripple loop (0 -> 1)
    Animated.loop(
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    // 4. Fade in text details
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 800,
      delay: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  // Interpolations
  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });

  const scale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const rippleScale1 = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.2],
  });

  const rippleOpacity1 = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  const rippleScale2 = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.8],
  });

  const rippleOpacity2 = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.animationWrapper}>
        {/* Glow Ripple Rings */}
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale1 }],
              opacity: rippleOpacity1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rippleSecondary,
            {
              transform: [{ scale: rippleScale2 }],
              opacity: rippleOpacity2,
            },
          ]}
        />

        {/* Animated Cart Circle */}
        <Animated.View
          style={[
            styles.cartCircle,
            {
              transform: [
                { translateY },
                { scale },
                { rotate },
              ],
            },
          ]}
        >
          <ShoppingCart size={38} color="#FFFFFF" strokeWidth={2.5} />
        </Animated.View>
      </View>

      {/* App Branding Text Details */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.brandTitle}>
          VIBECART
        </Text>
        <View style={styles.gradientLine} />
        <Text style={styles.loadingText}>
          syncing family cart...
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  cartCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#820AD1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#820AD1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ripple: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(130, 10, 209, 0.15)',
    borderWidth: 1.5,
    borderColor: '#820AD1',
  },
  rippleSecondary: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 107, 139, 0.08)',
    borderWidth: 1,
    borderColor: '#FF6B8B',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: 6,
  },
  gradientLine: {
    width: 60,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FF6B8B',
    marginTop: 12,
    marginBottom: 16,
    opacity: 0.8,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
});
