import React from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import tw from 'twrnc';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

interface FormSelectProps<TFieldValues extends FieldValues, TValue = string> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  options: SelectOption<TValue>[];
  error?: string;
  placeholder?: string;
  enabled?: boolean;
}

export function FormSelect<TFieldValues extends FieldValues, TValue = string>({
  name,
  control,
  label,
  options,
  error,
  placeholder = 'Select an option',
  enabled = true,
}: FormSelectProps<TFieldValues, TValue>) {
  return (
    <View style={tw`w-full`}>
      {label && <Text style={tw`mb-2 font-medium text-gray-700`}>{label}</Text>}

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <View
            style={[
              tw`border rounded-xl bg-gray-50 overflow-hidden`,
              error ? tw`border-red-500` : tw`border-gray-300`,
              !enabled && tw`opacity-50`,
            ]}
          >
            <View style={tw`flex-row items-center justify-between px-4 h-12`}>
              <Picker
                selectedValue={value}
                onValueChange={onChange}
                enabled={enabled}
                style={tw`flex-1 text-gray-900`}
                dropdownIconColor="#6B7280"
              >
                {placeholder && (
                  <Picker.Item
                    label={placeholder}
                    value=""
                    style={tw`text-gray-400`}
                  />
                )}
                {options.map((option, index) => (
                  <Picker.Item
                    key={index}
                    label={option.label}
                    value={option.value}
                    style={tw`text-gray-900`}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}
      />

      {error && <Text style={tw`mt-1 text-xs text-red-500`}>{error}</Text>}
    </View>
  );
}
