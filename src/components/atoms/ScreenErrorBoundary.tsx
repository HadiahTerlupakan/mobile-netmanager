import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react-native';
import { logger } from '@/utils/logger';
import { errorReportingService } from '@/services/ErrorReportingService';
import { router } from 'expo-router';
import tw from 'twrnc';

interface Props {
  children: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Screen-level Error Boundary
 *
 * Provides granular error handling for individual screens with:
 * - Error logging
 * - Recovery options (retry or go home)
 * - Screen context for debugging
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { screenName } = this.props;

    logger.error(`[ScreenErrorBoundary] Error in ${screenName || 'unknown'}:`, error);

    // Report error with screen context
    errorReportingService.captureException(error, {
      screen: screenName || 'unknown',
      componentStack: errorInfo.componentStack,
    });

    // Add breadcrumb for debugging
    errorReportingService.addBreadcrumb('error', `Screen crash: ${screenName}`, {
      errorMessage: error.message,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  goHome = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    router.replace('/(app)/dashboard');
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={tw`flex-1 items-center justify-center bg-gray-50 p-6`}>
          <View style={tw`bg-white p-6 rounded-2xl shadow-sm items-center w-full max-w-sm border border-gray-100`}>
            <View style={tw`w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4`}>
              <AlertTriangle size={32} color="#ea580c" />
            </View>

            <Text style={tw`text-xl font-bold text-gray-900 mb-2 text-center`}>
              Halaman Bermasalah
            </Text>

            <Text style={tw`text-gray-500 text-center mb-6 leading-5`}>
              Maaf, halaman ini mengalami masalah. Silakan coba lagi atau kembali ke beranda.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={tw`w-full bg-red-50 p-3 rounded-lg mb-4`}>
                <Text style={tw`text-xs text-red-600 font-mono`}>
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <View style={tw`flex-row w-full gap-3`}>
              <TouchableOpacity
                onPress={this.goHome}
                style={tw`flex-1 flex-row items-center justify-center bg-gray-200 py-3 rounded-xl`}
              >
                <Home size={18} color="#374151" style={tw`mr-2`} />
                <Text style={tw`text-gray-700 font-bold`}>Beranda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={this.resetError}
                style={tw`flex-1 flex-row items-center justify-center bg-blue-600 py-3 rounded-xl`}
              >
                <RefreshCcw size={18} color="white" style={tw`mr-2`} />
                <Text style={tw`text-white font-bold`}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap screens with error boundary
 */
export function withScreenErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ScreenErrorBoundary screenName={screenName}>
        <WrappedComponent {...props} />
      </ScreenErrorBoundary>
    );
  };
}
