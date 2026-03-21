/**
 * Example Usage of React Hook Form Components
 *
 * This file demonstrates how to use the FormInput, FormSelect, and useFormWithValidation
 * components in a typical login and registration form scenario.
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { z } from 'zod';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '@/components/atoms/FormInput';
import { FormSelect } from '@/components/atoms/FormSelect';
import { Button } from '@/components/atoms/Button';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';

// ============================================================================
// EXAMPLE 1: Login Form
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});


export function LoginFormExample() {
  const { control, handleValidatedSubmit, formState: { errors, isSubmitting } } = useFormWithValidation({
    schema: loginSchema,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleValidatedSubmit(async (data) => {
    // Data is automatically validated and typed
    console.log('Login data:', data);
    // await loginAPI(data);
  });

  return (
    <View style={tw`p-4`}>
      <FormInput
        name="email"
        control={control}
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        error={errors.email?.message}
        leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-4`} />

      <FormInput
        name="password"
        control={control}
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        error={errors.password?.message}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-6`} />

      <Button
        title="Login"
        onPress={onSubmit}
        loading={isSubmitting}
      />
    </View>
  );
}

// ============================================================================
// EXAMPLE 2: Registration Form with Select
// ============================================================================

const registrationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10,13}$/, 'Phone number must be 10-13 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.string().min(1, 'Please select a role'),
  department: z.string().min(1, 'Please select a department'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});


export function RegistrationFormExample() {
  const { control, handleValidatedSubmit, formState: { errors, isSubmitting } } = useFormWithValidation({
    schema: registrationSchema,
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: '',
      department: '',
    },
  });

  const roleOptions = [
    { label: 'Field Engineer', value: 'engineer' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Manager', value: 'manager' },
    { label: 'Admin', value: 'admin' },
  ];

  const departmentOptions = [
    { label: 'Technical', value: 'technical' },
    { label: 'Operations', value: 'operations' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Sales', value: 'sales' },
  ];

  const onSubmit = handleValidatedSubmit(async (data) => {
    console.log('Registration data:', data);
    // await registerAPI(data);
  });

  return (
    <ScrollView style={tw`flex-1 p-4`}>
      <FormInput
        name="fullName"
        control={control}
        label="Full Name"
        placeholder="Enter your full name"
        error={errors.fullName?.message}
        leftIcon={<Ionicons name="person-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-4`} />

      <FormInput
        name="email"
        control={control}
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        error={errors.email?.message}
        leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-4`} />

      <FormInput
        name="phone"
        control={control}
        label="Phone Number"
        placeholder="08123456789"
        keyboardType="phone-pad"
        error={errors.phone?.message}
        leftIcon={<Ionicons name="call-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-4`} />

      <FormSelect
        name="role"
        control={control}
        label="Role"
        options={roleOptions}
        placeholder="Select your role"
        error={errors.role?.message}
      />

      <View style={tw`mt-4`} />

      <FormSelect
        name="department"
        control={control}
        label="Department"
        options={departmentOptions}
        placeholder="Select your department"
        error={errors.department?.message}
      />

      <View style={tw`mt-4`} />

      <FormInput
        name="password"
        control={control}
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        error={errors.password?.message}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-4`} />

      <FormInput
        name="confirmPassword"
        control={control}
        label="Confirm Password"
        placeholder="Re-enter your password"
        secureTextEntry
        error={errors.confirmPassword?.message}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#6B7280" />}
      />

      <View style={tw`mt-6`} />

      <Button
        title="Register"
        onPress={onSubmit}
        loading={isSubmitting}
      />
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 3: Dynamic Form with Conditional Fields
// ============================================================================

const dynamicSchema = z.object({
  userType: z.enum(['individual', 'company']),
  email: z.string().email(),
  // Conditional fields based on userType
  personalName: z.string().optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
}).refine((data) => {
  if (data.userType === 'individual') {
    return !!data.personalName && data.personalName.length >= 2;
  }
  if (data.userType === 'company') {
    return !!data.companyName && data.companyName.length >= 2 && !!data.taxId;
  }
  return true;
}, {
  message: 'Please fill in all required fields',
  path: ['userType'],
});


export function DynamicFormExample() {
  const { control, watch, handleValidatedSubmit, formState: { errors } } = useFormWithValidation({
    schema: dynamicSchema,
    defaultValues: {
      userType: 'individual' as const,
      email: '',
      personalName: '',
      companyName: '',
      taxId: '',
    },
  });

  const userType = watch('userType');

  const userTypeOptions = [
    { label: 'Individual', value: 'individual' },
    { label: 'Company', value: 'company' },
  ];

  const onSubmit = handleValidatedSubmit(async (data) => {
    console.log('Dynamic form data:', data);
  });

  return (
    <View style={tw`p-4`}>
      <FormSelect
        name="userType"
        control={control}
        label="User Type"
        options={userTypeOptions}
        error={errors.userType?.message}
      />

      <View style={tw`mt-4`} />

      <FormInput
        name="email"
        control={control}
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        error={errors.email?.message}
      />

      <View style={tw`mt-4`} />

      {userType === 'individual' && (
        <FormInput
          name="personalName"
          control={control}
          label="Full Name"
          placeholder="Enter your full name"
          error={errors.personalName?.message}
        />
      )}

      {userType === 'company' && (
        <>
          <FormInput
            name="companyName"
            control={control}
            label="Company Name"
            placeholder="Enter company name"
            error={errors.companyName?.message}
          />

          <View style={tw`mt-4`} />

          <FormInput
            name="taxId"
            control={control}
            label="Tax ID / NPWP"
            placeholder="Enter tax identification number"
            error={errors.taxId?.message}
          />
        </>
      )}

      <View style={tw`mt-6`} />

      <Button
        title="Submit"
        onPress={onSubmit}
      />
    </View>
  );
}
