import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApiUrl } from '../../utils/api';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<any[]>([]);
  const [serverResponse, setServerResponse] = useState<any>(null);

  useEffect(() => {
    if (isCameraOpen && permission && !permission.granted) {
      requestPermission();
    }
  }, [isCameraOpen, permission, requestPermission]);

  const openCamera = useCallback(() => {
    setServerResponse(null);
    setIsCameraOpen(true);
  }, []);

  const closeCamera = useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  const clearAll = useCallback(() => {
    setCapturedPhotos([]);
    setServerResponse(null);
    setIsProcessing(false);
    setIsCameraOpen(false);
  }, []);

  const onTakePhoto = useCallback(async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false, skipProcessing: true });
      if (photo) {
        setCapturedPhotos(prev => [...prev, photo]);
      }
    } catch (err) {
      console.warn('Failed to take photo', err);
    }
  }, []);

  const onFinish = useCallback(async () => {
    try {
      closeCamera();
      setIsProcessing(true);
      
      if (capturedPhotos.length === 0) {
        setServerResponse({ 
          status: 'error',
          message: 'No photos captured. Please take some photos first.',
        });
        setIsProcessing(false);
        return;
      }

      const apiUrl = getApiUrl('/detect-cracks');
      const testMode = false;

      if (testMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockResponse = {
          status: 'success',
          images_processed: capturedPhotos.length,
          results: capturedPhotos.map((photo, index) => ({
            filename: `image_${index}.jpg`,
            overlay_image_id: `mock_overlay_${index}`,
            overlay_image_url: `/image/mock_overlay_${index}`,
            cracks_detected: Math.floor(Math.random() * 5),
            crack_details: [
              { label: 'C1L1', area: 100, perimeter: 50 },
              { label: 'C2L2', area: 200, perimeter: 80 }
            ]
          })),
          crack_map_id: 'mock_crack_map',
          crack_map_url: '/image/mock_crack_map'
        };
        setServerResponse(mockResponse);
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      capturedPhotos.forEach((photo, index) => {
        formData.append('files', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        } as any);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        setServerResponse(data);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (err) {
      console.warn('Failed to finish flow', err);
      setServerResponse({
        status: 'error',
        message: 'Failed to process images. Please try again.',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [closeCamera, capturedPhotos]);

  const hasPermission = permission?.granted ?? false;
  const needsPermission = permission && !permission.granted && !permission.canAskAgain;

  const photoCountLabel = useMemo(() => `${capturedPhotos.length} photo${capturedPhotos.length === 1 ? '' : 's'}`, [capturedPhotos.length]);

  return (
    <View style={styles.container}>
      {!isCameraOpen && !isProcessing && !serverResponse && (
        <View style={styles.homeContainer}>
          <Text style={styles.welcome}>Crack Detection App</Text>
          <TouchableOpacity onPress={openCamera} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open Camera</Text>
          </TouchableOpacity>
          {capturedPhotos.length > 0 && (
            <Text style={styles.counterText}>{photoCountLabel} captured</Text>
          )}
        </View>
      )}

      {isCameraOpen && (
        <View style={styles.cameraContainer}>
          {hasPermission ? (
            <CameraView ref={(ref: any) => (cameraRef.current = ref)} style={styles.camera} facing="back" />
          ) : (
            <View style={styles.permissionContainer}>
              {needsPermission ? (
                <Text style={styles.permissionText}>Camera permission is not available in settings.</Text>
              ) : (
                <TouchableOpacity onPress={requestPermission} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Grant Camera Permission</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.cameraControls}>
            <TouchableOpacity onPress={onTakePhoto} style={styles.shutterButton}>
              <Text style={styles.shutterButtonText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onFinish} style={styles.finishButton}>
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!!capturedPhotos.length && !isCameraOpen && !isProcessing && !serverResponse && (
        <ScrollView horizontal style={styles.thumbnailBar} contentContainerStyle={styles.thumbnailBarContent}>
          {capturedPhotos.map((p, idx) => (
            <View key={`${p.uri}-${idx}`} style={styles.thumb}>
              <View style={styles.thumbInner} />
            </View>
          ))}
        </ScrollView>
      )}

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      {serverResponse && !isProcessing && !isCameraOpen && (
        <View style={styles.responseContainer}>
          {serverResponse.status === 'success' ? (
            <>
              <Text style={styles.successText}>✅ Images processed successfully!</Text>
              <Text style={styles.responseText}>
                {serverResponse.images_processed} images processed
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.resultButton}
                  onPress={() => router.push({
                    pathname: '/results-selection',
                    params: {
                      results: JSON.stringify(serverResponse),
                      type: 'detection'
                    }
                  })}
                >
                  <Text style={styles.resultButtonText}>View Results</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearAll}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.errorText}>❌ Processing failed</Text>
              <Text style={styles.responseText}>{serverResponse.message}</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.resultButton} onPress={openCamera}>
                  <Text style={styles.resultButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 24,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  counterText: {
    color: '#6b7280',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  permissionText: {
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  cameraControls: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  shutterButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shutterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  finishButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  thumbnailBar: {
    maxHeight: 80,
    margin: 16,
  },
  thumbnailBarContent: {
    gap: 8,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  thumbInner: {
    flex: 1,
    backgroundColor: '#cbd5e1',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 12,
  },
  processingText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  responseContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    gap: 16,
  },
  responseText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  successText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
    marginTop: 24,
  },
  resultButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
