import React from 'react';
import { Text, View } from 'react-native';
import { ToastConfig } from 'react-native-toast-message';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import tw from 'twrnc';

interface CustomToastProps {
  text1?: string;
  text2?: string;
}

const SuccessToast = ({ text1, text2 }: CustomToastProps) => (
  <View style={tw`mx-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-start shadow-lg`}>
    <View style={tw`w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3`}>
      <CheckCircle2 size={22} color="#16a34a" />
    </View>
    <View style={tw`flex-1`}>
      {text1 && <Text style={tw`text-sm font-bold text-green-800`}>{text1}</Text>}
      {text2 && <Text style={tw`text-xs text-green-600 mt-0.5 leading-4`}>{text2}</Text>}
    </View>
  </View>
);

const ErrorToastCustom = ({ text1, text2 }: CustomToastProps) => (
  <View style={tw`mx-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-start shadow-lg`}>
    <View style={tw`w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3`}>
      <AlertCircle size={22} color="#dc2626" />
    </View>
    <View style={tw`flex-1`}>
      {text1 && <Text style={tw`text-sm font-bold text-red-800`}>{text1}</Text>}
      {text2 && <Text style={tw`text-xs text-red-600 mt-0.5 leading-4`}>{text2}</Text>}
    </View>
  </View>
);

const InfoToast = ({ text1, text2 }: CustomToastProps) => (
  <View style={tw`mx-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex-row items-start shadow-lg`}>
    <View style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3`}>
      <Info size={22} color="#2563eb" />
    </View>
    <View style={tw`flex-1`}>
      {text1 && <Text style={tw`text-sm font-bold text-blue-800`}>{text1}</Text>}
      {text2 && <Text style={tw`text-xs text-blue-600 mt-0.5 leading-4`}>{text2}</Text>}
    </View>
  </View>
);

const WarningToast = ({ text1, text2 }: CustomToastProps) => (
  <View style={tw`mx-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-start shadow-lg`}>
    <View style={tw`w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3`}>
      <AlertTriangle size={22} color="#d97706" />
    </View>
    <View style={tw`flex-1`}>
      {text1 && <Text style={tw`text-sm font-bold text-amber-800`}>{text1}</Text>}
      {text2 && <Text style={tw`text-xs text-amber-600 mt-0.5 leading-4`}>{text2}</Text>}
    </View>
  </View>
);

export const toastConfig: ToastConfig = {
  success: (props) => <SuccessToast text1={props.text1} text2={props.text2} />,
  error: (props) => <ErrorToastCustom text1={props.text1} text2={props.text2} />,
  info: (props) => <InfoToast text1={props.text1} text2={props.text2} />,
  warning: (props) => <WarningToast text1={props.text1} text2={props.text2} />,
};
