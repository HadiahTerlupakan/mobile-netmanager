import { AppVersionInfo, DownloadProgress, DownloadStatus } from '@/hooks/useAppVersion'
import React from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface UpdateAvailableModalProps {
    visible: boolean
    latestVersion: AppVersionInfo
    downloadStatus: DownloadStatus
    downloadProgress: DownloadProgress | null
    error: string | null
    onStartUpdate: () => void
    onLater: () => void
    onDismissError?: () => void
}

export function UpdateAvailableModal({
    visible,
    latestVersion,
    downloadStatus,
    downloadProgress,
    error,
    onStartUpdate,
    onLater,
    onDismissError
}: UpdateAvailableModalProps) {
    const isDownloading = downloadStatus === 'downloading'
    const isInstalling = downloadStatus === 'installing'
    const isBusy = isDownloading || isInstalling

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={isBusy ? undefined : onLater}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerIcon}>🎉</Text>
                        <Text style={styles.title}>Update Tersedia</Text>
                    </View>

                    {/* Version Info */}
                    <Text style={styles.versionText}>
                        Versi {latestVersion.version} (Build {latestVersion.buildNumber})
                    </Text>

                    {/* Release Notes */}
                    {latestVersion.releaseNotes && (
                        <ScrollView style={styles.releaseNotesContainer}>
                            <Text style={styles.releaseNotesTitle}>Apa yang baru:</Text>
                            <Text style={styles.releaseNotes}>{latestVersion.releaseNotes}</Text>
                        </ScrollView>
                    )}

                    {/* File Size */}
                    {latestVersion.apkSize && (
                        <Text style={styles.sizeText}>
                            Ukuran: {(latestVersion.apkSize / (1024 * 1024)).toFixed(1)} MB
                        </Text>
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

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.laterButton, isBusy && { opacity: 0.5 }]} 
                            onPress={onLater}
                            disabled={isBusy}
                        >
                            <Text style={styles.laterButtonText}>Nanti Saja</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.updateButton, isBusy && styles.updateButtonDisabled]}
                            onPress={onStartUpdate}
                            disabled={isBusy}
                        >
                            {isBusy ? (
                                <View style={styles.buttonRow}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.updateButtonText}>...</Text>
                                </View>
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modal: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24
    },
    header: {
        alignItems: 'center',
        marginBottom: 16
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: 12
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b'
    },
    versionText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 16
    },
    releaseNotesContainer: {
        maxHeight: 100,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12
    },
    releaseNotesTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4
    },
    releaseNotes: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18
    },
    sizeText: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 16
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12
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
        marginBottom: 16,
        alignItems: 'center'
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 3
    },
    progressText: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center'
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    laterButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center'
    },
    laterButtonText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500'
    },
    updateButton: {
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    updateButtonDisabled: {
        opacity: 0.7
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    browserButton: {
        paddingVertical: 8,
        alignItems: 'center'
    },
    browserButtonText: {
        color: '#64748b',
        fontSize: 13
    }
})
