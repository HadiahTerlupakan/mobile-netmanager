import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';
import { logger } from '@/utils/logger';
import { errorReportingService } from '@/services/ErrorReportingService';
import tw from 'twrnc';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report error
    errorReportingService.captureException(error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={tw`flex-1 items-center justify-center bg-gray-50 p-6`}>
          <View style={tw`bg-white p-6 rounded-2xl shadow-sm items-center w-full max-w-sm border border-gray-100`}>
            <View style={tw`w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4`}>
              <AlertTriangle size={32} color="#dc2626" />
            </View>

            <Text style={tw`text-xl font-bold text-gray-900 mb-2 text-center`}>
              Terjadi Kesalahan
            </Text>

            <Text style={tw`text-gray-500 text-center mb-6 leading-5`}>
              Maaf, aplikasi mengalami masalah tak terduga. Kami telah mencatat error ini.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={tw`max-h-32 w-full bg-gray-100 p-2 rounded mb-4`}>
                <Text style={tw`text-xs text-red-600 font-mono`}>
                  {this.state.error.toString()}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={this.resetError}
              style={tw`flex-row items-center justify-center bg-blue-600 w-full py-3 rounded-xl`}
            >
              <RefreshCcw size={18} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-bold`}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
