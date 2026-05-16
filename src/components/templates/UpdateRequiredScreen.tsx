import { AppVersionInfo, DownloadProgress, DownloadStatus } from '@/hooks/useAppVersion'
import React from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface UpdateRequiredScreenProps {
    latestVersion: AppVersionInfo
    downloadStatus: DownloadStatus
    downloadProgress: DownloadProgress | null
    error: string | null
    onStartUpdate: () => void
    onDismissError?: () => void
}

export function UpdateRequiredScreen({
    latestVersion,
    downloadStatus,
    downloadProgress,
    error,
    onStartUpdate,
    onDismissError
}: UpdateRequiredScreenProps) {
    const isDownloading = downloadStatus === 'downloading'
    const isInstalling = downloadStatus === 'installing'
    const isBusy = isDownloading || isInstalling

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📱</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>Pembaruan Wajib</Text>
                <Text style={styles.subtitle}>
                    Versi baru tersedia untuk aplikasi SBL Karyawan
                </Text>

                {/* Version Info */}
                <View style={styles.versionCard}>
                    <View style={styles.versionRow}>
                        <Text style={styles.versionLabel}>Versi Baru:</Text>
                        <Text style={styles.versionValue}>v{latestVersion.version}</Text>
                    </View>
                    <View style={styles.versionRow}>
                        <Text style={styles.versionLabel}>Build:</Text>
                        <Text style={styles.versionValue}>{latestVersion.buildNumber}</Text>
                    </View>
                    {latestVersion.apkSize && (
                        <View style={styles.versionRow}>
                            <Text style={styles.versionLabel}>Ukuran:</Text>
                            <Text style={styles.versionValue}>
                                {(latestVersion.apkSize / (1024 * 1024)).toFixed(1)} MB
                            </Text>
                        </View>
                    )}
                </View>

                {/* Release Notes */}
                {latestVersion.releaseNotes && (
                    <View style={styles.releaseNotesContainer}>
                        <Text style={styles.releaseNotesTitle}>Apa yang baru:</Text>
                        <ScrollView style={styles.releaseNotesScroll}>
                            <Text style={styles.releaseNotes}>{latestVersion.releaseNotes}</Text>
                        </ScrollView>
                    </View>
                )}

                {/* Error Message */}
                {error && (
                    <TouchableOpacity style={styles.errorContainer} onPress={onDismissError}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Text style={styles.errorDismiss}>×</Text>
                    </TouchableOpacity>
                )}

                {/* Download Progress */}
                {isDownloading && downloadProgress && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View 
                                style={[
                                    styles.progressFill, 
                                    { width: `${downloadProgress.percentage}%` }
                                ]} 
                            />
                        </View>
                        <Text style={styles.progressText}>
                            Mengunduh... {downloadProgress.percentage.toFixed(0)}%
                        </Text>
                    </View>
                )}

                {/* Installing indicator */}
                {isInstalling && (
                    <View style={styles.progressContainer}>
                        <ActivityIndicator size="small" color="#10b981" />
                        <Text style={[styles.progressText, { marginTop: 8 }]}>
                            Memulai installer...
                        </Text>
                    </View>
                )}

                {/* Warning saat download/install — cegah user close app */}
                {isBusy && (
                    <View style={styles.warningContainer}>
                        <Text style={styles.warningIcon}>⚠️</Text>
                        <Text style={styles.warningText}>
                            {isInstalling
                                ? 'Memasang update, aplikasi akan restart otomatis. Mohon jangan tutup aplikasi.'
                                : 'Sedang mengunduh update. Mohon jangan tutup aplikasi sampai proses selesai.'}
                        </Text>
                    </View>
                )}

                {/* Main Update Button */}
                <TouchableOpacity
                    style={[
                        styles.updateButton,
                        isBusy && styles.updateButtonDisabled
                    ]}
                    onPress={onStartUpdate}
                    disabled={isBusy}
                >
                    {isBusy ? (
                        <View style={styles.buttonRow}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.updateButtonText}>
                                {isDownloading ? 'Mengunduh...' : 'Menginstall...'}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.updateButtonText}>Update Sekarang</Text>
                    )}
                </TouchableOpacity>

                {/* Footer */}
                <Text style={styles.footerText}>
                    Anda harus memperbarui aplikasi untuk melanjutkan
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    content: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ede9fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    icon: {
        fontSize: 40
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20
    },
    versionCard: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
    },
    versionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    versionLabel: {
        fontSize: 14,
        color: '#64748b'
    },
    versionValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b'
    },
    releaseNotesContainer: {
        width: '100%',
        marginBottom: 16
    },
    releaseNotesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8
    },
    releaseNotesScroll: {
        maxHeight: 80,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 12
    },
    releaseNotes: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18
    },
    errorContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16
    },
    errorText: {
        flex: 1,
        color: '#dc2626',
        fontSize: 13
    },
    errorDismiss: {
        color: '#dc2626',
        fontSize: 20,
        fontWeight: 'bold',
        paddingLeft: 8
    },
    progressContainer: {
        width: '100%',
        marginBottom: 16,
        alignItems: 'center'
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 4
    },
    progressText: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center'
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        gap: 8,
        width: '100%'
    },
    warningIcon: {
        fontSize: 16,
        lineHeight: 18
    },
    warningText: {
        flex: 1,
        color: '#92400e',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500'
    },
    updateButton: {
        width: '100%',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12
    },
    updateButtonDisabled: {
        opacity: 0.7
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    browserButton: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        marginBottom: 16
    },
    browserButtonText: {
        color: '#64748b',
        fontSize: 14
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center'
    }
})
