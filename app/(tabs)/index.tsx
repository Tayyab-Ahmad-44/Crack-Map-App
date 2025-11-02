import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApiUrl } from '../../utils/api';

interface Batch {
  id: string;
  photos: any[];
  response?: any;
  processing?: boolean;
}

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<any[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
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
    setBatches([]);
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

  const saveBatch = useCallback(async () => {
    if (capturedPhotos.length === 0) {
      return;
    }

    const batchId = `batch_${Date.now()}`;
    const newBatch: Batch = {
      id: batchId,
      photos: [...capturedPhotos],
      processing: true,
    };

    setBatches(prev => [...prev, newBatch]);
    setCapturedPhotos([]);

    try {
      const apiUrl = getApiUrl('/detect-cracks');
      const formData = new FormData();
      newBatch.photos.forEach((photo, index) => {
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
        setBatches(prev => prev.map(batch => 
          batch.id === batchId 
            ? { ...batch, response: data, processing: false }
            : batch
        ));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (err) {
      console.warn('Failed to save batch', err);
      setBatches(prev => prev.map(batch => 
        batch.id === batchId 
          ? { 
              ...batch, 
              response: {
                status: 'error',
                message: 'Failed to process batch. Please try again.',
                error: err instanceof Error ? err.message : 'Unknown error'
              }, 
              processing: false 
            }
          : batch
      ));
    }
  }, [capturedPhotos]);

  const onFinish = useCallback(() => {
    closeCamera();
    // If there are photos in current batch, save it first
    if (capturedPhotos.length > 0) {
      saveBatch();
    }
  }, [closeCamera, capturedPhotos, saveBatch]);

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
            {capturedPhotos.length > 0 && (
              <TouchableOpacity onPress={saveBatch} style={styles.saveBatchButton}>
                <Text style={styles.saveBatchButtonText}>Save Batch ({capturedPhotos.length})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onFinish} style={styles.finishButton}>
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!!capturedPhotos.length && !isCameraOpen && (
        <View style={styles.currentBatchContainer}>
          <Text style={styles.batchLabel}>Current Batch: {capturedPhotos.length} photos</Text>
          <ScrollView horizontal style={styles.thumbnailBar} contentContainerStyle={styles.thumbnailBarContent}>
            {capturedPhotos.map((p, idx) => (
              <View key={`${p.uri}-${idx}`} style={styles.thumb}>
                <View style={styles.thumbInner} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {batches.length > 0 && !isCameraOpen && (
        <ScrollView style={styles.batchesContainer}>
          <Text style={styles.batchesTitle}>Batches ({batches.length})</Text>
          {batches.map((batch) => (
            <View key={batch.id} style={styles.batchCard}>
              <Text style={styles.batchCardTitle}>
                Batch {batch.id.split('_')[1].slice(-6)} - {batch.photos.length} photos
              </Text>
              {batch.processing ? (
                <View style={styles.batchProcessing}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.batchProcessingText}>Processing...</Text>
                </View>
              ) : batch.response ? (
                <View style={styles.batchResult}>
                  {batch.response.status === 'success' ? (
                    <>
                      <Text style={styles.batchSuccessText}>
                        ✅ Processed: {batch.response.images_processed} images
                      </Text>
                      <TouchableOpacity
                        style={styles.batchResultButton}
                        onPress={() => router.push({
                          pathname: '/results-selection',
                          params: {
                            results: JSON.stringify(batch.response),
                            type: 'detection'
                          }
                        })}
                      >
                        <Text style={styles.batchResultButtonText}>View Results</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.batchErrorText}>❌ Processing failed</Text>
                      <Text style={styles.batchErrorDetails}>{batch.response.message}</Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      {!isCameraOpen && batches.length > 0 && (
        <View style={styles.clearAllContainer}>
          <TouchableOpacity style={styles.clearAllButton} onPress={clearAll}>
            <Text style={styles.clearAllButtonText}>Clear All Batches</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isCameraOpen && !serverResponse && batches.length === 0 && capturedPhotos.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No batches yet. Start capturing images!</Text>
        </View>
      )}

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.processingText}>Processing...</Text>
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
    gap: 8,
    padding: 16,
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexWrap: 'wrap',
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
  saveBatchButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBatchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
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
  currentBatchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  batchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  batchesContainer: {
    flex: 1,
    padding: 16,
  },
  batchesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  batchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  batchCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  batchProcessing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  batchProcessingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  batchResult: {
    marginTop: 8,
  },
  batchSuccessText: {
    color: '#10b981',
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 8,
  },
  batchErrorText: {
    color: '#ef4444',
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 4,
  },
  batchErrorDetails: {
    color: '#6b7280',
    fontSize: 12,
  },
  batchResultButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  batchResultButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  clearAllContainer: {
    padding: 16,
    alignItems: 'center',
  },
  clearAllButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  clearAllButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
