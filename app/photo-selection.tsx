import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DetectionResult {
  filename: string;
  overlay_image_id: string;
  overlay_image_url: string;
  cracks_detected: number;
  crack_details: Array<{
    label: string;
    area: number;
    perimeter: number;
  }>;
}

export default function PhotoSelectionScreen() {
  const { results, type } = useLocalSearchParams();
  
  const parsedResults: DetectionResult[] = results ? JSON.parse(results as string) : [];
  
  if (!parsedResults || parsedResults.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No detection results available</Text>
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

  const handleSelectPhoto = (result: DetectionResult, index: number) => {
    router.push({
      pathname: '/image-viewer',
      params: {
        imageUrl: result.overlay_image_url,
        imageId: result.overlay_image_id,
        title: result.filename,
        type: 'detection',
        cracksDetected: result.cracks_detected,
        crackDetails: JSON.stringify(result.crack_details)
      }
    });
  };

  const renderPhotoItem = ({ item, index }: { item: DetectionResult; index: number }) => (
    <TouchableOpacity 
      style={styles.photoItem}
      onPress={() => handleSelectPhoto(item, index)}
    >
      <View style={styles.photoPreview}>
        <Text style={styles.photoIcon}>📷</Text>
      </View>
      <View style={styles.photoInfo}>
        <Text style={styles.photoName} numberOfLines={1}>
          {item.filename}
        </Text>
        <Text style={styles.crackCount}>
          {item.cracks_detected} crack{item.cracks_detected !== 1 ? 's' : ''} detected
        </Text>
        {item.crack_details.length > 0 && (
          <Text style={styles.crackTypes}>
            Types: {item.crack_details.map(d => d.label).join(', ')}
          </Text>
        )}
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Photo to View</Text>
      <Text style={styles.subtitle}>
        Choose an image to view its crack detection results
      </Text>

      <FlatList
        data={parsedResults}
        renderItem={renderPhotoItem}
        keyExtractor={(item, index) => `${item.filename}-${index}`}
        style={styles.photoList}
        showsVerticalScrollIndicator={false}
      />

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
    marginBottom: 24,
  },
  photoList: {
    flex: 1,
    marginBottom: 16,
  },
  photoItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoPreview: {
    width: 60,
    height: 60,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photoIcon: {
    fontSize: 24,
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  crackCount: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 2,
  },
  crackTypes: {
    fontSize: 12,
    color: '#6b7280',
  },
  arrowContainer: {
    padding: 8,
  },
  arrow: {
    fontSize: 18,
    color: '#9ca3af',
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
