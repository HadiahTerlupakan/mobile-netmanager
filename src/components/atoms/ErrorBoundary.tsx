import * as Updates from 'expo-updates';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCcw, Download } from 'lucide-react-native';
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
  isUpdating: boolean;
  updateMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isUpdating: false,
      updateMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    errorReportingService.captureException(error, {
      componentStack: errorInfo.componentStack,
    });
    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isUpdating: false,
      updateMessage: '',
    });
  };

  checkAndApplyUpdate = async () => {
    if (__DEV__ || !Updates.isEnabled) {
      this.resetError();
      return;
    }
    this.setState({ isUpdating: true, updateMessage: 'Memeriksa update...' });
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        this.setState({ updateMessage: 'Mengunduh update...' });
        await Updates.fetchUpdateAsync();
        this.setState({ updateMessage: 'Menerapkan update...' });
        await Updates.reloadAsync();
      } else {
        this.setState({ isUpdating: false, updateMessage: '' });
        this.resetError();
      }
    } catch (err) {
      logger.warn('[ErrorBoundary] Update check/apply failed', err);
      this.setState({ isUpdating: false, updateMessage: '' });
      this.resetError();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isUpdating, updateMessage } = this.state;

      return (
        <View style={tw`flex-1 items-center justify-center bg-white p-6`}>
          <View style={tw`items-center w-full max-w-sm`}>
            <View style={tw`w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6`}>
              <AlertTriangle size={40} color="#dc2626" />
            </View>

            <Text style={tw`text-2xl font-bold text-gray-900 mb-2 text-center`}>
              Terjadi Kesalahan
            </Text>

            <Text style={tw`text-base text-gray-500 text-center mb-8 leading-6`}>
              Maaf, aplikasi mengalami masalah tak terduga. Kami telah mencatat kejadian ini untuk diperbaiki.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={tw`max-h-32 w-full bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100`}>
                <Text style={tw`text-xs text-red-600 font-mono`}>
                  {this.state.error.toString()}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={this.checkAndApplyUpdate}
              disabled={isUpdating}
              style={tw`flex-row items-center justify-center bg-indigo-600 w-full py-4 rounded-2xl shadow-sm mb-3`}
            >
              {isUpdating ? (
                <ActivityIndicator color="white" style={tw`mr-2`} />
              ) : (
                <Download size={20} color="white" style={tw`mr-2`} />
              )}
              <Text style={tw`text-white text-lg font-bold`}>
                {isUpdating ? updateMessage || 'Memperbarui...' : 'Cek & Update Aplikasi'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={this.resetError}
              disabled={isUpdating}
              style={tw`flex-row items-center justify-center bg-gray-100 w-full py-4 rounded-2xl`}
            >
              <RefreshCcw size={20} color="#374151" style={tw`mr-2`} />
              <Text style={tw`text-gray-700 text-lg font-bold`}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
