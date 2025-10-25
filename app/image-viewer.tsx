import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getImageUrl } from '../utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageViewerScreen() {
  const { imageUrl, imageId, title, type, cracksDetected, crackDetails } = useLocalSearchParams();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const parsedCrackDetails = crackDetails ? JSON.parse(crackDetails as string) : [];
  
  if (!imageUrl && !imageId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No image URL or ID available</Text>
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

  // Construct the full image URL
  const fullImageUrl = imageUrl ? getImageUrl(imageUrl) : getImageUrl(`/image/${imageId}`);
  
  console.log('Loading image from URL:', fullImageUrl);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Image Viewer'}
        </Text>
        <TouchableOpacity style={styles.clearButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          {!imageError ? (
            <Image
              source={{ uri: fullImageUrl }}
              style={styles.image}
              onLoad={() => {
                setImageLoaded(true);
                console.log('Image loaded successfully from URL');
              }}
              onError={(error) => {
                console.log('Image load error:', error);
                setImageError(true);
              }}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load image</Text>
              <Text style={styles.errorSubtext}>Unable to fetch image from server</Text>
            </View>
          )}
          {!imageLoaded && !imageError && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading image...</Text>
              <Text style={styles.loadingSubtext}>Fetching from server...</Text>
            </View>
          )}
        </View>

        {type === 'detection' && (
          <View style={styles.detectionInfo}>
            <Text style={styles.infoTitle}>Detection Results</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Cracks Detected:</Text>
              <Text style={styles.infoValue}>{cracksDetected || 0}</Text>
            </View>
            
            {parsedCrackDetails.length > 0 && (
              <View style={styles.crackDetailsContainer}>
                <Text style={styles.crackDetailsTitle}>Crack Details:</Text>
                {parsedCrackDetails.map((crack: any, index: number) => (
                  <View key={index} style={styles.crackDetailItem}>
                    <Text style={styles.crackLabel}>{crack.label}</Text>
                    <Text style={styles.crackInfo}>
                      Area: {crack.area.toFixed(0)}px² | Perimeter: {crack.perimeter.toFixed(0)}px
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {type === 'crack-map' && (
          <View style={styles.detectionInfo}>
            <Text style={styles.infoTitle}>Crack Map</Text>
            <Text style={styles.mapDescription}>
              This architectural-style map shows all detected cracks across your images.
              Each section represents a different image, with cracks highlighted in red.
            </Text>
            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Legend:</Text>
              <Text style={styles.legendItem}>• C1: Width &lt; 0.1mm</Text>
              <Text style={styles.legendItem}>• C2: Width &lt; 1mm</Text>
              <Text style={styles.legendItem}>• C3: Width &lt; 5mm</Text>
              <Text style={styles.legendItem}>• L1/L2/L3: Length classification</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 50, // Account for status bar
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    backgroundColor: '#000',
    minHeight: screenHeight * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingSubtext: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorSubtext: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  detectionInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  crackDetailsContainer: {
    marginTop: 8,
  },
  crackDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  crackDetailItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  crackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  crackInfo: {
    fontSize: 12,
    color: '#6b7280',
  },
  mapDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  legendContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  legendItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
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
