import React from 'react';
import { KeyboardTypeOptions, Text, TextInput, TextInputProps, View } from 'react-native';
import tw from 'twrnc';

/** Nilai form kontak pelanggan yang diketik manual pada Request WO mode Customer. */
export interface CustomerContactFormValues {
  contactName: string;
  contactPhone: string;
  locationAddress: string;
}

interface CustomerContactFieldsProps {
  values: CustomerContactFormValues;
  onChange: (values: CustomerContactFormValues) => void;
  disabled: boolean;
}

interface ContactFieldConfig {
  name: keyof CustomerContactFormValues;
  label: string;
  placeholder: string;
  isRequired?: boolean;
  isMultiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}

const MULTILINE_INPUT_MIN_HEIGHT = 60;
const PLACEHOLDER_COLOR = '#94a3b8';

const CONTACT_FIELDS: ContactFieldConfig[] = [
  {
    name: 'contactName',
    label: 'Nama Pelanggan',
    placeholder: 'Nama lengkap pelanggan',
    isRequired: true,
    autoCapitalize: 'words',
  },
  {
    name: 'contactPhone',
    label: 'No. HP',
    placeholder: 'Contoh: 081234567890 (opsional)',
    keyboardType: 'phone-pad',
  },
  {
    name: 'locationAddress',
    label: 'Alamat',
    placeholder: 'Alamat lokasi pelanggan (opsional)',
    isMultiline: true,
  },
];

/**
 * Input kontak pelanggan (nama, No. HP, alamat) yang diisi manual
 * pada Request WO mode Customer. Semua input dikunci saat `disabled`.
 */
export const CustomerContactFields = React.memo(
  ({ values, onChange, disabled }: CustomerContactFieldsProps) => (
    <View style={tw`gap-3`}>
      {CONTACT_FIELDS.map((field) => (
        <View key={field.name}>
          <Text style={tw`text-xs font-semibold text-slate-600 mb-1`}>
            {field.isRequired ? `${field.label} *` : field.label}
          </Text>
          <TextInput
            style={[
              tw`bg-gray-50 p-3 rounded-xl border border-gray-200`,
              field.isMultiline && { minHeight: MULTILINE_INPUT_MIN_HEIGHT, textAlignVertical: 'top' },
            ]}
            accessibilityLabel={field.label}
            placeholder={field.placeholder}
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={values[field.name]}
            onChangeText={(text) => onChange({ ...values, [field.name]: text })}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize}
            multiline={field.isMultiline}
            editable={!disabled}
          />
        </View>
      ))}
    </View>
  ),
);
CustomerContactFields.displayName = 'CustomerContactFields';
