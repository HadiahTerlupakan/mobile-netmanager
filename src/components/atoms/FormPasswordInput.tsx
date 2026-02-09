import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import tw from 'twrnc';

interface FormPasswordInputProps<TFieldValues extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  error?: string;
  hint?: string;
}

export function FormPasswordInput<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  error,
  hint,
  placeholder,
  ...rest
}: FormPasswordInputProps<TFieldValues>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={tw`w-full`}>
      {label && <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>{label}</Text>}

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              tw`flex-row items-center border rounded-lg px-3`,
              error ? tw`border-red-500` : tw`border-gray-300`,
            ]}
          >
            <Lock size={20} color="#6b7280" />
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={tw`flex-1 py-3 px-3 text-gray-800`}
              {...rest}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color="#6b7280" />
              ) : (
                <Eye size={20} color="#6b7280" />
              )}
            </TouchableOpacity>
          </View>
        )}
      />

      {hint && !error && <Text style={tw`text-xs text-gray-400 mt-1`}>{hint}</Text>}
      {error && <Text style={tw`text-xs text-red-500 mt-1`}>{error}</Text>}
    </View>
  );
}
