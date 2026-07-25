import { Skeleton } from '@/components/atoms/Skeleton';
import api from '@/services/api';
import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';
import { extractApiErrorMessage } from '@/utils/errorHandling';
import { presentAppError, presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Copy, CreditCard, Receipt, Router as RouterIcon, Tag, Upload, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventSource from 'react-native-sse';
import tw from 'twrnc';

dayjs.locale('id');

interface LastPayment {
  amount: number;
  date: Date | string;
  method: string;
  gatewayStatus?: string | null;
  paymentUrl?: string | null;
  receiptUrl?: string | null;
  expiresAt?: Date | string | null;
  accountId?: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  items: { description: string }[];
  lastPayment?: LastPayment | null;
}

interface PaymentMethodOption {
  id: string;
  name: string;
  provider: string;
  type: string;
  code: string;
  group: string;
  details?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
}


const fetchInvoices = async () => {
  const res = await api.get('/api/customer/invoices?limit=20');
  return res.data.invoices as Invoice[];
};

export default function CustomerTagihanScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'FAILED'>('ALL');

  // Payment State
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, amount: number } | null>(null);
  const [selectedMethodCode, setSelectedMethodCode] = useState<string>('');

  // Countdown State
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Payment Options UI State
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const { data: invoices, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: fetchInvoices
  });

  const { data: paymentMethods, isLoading: loadingMethods, refetch: refetchMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/api/customer/payment-methods');
      return res.data.data as PaymentMethodOption[];
    }
  });

  const onRefresh = useCallback(() => {
    refetch();
    refetchMethods();
  }, [refetch, refetchMethods]);

  const filteredInvoices = invoices?.filter(inv => {
    if (filter === 'ALL') return true;
    if (filter === 'PAID') return inv.status === 'PAID';
    if (filter === 'UNPAID') return ['SENT', 'OVERDUE'].includes(inv.status);
    if (filter === 'FAILED') return inv.status === 'VOID';
    return true;
  }) || [];

  const pendingInvoices = invoices?.filter(inv => ['SENT', 'OVERDUE'].includes(inv.status)) || [];
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const nextDueDate = pendingInvoices.length > 0
    ? pendingInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate
    : null;

  // Active Pending Payment Check
  const pendingPaymentInvoice = pendingInvoices.find(inv => inv.lastPayment?.gatewayStatus === 'PENDING');
  const activePayment = pendingPaymentInvoice?.lastPayment;

  // Selected Bank Details for Manual Transfer
  const selectedBankDetails = React.useMemo(() => {
    if (activePayment?.method === 'BANK_TRANSFER' && activePayment?.accountId && paymentMethods) {
      const pm = paymentMethods.find(p => p.id === `manual_${activePayment.accountId}`);
      return pm?.details;
    }
    return null;
  }, [activePayment, paymentMethods]);

  // Real-time Expiry Timer
  useEffect(() => {
    if (!activePayment?.expiresAt) return;
    const expiry = new Date(activePayment.expiresAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const p = expiry - now;
      if (p <= 0) {
        setTimeLeft('Kadaluarsa');
        // Automatically refetch to update status
        refetch();
        return;
      }
      const h = Math.floor((p % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((p % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((p % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePayment?.expiresAt, refetch]);

  // SSE Listener for Real-Time Status Updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (activePayment && pendingPaymentInvoice) {
      const token = TokenService.getToken();
      const baseUrl = TenantService.getTenantUrl();
      const sseUrl = `${baseUrl}/api/customer/payments/sse?invoiceId=${pendingPaymentInvoice.id}`;

      eventSource = new EventSource(sseUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      eventSource.addEventListener('message', (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            if (data.status === 'PAID') {
              presentSuccessMessage('Pembayaran telah berhasil diverifikasi!');
              refetch();
              eventSource?.close();
            } else if (data.status === 'EXPIRED') {
              refetch();
              eventSource?.close();
            } else if (data.status === 'FAILED') {
              presentErrorMessage('Pembayaran transfer manual Anda ditolak oleh Admin. Silakan periksa kembali dan unggah ulang bukti yang benar.');
              refetch();
              eventSource?.close();
            }
          } catch (error) {
            logger.warn('[CustomerTagihan] Failed to parse payment SSE payload', event.data, error);
          }
        }
      });

      eventSource.addEventListener('error', (error) => {
        logger.warn('[CustomerTagihan] Payment SSE connection error', error);
        eventSource?.close();
      });
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [activePayment, pendingPaymentInvoice, refetch]);

  // Initial Method Selection
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedMethodCode) {
      setSelectedMethodCode(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethodCode]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID': return { label: 'Lunas', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      case 'SENT': return { label: 'Belum Bayar', color: 'text-orange-600', bg: 'bg-orange-100', icon: RouterIcon };
      case 'OVERDUE': return { label: 'Terlambat', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
      default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: Receipt };
    }
  };

  // Operasi finansial → plain useMutation (tanpa offline-queue).
  const verifyCouponMutation = useMutation({
    mutationFn: () =>
      api.post('/api/coupons/verify', {
        code: couponCode,
        amount: totalPending,
        pelangganId: 'CURRENT_USER',
      }),
    onSuccess: (res) => {
      if (res.data.valid) {
        setAppliedDiscount({ code: res.data.code, amount: res.data.discountAmount });
        presentSuccessMessage('Kupon berhasil digunakan!');
      } else {
        presentErrorMessage(res.data.error || 'Kupon tidak valid');
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to verify coupon', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
    },
  });
  const couponLoading = verifyCouponMutation.isPending;

  const handleCheckCoupon = () => {
    if (!couponCode.trim()) return;
    setAppliedDiscount(null);
    verifyCouponMutation.mutate();
  };

  const uploadReceiptMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/api/customer/payments/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      if (res.data?.success || res.status === 200 || res.status === 201) {
        presentSuccessMessage('Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.');
        refetch();
      } else {
        presentErrorMessage(res.data?.error || 'Gagal mengunggah bukti pembayaran.');
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to upload receipt', error);
      const backendMessage = isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
      if (backendMessage) {
        presentErrorMessage(backendMessage);
      } else {
        presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
      }
    },
  });
  const uploadingReceipt = uploadReceiptMutation.isPending;

  const handleUploadReceipt = async () => {
    if (!pendingPaymentInvoice) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      const localUri = image.uri;
      const filename = localUri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append('invoiceId', pendingPaymentInvoice.id);
      formData.append('file', { uri: localUri, name: filename, type } as any);

      uploadReceiptMutation.mutate(formData);
    }
  };

  const paymentMutation = useMutation({
    mutationFn: () =>
      api.post('/api/customer/payments', {
        invoiceIds: pendingInvoices.map(inv => inv.id),
        couponCode: appliedDiscount?.code || null,
        paymentMethod: selectedMethodCode,
        notes: 'Payment via Mobile App',
      }),
    onSuccess: async (res) => {
      if (res.data.success || res.status === 200) {
        refetch(); // Automatically changes state to show pending card

        if (res.data.paymentUrl && !selectedMethodCode.startsWith('MANUAL_') && selectedMethodCode !== 'MOOTA_MANUAL') {
          await WebBrowser.openBrowserAsync(res.data.paymentUrl, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            controlsColor: '#0d9488',
            toolbarColor: '#ffffff'
          });
          // Refetch after browser closes to reflect any payment changes
          refetch();
        } else if (!res.data.paymentUrl && !selectedMethodCode.startsWith('MANUAL_') && selectedMethodCode !== 'MOOTA_MANUAL') {
          presentInfoMessage('Silakan lanjutkan transfer manual Anda.', 'Menunggu');
        }

        setAppliedDiscount(null);
        setCouponCode('');
      } else {
        presentErrorMessage(res.data.error || 'Gagal membuat pembayaran');
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to create payment', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
    },
  });
  const paymentLoading = paymentMutation.isPending;

  const handlePayment = () => {
    if (!pendingInvoices.length) return;
    if (!selectedMethodCode) {
      presentInfoMessage('Harap pilih metode pembayaran', 'Peringatan');
      return;
    }
    paymentMutation.mutate();
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await Clipboard.setStringAsync(text);
      presentInfoMessage(`${type} berhasil disalin!`, 'Disalin');
    } catch (error) {
      logger.error('[CustomerTagihan] Failed to copy payment detail', error);
      presentErrorMessage(`Gagal menyalin ${type}.`);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold text-gray-900`}>Tagihan & Pembayaran</Text>
        </View>
        <TouchableOpacity onPress={() => presentInfoMessage('Hubungi CS jika ada kendala pembayaran')}>
          <AlertCircle size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={tw`pb-24`}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
        }
      >
        {isLoading && !invoices ? (
          <View style={tw`p-4`}>
            <Skeleton height={200} borderRadius={16} />
            <View style={tw`mt-6 gap-3`}>
              <Skeleton height={80} borderRadius={12} />
              <Skeleton height={80} borderRadius={12} />
              <Skeleton height={80} borderRadius={12} />
            </View>
          </View>
        ) : (
          <>
            {/* Bill Summary Card */}
            {activePayment ? (
              <View style={tw`p-4`}>
                <View style={tw`bg-white rounded-2xl p-5 shadow-lg border border-orange-200 overflow-hidden`}>
                  <View style={tw`flex-row items-center mb-4`}>
                    <Clock size={20} color="#ea580c" />
                    <Text style={tw`text-orange-600 font-bold ml-2 text-sm`}>Selesaikan Pembayaran</Text>
                    <View style={tw`ml-auto bg-orange-100 px-3 py-1 rounded-full`}>
                      <Text style={tw`text-orange-600 font-bold text-xs`}>{timeLeft}</Text>
                    </View>
                  </View>

                  {activePayment.method === 'BANK_TRANSFER' && selectedBankDetails ? (
                    <View style={tw`bg-gray-50 rounded-xl p-4 border border-gray-200`}>
                      <Text style={tw`text-gray-600 text-xs mb-1`}>Transfer Bank Manual ({selectedBankDetails.bankName})</Text>
                      <Text style={tw`font-bold text-gray-900 text-lg mb-4`}>{selectedBankDetails.accountName}</Text>

                      <View style={tw`bg-white border text-center border-gray-200 p-3 rounded-lg mb-4`}>
                        <Text style={tw`text-xs text-gray-500 mb-1`}>Nomor Rekening</Text>
                        <View style={tw`flex-row items-center justify-between`}>
                          <Text style={tw`text-xl font-bold tracking-widest text-gray-900`}>{selectedBankDetails.accountNumber}</Text>
                          <TouchableOpacity onPress={() => copyToClipboard(selectedBankDetails.accountNumber, 'Nomor Rekening')} style={tw`p-2 bg-gray-100 rounded-md`}>
                            <Copy size={16} color="#4b5563" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={tw`bg-orange-50 border border-orange-200 p-3 rounded-lg mb-2`}>
                        <Text style={tw`text-xs text-orange-800 mb-1`}>Nominal Transfer (Transfer Tepat!)</Text>
                        <View style={tw`flex-row items-center justify-between`}>
                          <Text style={tw`text-2xl font-black tracking-tight text-orange-600`}>{formatCurrency(activePayment.amount)}</Text>
                          <TouchableOpacity onPress={() => copyToClipboard(activePayment.amount.toString(), 'Nominal')} style={tw`p-2 bg-orange-200 rounded-md`}>
                            <Copy size={16} color="#c2410c" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {activePayment.receiptUrl ? (
                        <View style={tw`bg-teal-50 border border-teal-200 p-3 rounded-lg mt-2 items-center`}>
                          <CheckCircle size={24} color="#0d9488" style={tw`mb-1`} />
                          <Text style={tw`text-teal-800 font-bold text-sm`}>Menunggu Verifikasi Admin</Text>
                          <Text style={tw`text-teal-600 text-xs text-center mt-1`}>
                            Bukti transfer Anda sedang direview. Proses ini dapat memakan waktu beberapa saat pada jam kerja.
                          </Text>
                        </View>
                      ) : (
                        <View style={tw`mt-4`}>
                          <Text style={tw`text-xs text-gray-500 text-center mb-2`}>
                            Silakan unggah bukti transfer setelah melakukan pembayaran.
                          </Text>
                          <TouchableOpacity
                            style={tw`bg-teal-600 flex-row items-center justify-center p-3 rounded-xl ${uploadingReceipt ? 'opacity-70' : ''}`}
                            onPress={handleUploadReceipt}
                            disabled={uploadingReceipt}
                          >
                            {uploadingReceipt ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <>
                                <Upload size={18} color="#fff" style={tw`mr-2`} />
                                <Text style={tw`text-white font-bold`}>Unggah Bukti Transfer</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={tw`items-center py-4`}>
                      <Text style={tw`text-gray-600 text-center mb-4`}>
                        Selesaikan pembayaran Anda menggunakan metode yang telah dipilih.
                      </Text>
                      {activePayment.paymentUrl && (
                        <TouchableOpacity
                          onPress={() => WebBrowser.openBrowserAsync(activePayment.paymentUrl!, { controlsColor: '#0d9488' })}
                          style={tw`bg-teal-600 px-6 py-3 rounded-xl`}
                        >
                          <Text style={tw`text-white font-bold`}>Lanjutkan Bayar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                </View>
              </View>
            ) : (
              <View style={tw`p-4`}>
                <View style={tw`shadow-md rounded-2xl bg-white`}>
                  <View style={tw`bg-teal-600 rounded-2xl p-6 overflow-hidden`}>
                    {/* Abstract Pattern */}
                    <View style={tw`absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full`} />
                    <View style={tw`absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full`} />

                    <View style={tw`flex-row justify-between items-start mb-6`}>
                      <View>
                        <Text style={tw`text-teal-50 text-sm font-medium mb-1`}>Total Tagihan Bulan Ini</Text>
                        <Text style={tw`text-3xl font-black text-white tracking-tight`}>
                          {formatCurrency(totalPending)}
                        </Text>
                        {nextDueDate ? (
                          <View style={tw`flex-row items-center mt-2.5 bg-teal-700/50 self-start px-2.5 py-1 rounded-md`}>
                            <Clock size={14} color="#ccfbf1" style={tw`mr-1.5`} />
                            <Text style={tw`text-teal-50 text-xs font-medium`}>
                              Jatuh tempo {dayjs(nextDueDate).format('D MMM YYYY')}
                            </Text>
                          </View>
                        ) : (
                          <View style={tw`flex-row items-center mt-2`}>
                            <CheckCircle size={14} color="#ccfbf1" style={tw`mr-1`} />
                            <Text style={tw`text-teal-100 text-xs`}>
                              Tidak ada tagihan tertunggak
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={tw`bg-white/20 p-2.5 rounded-xl`}>
                        <RouterIcon size={24} color="white" />
                      </View>
                    </View>

                    <View style={tw`flex-row items-center gap-2 mb-4`}>
                      <CheckCircle size={16} color="#ccfbf1" />
                      <Text style={tw`text-teal-50 text-xs`}>Pembayaran aman & terenkripsi</Text>
                    </View>

                    {/* Payment Actions */}
                    {totalPending > 0 && !showPaymentOptions && (
                      <TouchableOpacity
                        onPress={() => setShowPaymentOptions(true)}
                        style={tw`bg-white/20 border border-white/30 h-12 rounded-xl flex-row items-center justify-center`}
                      >
                        <Text style={tw`text-white font-bold text-base`}>Bayar Sekarang</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Expanded Payment Options */}
                {showPaymentOptions && totalPending > 0 && (
                  <View style={tw`mt-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm`}>
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                      <Text style={tw`text-lg font-bold text-gray-900`}>Rincian Pembayaran</Text>
                      <TouchableOpacity onPress={() => setShowPaymentOptions(false)} style={tw`p-1`}>
                        <XCircle size={22} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>

                    {/* Coupon */}
                    <Text style={tw`text-gray-700 text-sm font-medium mb-2`}>Kode Kupon</Text>
                    <View style={tw`flex-row gap-2 mb-4`}>
                      <View style={tw`flex-1 bg-gray-50 rounded-xl flex-row items-center px-3 border border-gray-200`}>
                        <Tag size={18} color="#9ca3af" />
                        <TextInput
                          placeholder="MASUKAN KODE"
                          placeholderTextColor="#9ca3af"
                          style={tw`flex-1 text-gray-900 text-sm font-bold ml-2 py-3`}
                          value={couponCode}
                          onChangeText={text => setCouponCode(text.toUpperCase())}
                          editable={!appliedDiscount}
                        />
                      </View>
                      {appliedDiscount ? (
                        <TouchableOpacity
                          onPress={() => { setAppliedDiscount(null); setCouponCode(''); }}
                          style={tw`bg-red-50 px-4 justify-center rounded-xl border border-red-200`}
                        >
                          <Text style={tw`text-red-600 font-bold text-sm`}>Hapus</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={handleCheckCoupon}
                          disabled={couponLoading || !couponCode}
                          style={tw`bg-teal-50 px-5 justify-center rounded-xl border border-teal-200 ${!couponCode ? 'opacity-50' : ''}`}
                        >
                          <Text style={tw`text-teal-700 font-bold`}>
                            {couponLoading ? '...' : 'CEK'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {appliedDiscount && (
                      <View style={tw`flex-row justify-between items-center mb-4 bg-green-50 p-3 rounded-lg border border-green-200`}>
                        <Text style={tw`text-green-800 text-sm`}>Diskon ({appliedDiscount.code})</Text>
                        <Text style={tw`text-green-700 text-sm font-bold`}>-{formatCurrency(appliedDiscount.amount)}</Text>
                      </View>
                    )}

                    <View style={tw`h-px bg-gray-100 mb-4`} />

                    {/* Payment Methods Selection */}
                    <Text style={tw`text-gray-700 text-sm font-medium mb-3`}>Pilih Metode Pembayaran</Text>
                    {loadingMethods || !paymentMethods ? (
                      <View style={tw`gap-2 mb-4`}>
                        <Skeleton height={50} borderRadius={12} />
                        <Skeleton height={50} borderRadius={12} />
                      </View>
                    ) : (
                      <View style={tw`gap-2 mb-5`}>
                        {paymentMethods.map(method => (
                          <TouchableOpacity
                            key={method.id}
                            onPress={() => setSelectedMethodCode(method.code)}
                            style={tw`bg-white rounded-xl p-3.5 flex-row items-center justify-between border-2 ${selectedMethodCode === method.code ? 'border-teal-500 bg-teal-50' : 'border-gray-100'}`}
                          >
                            <View style={tw`flex-row items-center flex-1`}>
                              <CreditCard size={20} color={selectedMethodCode === method.code ? "#0d9488" : "#6b7280"} />
                              <View style={tw`ml-3`}>
                                <Text style={tw`font-bold text-sm ${selectedMethodCode === method.code ? 'text-teal-900' : 'text-gray-900'}`}>{method.name}</Text>
                                <Text style={tw`text-[10px] text-gray-500 mt-0.5 uppercase`}>{method.group}</Text>
                              </View>
                            </View>
                            <View style={tw`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedMethodCode === method.code ? 'border-teal-600 bg-teal-600' : 'border-gray-300'}`}>
                              {selectedMethodCode === method.code && <View style={tw`w-2 h-2 rounded-full bg-white`} />}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={tw`flex-row justify-between items-center mb-4`}>
                      <Text style={tw`text-gray-600 font-medium`}>Total Bayar</Text>
                      <Text style={tw`text-teal-700 font-black text-xl`}>
                        {formatCurrency(totalPending - (appliedDiscount?.amount || 0))}
                      </Text>
                    </View>

                    {/* Pay Button */}
                    <TouchableOpacity
                      onPress={handlePayment}
                      disabled={paymentLoading || !selectedMethodCode}
                      style={tw`bg-teal-600 h-13 rounded-xl flex-row items-center justify-center gap-2 ${!selectedMethodCode ? 'opacity-50' : ''}`}
                    >
                      {paymentLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={tw`text-white font-bold text-base`}>Konfirmasi & Bayar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* History List */}
            <View style={tw`px-4 pb-4`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-3 mt-2`}>Riwayat Tagihan</Text>

              {/* Filters */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 mb-4`}>
                {['ALL', 'UNPAID', 'PAID', 'FAILED'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f as any)}
                    style={tw`px-4 py-1.5 rounded-full ${filter === f ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}
                  >
                    <Text style={tw`text-xs font-bold ${filter === f ? 'text-white' : 'text-gray-600'}`}>
                      {f === 'ALL' ? 'Semua' : f === 'UNPAID' ? 'Belum Bayar' : f === 'PAID' ? 'Lunas' : 'Gagal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={tw`gap-3`}>
                {filteredInvoices.map((inv) => {
                  const status = getStatusConfig(inv.status);
                  const StatusIcon = status.icon;
                  return (
                    <View key={inv.id} style={tw`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-3`}>
                      <View style={tw`w-10 h-10 rounded-full ${status.bg} items-center justify-center`}>
                        <StatusIcon size={20} style={tw`${status.color}`} />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`font-bold text-gray-900 text-sm`}>
                          {inv.items[0]?.description || 'Tagihan Internet'}
                        </Text>
                        <Text style={tw`text-xs text-gray-500 mt-0.5`}>
                          #{inv.invoiceNumber} • {dayjs(inv.createdAt).format('D MMM YYYY')}
                        </Text>
                      </View>
                      <View style={tw`items-end`}>
                        <Text style={tw`font-bold text-gray-900 text-sm`}>{formatCurrency(inv.totalAmount)}</Text>
                        <Text style={tw`text-[10px] font-bold ${status.color} mt-0.5`}>{status.label}</Text>
                      </View>
                    </View>
                  );
                })}

                {filteredInvoices.length === 0 && (
                  <View style={tw`py-8 items-center`}>
                    <Text style={tw`text-gray-400 text-sm`}>Tidak ada data tagihan</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
