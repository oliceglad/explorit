import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const MapView = React.forwardRef(({ children, style, ...props }: any, ref: any) => {
  return (
    <View style={[styles.mapPlaceholder, style]}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>Карта недоступна в веб-версии</Text>
      <Text style={styles.subtitle}>Пожалуйста, откройте приложение в Expo Go на iOS или Android для полноценного использования GPS-навигации.</Text>
      {children}
    </View>
  );
});

export const Marker = ({ children, ...props }: any) => {
  return <View>{children}</View>;
};

export const Circle = ({ children, ...props }: any) => {
  return <View>{children}</View>;
};

export const Polyline = ({ children, ...props }: any) => {
  return <View>{children}</View>;
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});

export default MapView;
