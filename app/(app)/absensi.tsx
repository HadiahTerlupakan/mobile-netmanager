import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import { SyncService } from '@/services/SyncService';
import axios from 'axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { AlertTriangle, CalendarOff, Camera, Clock, MapPin, RefreshCw, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import tw from 'twrnc';
import LoadingModal from '../../components/LoadingModal';
import { Config } from '../../constants/Config';
import { useAuth } from '../../context/AuthContext';
import { generateSignature } from '../../utils/crypto';

// Geofence Types
interface GeofenceZone {
    siteId: string;
    siteName: string;
    latitude: number;
    longitude: number;
    radius: number;
}

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const EARTH_RADIUS_METERS = 6371000;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return EARTH_RADIUS_METERS * c;
};

export default function AbsensiScreen() {
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Status State
    const [status, setStatus] = useState<'idle' | 'checked-in' | 'checked-out'>('idle');
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
    const [workDuration, setWorkDuration] = useState('00:00');
    const [locationName, setLocationName] = useState('Mencari lokasi...');

    // Camera & Location State
    const [showCamera, setShowCamera] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>('front');
    const watermarkRef = useRef<View>(null);
    const [capturedTime, setCapturedTime] = useState<Date | null>(null);
    const [todayHoliday, setTodayHoliday] = useState<{ isHoliday: boolean; name: string | null }>({ isHoliday: false, name: null });

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Geofence State
    const [geofenceZones, setGeofenceZones] = useState<GeofenceZone[]>([]);
    const [geofenceStatus, setGeofenceStatus] = useState<{
        isInside: boolean;
        distance: number | null;
        siteName: string | null;
    } | null>(null);
    const [showOutsideWarning, setShowOutsideWarning] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);
    
    // Loading overlay state
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memproses...');

    // Fetch Geofence Zones
    const fetchGeofenceZones = async () => {
        try {
            const res = await axios.get(`${Config.API_URL}/api/mobile/geofence`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success && res.data?.data?.zones) {
                setGeofenceZones(res.data.data.zones);
            }
        } catch (error) {
            console.log('Failed to fetch geofence zones:', error);
        }
    };

    // Check geofence when location changes
    const checkGeofence = (userLat: number, userLng: number) => {
        console.log('[Absensi] checkGeofence called with:', { userLat, userLng });
        console.log('[Absensi] geofenceZones.length:', geofenceZones.length);
        
        if (geofenceZones.length === 0) {
            console.log('[Absensi] No zones found, setting isInside to true (fallback)');
            setGeofenceStatus({ isInside: true, distance: null, siteName: null });
            return;
        }

        let nearestDistance = Infinity;
        let nearestSiteName: string | null = null;
        let isInside = false;

        for (const zone of geofenceZones) {
            const distance = calculateDistance(userLat, userLng, zone.latitude, zone.longitude);
            console.log(`[Absensi] Distance to ${zone.siteName}: ${distance}m (radius: ${zone.radius}m)`);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestSiteName = zone.siteName;
            }
            if (distance <= zone.radius) {
                isInside = true;
                console.log(`[Absensi] INSIDE zone: ${zone.siteName}`);
            }
        }

        console.log('[Absensi] Final geofence status:', { isInside, nearestDistance, nearestSiteName });
        setGeofenceStatus({
            isInside,
            distance: Math.round(nearestDistance),
            siteName: nearestSiteName
        });
    };

    // Fetch Initial Data (Location, Status, Geofence)
    useEffect(() => {
        fetchStatus();
        getLocation();
        if (token) fetchGeofenceZones();
    }, [token]);
    
    // Re-check geofence whenever zones or location changes
    // This fixes the race condition where checkGeofence was called before zones were fetched
    useEffect(() => {
        if (location && geofenceZones.length > 0) {
            console.log('[Absensi] Re-checking geofence with zones:', geofenceZones.length);
            checkGeofence(location.coords.latitude, location.coords.longitude);
        }
    }, [geofenceZones, location]);

    const { mutate, isLoading: isMutating } = useOfflineMutation();

    const { data: statusData, refetch: refetchStatus } = useOfflineQuery<any>({
        key: 'attendance_status_latest',
        fetcher: async () => {
             const res = await axios.get(`${Config.API_URL}/api/mobile/attendance/history?limit=1`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!token
    });

    useEffect(() => {
        if (statusData && statusData.success) {
            // Update Holiday Status
            if (statusData.today && statusData.today.isHoliday) {
                setTodayHoliday({ isHoliday: true, name: statusData.today.holidayName });
            } else {
                setTodayHoliday({ isHoliday: false, name: null });
            }

            if (statusData.data.length > 0) {
                const lastAttendance = statusData.data[0];
            const today = new Date().toDateString();
            const attendanceDate = new Date(lastAttendance.checkIn).toDateString();

            if (today === attendanceDate) {
                setCheckInTime(format(new Date(lastAttendance.checkIn), 'HH:mm'));
                if (lastAttendance.checkOut) {
                    setStatus('checked-out');
                    setCheckOutTime(format(new Date(lastAttendance.checkOut), 'HH:mm'));
                    // Ensure tracking stopped
                    LocationTrackingService.stopTracking().catch(console.error);
                } else {
                    setStatus('checked-in');
                    // Resume tracking if needed
                    LocationTrackingService.startTracking().catch(console.error);
                }
            } else {
                 // New day...
                 // Only reset if NOT checked in today?
                 // Original logic resets if date mismatch. Correct.
                 setStatus('idle');
                 setCheckInTime(null);
                 setCheckOutTime(null);
            }
        }
        }
    }, [statusData]);

    const fetchStatus = refetchStatus; // Alias for compatibility called in useEffect

    const getLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin lokasi untuk absensi.');
                return;
            }

            let location = await Location.getLastKnownPositionAsync({});
            if (!location) {
                location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }

            setLocation(location);

            // Check geofence with new location
            checkGeofence(location.coords.latitude, location.coords.longitude);

            // Reverse Geocode
            try {
                const reverse = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                if (reverse.length > 0) {
                    const addr = reverse[0];
                    setLocationName(`${addr.street || ''} ${addr.district || ''}, ${addr.city || ''}`);
                }
            } catch (e) {
                console.log("Geocode failed, using coordinates");
                setLocationName(`${location.coords.latitude}, ${location.coords.longitude}`);
            }
        } catch (error) {
            console.warn("Location Error:", error);
            setLocationName("Lokasi tidak ditemukan (Cek GPS)");
            Alert.alert("Lokasi Error", "Pastikan GPS aktif. Di Emulator, set location di menu Extended Controls.");
        }
    };

    const handleCapture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                base64: false, // Don't need base64, we'll manipulate the URI
                quality: 0.7
            });
            
            if (photo?.uri) {
                try {
                    // Flip horizontal to fix front camera mirror effect
                    const manipulated = await ImageManipulator.manipulateAsync(
                        photo.uri,
                        [{ flip: ImageManipulator.FlipType.Horizontal }],
                        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                    );
                    
                    setPhoto('data:image/jpeg;base64,' + manipulated.base64);
                    console.log('[Absensi] Photo captured and flipped successfully');
                } catch (flipError) {
                    console.error('[Absensi] Failed to flip photo, using original:', flipError);
                    // Fallback: use original photo without flip
                    const original = await cameraRef.current.takePictureAsync({
                        base64: true,
                        quality: 0.7
                    });
                    setPhoto('data:image/jpeg;base64,' + original?.base64);
                }
            }
            setShowCamera(false);
        }
    };

    const processPhoto = async (): Promise<string | null> => {
       return await captureWatermarkedPhoto();
    };

    const uploadPhotos = async (uris: string[], retryCount = 2): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        
        // NOTE: Warmup request removed - retry logic handles connection issues better
        // Previous warmup added ~300-500ms latency without significant benefit

        
        for (const uri of uris) {
            let attempts = 0;
            let success = false;
            let lastError = '';
            
            while (attempts <= retryCount && !success) {
                attempts++;
                try {
                    console.log(`[Absensi] Uploading photo attempt ${attempts}/${retryCount + 1}...`);
                    console.log(`[Absensi] URI: ${uri.substring(0, 50)}...`);
                    
                    // Validate URI format
                    if (!uri || (!uri.startsWith('file://') && !uri.startsWith('/'))) {
                        console.error('[Absensi] Invalid URI format, skipping');
                        lastError = 'Format file tidak valid';
                        break;
                    }
                    
                    const formData = new FormData();
                    const filename = uri.split('/').pop() || 'photo.jpg';
                    formData.append('file', {
                        uri: uri.startsWith('file://') ? uri : `file://${uri}`,
                        type: 'image/jpeg',
                        name: filename,
                    } as any);
                    formData.append('type', 'employee-attendance');

                    // Use axios timeout config
                    const res = await axios.post(`${Config.API_URL}/api/mobile/upload`, formData, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data',
                        },
                        timeout: 60000, // 60 second timeout for upload
                    });
                    
                    if (res.data?.url) {
                        uploadedUrls.push(res.data.url);
                        success = true;
                        console.log('[Absensi] Photo uploaded successfully:', res.data.url);
                    } else {
                        lastError = 'Server tidak mengembalikan URL foto';
                        console.error('[Absensi] Upload response missing URL:', res.data);
                    }
                } catch (error: any) {
                    const errorMsg = error.code === 'ECONNABORTED' 
                        ? 'Timeout - koneksi terlalu lambat'
                        : error.response?.data?.error || error.message || 'Upload error';
                    lastError = errorMsg;
                    console.error(`[Absensi] Upload attempt ${attempts} failed:`, errorMsg);
                    
                    if (attempts <= retryCount) {
                        console.log(`[Absensi] Retrying upload in 1 second...`);
                        setLoadingMessage(`Mencoba upload ulang (${attempts}/${retryCount})...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            if (!success) {
                console.error('[Absensi] All upload attempts failed. Last error:', lastError);
            }
        }
        return uploadedUrls;
    };

    // Handler that checks geofence before submitting
    const handleSubmit = async () => {
        console.log('[Absensi] handleSubmit called');
        console.log('[Absensi] geofenceStatus:', geofenceStatus);
        console.log('[Absensi] photo:', !!photo, 'location:', !!location);
        
        if (!photo || !location) {
            Alert.alert("Data Belum Lengkap", "Pastikan foto dan lokasi sudah tersedia.");
            return;
        }

        // Check geofence status
        if (geofenceStatus && !geofenceStatus.isInside) {
            console.log('[Absensi] User is OUTSIDE, showing warning modal');
            // Show warning modal instead of blocking
            setShowOutsideWarning(true);
            return;
        }

        console.log('[Absensi] User is INSIDE or no geofence, proceeding to submit');
        // Proceed with submit
        await submitAttendance();
    };

    // Called when user confirms continue despite being outside zone
    const handleConfirmOutsideSubmit = async () => {
        console.log('[Absensi] handleConfirmOutsideSubmit called');
        console.log('[Absensi] photo:', photo ? 'exists' : 'null');
        console.log('[Absensi] location:', location ? 'exists' : 'null');
        console.log('[Absensi] status:', status);
        console.log('[Absensi] loading:', loading);
        console.log('[Absensi] isMutating:', isMutating);
        
        // TEMP DEBUG - Remove after testing
        // Alert.alert('DEBUG', `Button clicked!\nPhoto: ${!!photo}\nLocation: ${!!location}\nStatus: ${status}`);
        
        setShowOutsideWarning(false);
        
        // Show loading overlay immediately
        setIsProcessing(true);
        setLoadingMessage('Memvalidasi data...');
        
        // Double check data sebelum submit
        if (!photo) {
            console.error('[Absensi] Foto tidak tersedia');
            setIsProcessing(false);
            Alert.alert("Foto Tidak Ada", "Foto tidak tersedia. Silakan ambil foto ulang.");
            return;
        }
        
        if (!location) {
            console.error('[Absensi] Lokasi tidak tersedia');
            setIsProcessing(false);
            Alert.alert("Lokasi Tidak Ada", "Lokasi tidak tersedia. Silakan refresh halaman dan pastikan GPS aktif.");
            return;
        }
        
        try {
            await submitAttendance();
        } catch (error: any) {
            console.error('[Absensi] Error saat submit dari geofence warning:', error);
            setIsProcessing(false);
            Alert.alert("Error", error?.message || "Gagal melakukan absensi. Silakan coba lagi.");
        }
    };

    const submitAttendance = async () => {
        console.log('[Absensi] submitAttendance called');
        
        if (!photo || !location) {
            console.log('[Absensi] submitAttendance - data tidak lengkap, photo:', !!photo, 'location:', !!location);
            setIsProcessing(false);
            Alert.alert("Data Belum Lengkap", "Pastikan foto dan lokasi sudah tersedia.");
            return;
        }

        const endpoint = status === 'idle' ? '/api/mobile/attendance/check-in' : '/api/mobile/attendance/check-out';
        console.log('[Absensi] endpoint:', endpoint);
        
        // Show processing overlay if not already shown
        if (!isProcessing) {
            setIsProcessing(true);
        }
        
        // 1. Process Photo
        setLoadingMessage('Memproses foto...');
        console.log('[Absensi] Processing photo...');
        const processedUri = await processPhoto();
        console.log('[Absensi] processedUri:', processedUri ? 'success' : 'failed');
        if (!processedUri) {
            console.error('[Absensi] processPhoto returned null');
            setIsProcessing(false);
            Alert.alert("Error", "Gagal memproses foto. Silakan coba lagi.");
            return;
        }

        // 2. Check Connection
        setLoadingMessage('Mengecek koneksi...');
        console.log('[Absensi] Checking connection...');
        const isOnline = await SyncService.isOnline();
        console.log('[Absensi] isOnline:', isOnline);
        
        // 3. Prepare Payload (JSON)
        const payload = {
            location: locationName,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            capturedAt: (capturedTime || new Date()).toISOString(),
            // notes: ... (if we add notes field later)
        };

        if (isOnline) {
             setLoading(true);
             try {
                // Upload Photo
                setLoadingMessage('Mengupload foto...');
                const uploadedUrls = await uploadPhotos([processedUri]);
                const photoUrl = uploadedUrls[0];
                
                if (!photoUrl) throw new Error("Gagal upload foto. Periksa koneksi internet Anda.");

                // Submit JSON
                setLoadingMessage('Mengirim data absensi...');
                const response = await mutate({
                    ...payload,
                    photoUrl: photoUrl
                }, {
                    url: endpoint,
                    method: 'POST',
                    onSuccess: async (data: any) => {
                         
                         // Start/Stop location tracking based on action
                         try {
                             if (status === 'idle') {
                                 // Check-in: Start tracking
                                 setLoadingMessage('Mengaktifkan tracking...');
                                 await LocationTrackingService.startTracking();
                             } else {
                                 // Check-out: Stop tracking
                                 setLoadingMessage('Menonaktifkan tracking...');
                                 await LocationTrackingService.stopTracking();
                             }
                         } catch (trackingError) {
                             console.log('[Absensi] Tracking error (non-fatal):', trackingError);
                         }

                         setLoadingMessage('Berhasil!');
                         await new Promise(resolve => setTimeout(resolve, 500));
                         
                         // Close overlay FIRST before any other action
                         setIsProcessing(false);
                         setLoading(false);
                         
                         // Alert logic
                         if (status === 'idle') {
                             Alert.alert("Berhasil", "Check-in Berhasil!");
                         } else {
                             // Check for warning from FLEXIBLE mode users
                             if (data?.warning) {
                                 Alert.alert(
                                     "⚠️ Peringatan Jam Kerja", 
                                     data.warning + "\n\nCheckout tetap berhasil.",
                                     [{ text: "OK" }]
                                 );
                             } else {
                                 Alert.alert("Berhasil", "Check-out Berhasil!");
                             }
                         }
                         
                         fetchStatus();
                         setPhoto(null);
                    },
                    onError: (e) => {
                        setIsProcessing(false);
                        setLoading(false);
                        Alert.alert("Gagal", e.message || "Terjadi kesalahan saat mengirim data.");
                    }
                });
             } catch (error: any) {
                 setIsProcessing(false);
                 setLoading(false);
                 Alert.alert("Error", error.message || "Gagal Absen");
             } finally {
                 // Do not force setLoading(false) here as it might be handled in onSuccess
                 // But strictly speaking, if we follow the flow above, it's handled.
                 if (!isOnline) setLoading(false);
             }
        } else {
            // Offline
            setLoadingMessage('Menyimpan offline...');
            await mutate({
                ...payload,
                photoUrl: null, // Placeholder
                meta: {
                    photos: [processedUri],
                    targetField: 'photoUrl',
                    singleFile: true,
                    photoType: 'employee-attendance'
                },
                _offline_meta: {
                    capturedAt: payload.capturedAt,
                    signature: generateSignature({
                        userId: user?.id,
                        timestamp: payload.capturedAt,
                        latitude: payload.latitude,
                        longitude: payload.longitude
                    })
                }
            }, {
                url: endpoint,
                method: 'POST',
                onSuccess: (data, isOffline) => {
                    setIsProcessing(false);
                    if (isOffline) {
                        setPhoto(null);
                        Alert.alert("Offline", "Data disimpan dan akan dikirim saat online.");
                    }
                },
                onError: (e) => {
                    setIsProcessing(false);
                    Alert.alert("Gagal", e.message || "Terjadi kesalahan");
                }
            });
        }
    };

    // Switch to URI based capture for FormData compatibility
    const handleCaptureURI = async () => {
        if (cameraRef.current) {
            const result = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                skipProcessing: false
            });
            // result.uri is the file path
            setPhoto(result?.uri ?? null);
            setCapturedTime(new Date()); // Store capture time for watermark
            setShowCamera(false);
        }
    }

    // Capture watermarked photo before submission
    const captureWatermarkedPhoto = async (): Promise<string | null> => {
        console.log('[Absensi] captureWatermarkedPhoto called');
        console.log('[Absensi] watermarkRef.current:', !!watermarkRef.current);
        console.log('[Absensi] photo:', photo ? 'exists' : 'null');
        
        if (!watermarkRef.current) {
            console.log('[Absensi] No watermarkRef, returning original photo');
            return photo;
        }
        
        try {
            console.log('[Absensi] Capturing watermarked photo...');
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<string | null>((_, reject) => 
                setTimeout(() => reject(new Error('Capture timeout')), 10000)
            );
            
            const capturePromise = captureRef(watermarkRef, {
                format: 'jpg',
                quality: 0.8,
            });
            
            const uri = await Promise.race([capturePromise, timeoutPromise]);
            console.log('[Absensi] Watermark capture success:', uri);
            return uri;
        } catch (error) {
            console.error('[Absensi] Watermark capture error:', error);
            // Return original photo as fallback
            console.log('[Absensi] Returning original photo as fallback');
            return photo;
        }
    };

    if (showCamera) {
        if (!permission?.granted) {
            return (
                <View style={tw`flex-1 justify-center items-center`}>
                    <Text>Aplikasi butuh izin kamera</Text>
                    <TouchableOpacity onPress={requestPermission} style={tw`bg-blue-600 p-2 rounded mt-2`}>
                        <Text style={tw`text-white`}>Izinkan</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={tw`flex-1 bg-black`}>
                <CameraView
                    style={tw`flex-1`}
                    facing={facing}
                    ref={cameraRef}
                >
                    {/* Face Guide Overlay */}
                    <View style={tw`absolute inset-0 items-center justify-center`}>
                        <View style={[tw`w-56 h-72 border-2 border-white/60 rounded-full`, { borderStyle: 'dashed' }]} />
                        <Text style={tw`text-white/80 text-xs mt-4`}>Posisikan wajah dalam lingkaran</Text>
                    </View>

                    {/* Top Info Bar */}
                    <View style={tw`absolute top-12 left-0 right-0 items-center`}>
                        <View style={tw`bg-black/50 px-4 py-2 rounded-full`}>
                            <Text style={tw`text-white font-bold text-lg`}>{format(currentTime, 'HH:mm:ss')}</Text>
                        </View>
                        <Text style={tw`text-white/70 text-xs mt-1`}>{format(currentTime, 'EEEE, d MMMM yyyy', { locale: id })}</Text>
                    </View>

                    {/* Bottom Controls */}
                    <View style={tw`absolute bottom-0 left-0 right-0 p-6 pb-12`}>
                        {/* Location Info */}
                        <View style={tw`bg-black/50 p-3 rounded-xl mb-4`}>
                            <View style={tw`flex-row items-center`}>
                                <MapPin size={14} color="#fff" />
                                <Text style={tw`text-white text-xs ml-2 flex-1`} numberOfLines={1}>{locationName}</Text>
                            </View>
                            {location && (
                                <Text style={tw`text-white/60 text-[10px] mt-1`}>
                                    {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                                </Text>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View style={tw`flex-row justify-between items-center`}>
                            <TouchableOpacity onPress={() => setShowCamera(false)} style={tw`bg-white/20 p-3 rounded-full`}>
                                <X color="white" size={24} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleCaptureURI} style={tw`h-20 w-20 bg-white rounded-full border-4 border-gray-300 items-center justify-center`}>
                                <View style={tw`h-16 w-16 bg-white rounded-full border-2 border-gray-200`} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setFacing(curr => curr === 'back' ? 'front' : 'back')} style={tw`bg-white/20 p-3 rounded-full`}>
                                <RotateCcw color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <ScrollView contentContainerStyle={tw`pb-20`}>
                {/* Header */}
                <View style={tw`${todayHoliday.isHoliday ? 'bg-red-600' : 'bg-blue-600'} px-6 pt-6 pb-12 rounded-b-[40px]`}>
                    <View style={tw`items-center`}>
                        <Text style={tw`${todayHoliday.isHoliday ? 'text-red-100' : 'text-blue-100'} font-medium text-sm mb-1`}>
                            {format(currentTime, 'EEEE, d MMMM yyyy', { locale: id })}
                        </Text>
                        <Text style={tw`text-white font-bold text-5xl`}>
                            {format(currentTime, 'HH:mm')}
                        </Text>
                        {todayHoliday.isHoliday && (
                            <View style={tw`bg-white/20 px-3 py-1 rounded-full mt-2 flex-row items-center`}>
                                <CalendarOff size={14} color="white" />
                                <Text style={tw`text-white font-bold text-xs ml-1`}>LIBUR NASIONAL</Text>
                            </View>
                        )}
                        {todayHoliday.name && (
                            <Text style={tw`text-white/80 text-xs mt-1 text-center max-w-[80%]`}>{todayHoliday.name}</Text>
                        )}
                    </View>
                </View>

                {/* Content Card */}
                <View style={tw`px-4 -mt-8`}>
                    <View style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}>

                        {/* Location */}
                        <View style={tw`flex-row items-center bg-gray-50 p-3 rounded-xl mb-4`}>
                            <View style={tw`bg-blue-100 p-2 rounded-full mr-3`}>
                                <MapPin size={20} color="#2563eb" />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-xs text-gray-400 font-medium`}>Lokasi Saat Ini</Text>
                                <Text style={tw`text-gray-800 font-bold text-sm`}>{locationName}</Text>
                            </View>
                            <TouchableOpacity onPress={getLocation}>
                                <RefreshCw size={16} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Info Status */}
                        <View style={tw`flex-row justify-between mb-6`}>
                            <View style={tw`items-center flex-1 border-r border-gray-100`}>
                                <Text style={tw`text-xs text-gray-400 mb-1`}>Masuk</Text>
                                <Text style={tw`text-lg font-bold text-gray-800`}>{checkInTime || '--:--'}</Text>
                            </View>
                            <View style={tw`items-center flex-1`}>
                                <Text style={tw`text-xs text-gray-400 mb-1`}>Keluar</Text>
                                <Text style={tw`text-lg font-bold text-gray-800`}>{checkOutTime || '--:--'}</Text>
                            </View>
                        </View>

                        {/* Main Action Button */}
                        {photo ? (
                            <View style={tw`mb-4`}>
                                {/* Watermarked Photo Preview - this will be captured */}
                                <View
                                    ref={watermarkRef}
                                    collapsable={false}
                                    style={tw`w-full h-80 rounded-xl overflow-hidden mb-2 bg-black`}
                                >
                                    <Image
                                        source={{ uri: photo }}
                                        style={tw`w-full h-full`}
                                        resizeMode="cover"
                                    />
                                    {/* Watermark Overlay */}
                                    <View style={tw`absolute bottom-0 left-0 right-0 bg-black/60 p-3`}>
                                        <View style={tw`flex-row items-center mb-1`}>
                                            <Clock size={12} color="#fff" />
                                            <Text style={tw`text-white font-bold text-sm ml-2`}>
                                                {capturedTime ? format(capturedTime, 'HH:mm:ss') : '--:--:--'}
                                            </Text>
                                            <Text style={tw`text-white/80 text-xs ml-2`}>
                                                {capturedTime ? format(capturedTime, 'EEEE, d MMMM yyyy', { locale: id }) : ''}
                                            </Text>
                                        </View>
                                        <View style={tw`flex-row items-center mb-1`}>
                                            <MapPin size={12} color="#fff" />
                                            <Text style={tw`text-white text-xs ml-2 flex-1`} numberOfLines={1}>
                                                {locationName}
                                            </Text>
                                        </View>
                                        {location && (
                                            <Text style={tw`text-white/60 text-[10px]`}>
                                                📍 {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={tw`flex-row gap-2`}>
                                    <TouchableOpacity onPress={() => { setPhoto(null); setCapturedTime(null); }} style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}>
                                        <Text style={tw`font-bold text-gray-600`}>Ulang Foto</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSubmit} disabled={loading || isMutating} style={tw`flex-1 bg-blue-600 py-3 rounded-xl items-center`}>
                                        <Text style={tw`font-bold text-white`}>{(loading || isMutating) ? 'Menyimpan...' : 'Kirim Absensi'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => setShowCamera(true)}
                                disabled={status === 'checked-out' || todayHoliday.isHoliday}
                                style={tw`${todayHoliday.isHoliday ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border-2 border-dashed rounded-2xl h-32 items-center justify-center mb-2`}
                            >
                                {todayHoliday.isHoliday ? (
                                    <>
                                        <CalendarOff size={32} color="#dc2626" />
                                        <Text style={tw`text-red-600 font-bold mt-2`}>Libur Nasional</Text>
                                        <Text style={tw`text-red-400 text-xs`}>Absensi dinonaktifkan</Text>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={32} color="#2563eb" />
                                        <Text style={tw`text-blue-600 font-bold mt-2`}>
                                            {status === 'idle' ? 'Ambil Foto Masuk' : status === 'checked-in' ? 'Ambil Foto Keluar' : 'Absensi Selesai'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

            </ScrollView>

            {/* Geofence Warning Modal */}
            <Modal
                visible={showOutsideWarning}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowOutsideWarning(false)}
            >
                <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
                    <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
                        <View style={tw`items-center mb-4`}>
                            <View style={tw`bg-orange-100 p-3 rounded-full mb-3`}>
                                <AlertTriangle size={32} color="#f97316" />
                            </View>
                            <Text style={tw`text-lg font-bold text-gray-800 text-center`}>Di Luar Area Kantor</Text>
                        </View>
                        
                        <Text style={tw`text-gray-600 text-center mb-2`}>
                            Anda berada di luar area kantor yang ditentukan.
                        </Text>
                        
                        {geofenceStatus && geofenceStatus.distance && (
                            <View style={tw`bg-orange-50 p-3 rounded-xl mb-4`}>
                                <Text style={tw`text-orange-700 text-center text-sm`}>
                                    📍 Jarak: {geofenceStatus.distance > 1000 
                                        ? `${(geofenceStatus.distance / 1000).toFixed(1)} km` 
                                        : `${geofenceStatus.distance} m`} dari {geofenceStatus.siteName || 'kantor'}
                                </Text>
                            </View>
                        )}
                        
                        <Text style={tw`text-gray-500 text-center text-sm mb-4`}>
                            Apakah Anda ingin tetap melanjutkan absensi?
                        </Text>
                        
                        <View style={tw`flex-row gap-3`}>
                            <TouchableOpacity 
                                onPress={() => {
                                    console.log('[Absensi] Batal button pressed');
                                    setShowOutsideWarning(false);
                                }} 
                                style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}
                                activeOpacity={0.7}
                            >
                                <Text style={tw`font-bold text-gray-600`}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => {
                                    console.log('[Absensi] Lanjutkan button pressed - START');
                                    console.log('[Absensi] Current state - loading:', loading, 'isMutating:', isMutating);
                                    console.log('[Absensi] Data - photo:', !!photo, 'location:', !!location);
                                    
                                    // Temporarily removed disabled check for debugging
                                    if (loading || isMutating) {
                                        console.log('[Absensi] Would be disabled, but proceeding for debug');
                                    }
                                    
                                    handleConfirmOutsideSubmit();
                                    console.log('[Absensi] handleConfirmOutsideSubmit called - END');
                                }} 
                                // disabled={loading || isMutating}  // Temporarily disabled for testing
                                style={tw`flex-1 ${(loading || isMutating) ? 'bg-orange-300' : 'bg-orange-500'} py-3 rounded-xl items-center`}
                                activeOpacity={0.7}
                            >
                                <Text style={tw`font-bold text-white`}>{(loading || isMutating) ? 'Menyimpan...' : 'Lanjutkan'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Loading Overlay Standard */}
            <LoadingModal 
                visible={isProcessing} 
                message={loadingMessage} 
            />
        </SafeAreaView>
    );
}
