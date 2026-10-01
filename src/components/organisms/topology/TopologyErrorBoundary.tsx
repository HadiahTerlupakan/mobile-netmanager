import React, { ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { errorReportingService } from '@/services/ErrorReportingService';
import { useTemaPersona } from '@/theme';
import { logger } from '@/utils/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Tombol "Coba Lagi" berwarna identitas persona (komponen fungsi agar bisa memakai hook tema). */
function TombolCobaLagi({ onPress }: { onPress: () => void }) {
  const { warna } = useTemaPersona();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, { backgroundColor: warna.utamaKuat }]}>
      <Text style={styles.buttonText}>Coba Lagi</Text>
    </TouchableOpacity>
  );
}

export class TopologyErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[TopologyErrorBoundary] Caught:', error, errorInfo);
    errorReportingService.captureException(error, {
      boundary: 'topology',
      componentStack: errorInfo.componentStack,
    });
    errorReportingService.addBreadcrumb('error', 'Topology view crashed', {
      errorMessage: error.message,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Peta Topologi Error</Text>
          <Text style={styles.message}>
            {__DEV__ && this.state.error?.message
              ? this.state.error.message
              : 'Terjadi kesalahan saat memuat peta. Silakan coba lagi.'}
          </Text>
          <TombolCobaLagi onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
