import React from 'react';
import { View, TextInput, Text, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import tw from 'twrnc';

interface FormInputProps<TFieldValues extends FieldValues> extends Omit<TextInputProps, 'secureTextEntry'> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function FormInput<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  leftIcon,
  rightIcon,
  style,
  ...props
}: FormInputProps<TFieldValues>) {
  return (
    <View style={tw`w-full`}>
      {label && <Text style={tw`mb-2 font-medium text-gray-700`}>{label}</Text>}

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              tw`flex-row items-center border rounded-xl px-4 h-12 bg-gray-50`,
              error ? tw`border-red-500` : tw`border-gray-300`,
            ]}
          >
            {leftIcon && <View style={tw`mr-3`}>{leftIcon}</View>}

            <TextInput
              style={[tw`flex-1 text-gray-900 h-full`, style]}
              placeholderTextColor="#9ca3af"
              placeholder={placeholder}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              {...props}
            />

            {rightIcon && <View style={tw`ml-3`}>{rightIcon}</View>}
          </View>
        )}
      />

      {error && <Text style={tw`mt-1 text-xs text-red-500`}>{error}</Text>}
    </View>
  );
}
