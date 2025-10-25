import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ResultsSelectionScreen() {
  const { results, type } = useLocalSearchParams();
  
  const parsedResults = results ? JSON.parse(results as string) : null;
  
  if (!parsedResults || parsedResults.status !== 'success') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No results available</Text>
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearAllButton} onPress={() => {
            router.replace('/(tabs)');
          }}>
            <Text style={styles.clearAllButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleViewResults = (resultType: 'detection' | 'crack-map') => {
    if (resultType === 'crack-map') {
      // Navigate to crack map viewer with URL
      router.push({
        pathname: '/image-viewer',
        params: {
          imageUrl: parsedResults.crack_map_url,
          imageId: parsedResults.crack_map_id,
          title: 'Crack Map',
          type: 'crack-map'
        }
      });
    } else {
      // Navigate to photo selection for detection results
      router.push({
        pathname: '/photo-selection',
        params: {
          results: JSON.stringify(parsedResults.results),
          type: 'detection'
        }
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select View Type</Text>
      <Text style={styles.subtitle}>
        Choose how you want to view your crack detection results
      </Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => handleViewResults('detection')}
        >
          <Text style={styles.optionIcon}>🔍</Text>
          <Text style={styles.optionTitle}>Detection Results</Text>
          <Text style={styles.optionDescription}>
            View individual images with detected cracks highlighted
          </Text>
          <Text style={styles.optionCount}>
            {parsedResults.results?.length || 0} images available
          </Text>
        </TouchableOpacity>

        {parsedResults.crack_map_url && (
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => handleViewResults('crack-map')}
          >
            <Text style={styles.optionIcon}>🗺️</Text>
            <Text style={styles.optionTitle}>Crack Map</Text>
            <Text style={styles.optionDescription}>
              View architectural-style overview map of all detected cracks
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearAllButton} onPress={() => {
          // Navigate back to home and clear all data
          router.replace('/(tabs)');
        }}>
          <Text style={styles.clearAllButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  optionCount: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  clearAllButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  clearAllButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
