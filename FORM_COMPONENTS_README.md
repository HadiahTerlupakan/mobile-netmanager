# React Hook Form Components

This document provides comprehensive documentation for the reusable React Hook Form components created for the mobile-netmanager application.

## Overview

Three files have been created to streamline form handling with validation:

1. **FormInput.tsx** - Controlled input component for text fields
2. **FormSelect.tsx** - Controlled select/picker component for dropdowns
3. **useFormWithValidation.ts** - Custom hook that integrates React Hook Form with Zod validation

## Installation

All required dependencies are already installed in the project:

- `react-hook-form` (^7.71.1)
- `@hookform/resolvers` (^5.2.2)
- `zod` (^4.3.6)
- `@react-native-picker/picker` (^2.11.4)
- `twrnc` (^4.16.0)

## Components

### FormInput

A controlled input component that integrates seamlessly with React Hook Form.

#### File Location
```
/Users/rohadimraja/Documents/mobile-netmanager/src/components/atoms/FormInput.tsx
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `Path<TFieldValues>` | Yes | - | Field name from the form schema |
| `control` | `Control<TFieldValues>` | Yes | - | React Hook Form control object |
| `label` | `string` | No | - | Label text displayed above input |
| `placeholder` | `string` | No | - | Placeholder text |
| `secureTextEntry` | `boolean` | No | `false` | Hide text input (for passwords) |
| `keyboardType` | `KeyboardTypeOptions` | No | `'default'` | Keyboard type for input |
| `error` | `string` | No | - | Error message to display |
| `leftIcon` | `React.ReactNode` | No | - | Icon component on the left |
| `rightIcon` | `React.ReactNode` | No | - | Icon component on the right |

#### Features

- Fully typed with TypeScript generics
- Automatic value binding with React Hook Form
- Error state styling (red border when error present)
- Consistent styling with existing Input component
- Support for left and right icons
- Custom keyboard types (email, phone, numeric, etc.)

#### Usage Example

```tsx
import { FormInput } from '@/components/atoms/FormInput';
import { Ionicons } from '@expo/vector-icons';

<FormInput
  name="email"
  control={control}
  label="Email Address"
  placeholder="Enter your email"
  keyboardType="email-address"
  error={errors.email?.message}
  leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
/>
```

---

### FormSelect

A controlled select/picker component for React Hook Form using `@react-native-picker/picker`.

#### File Location
```
/Users/rohadimraja/Documents/mobile-netmanager/src/components/atoms/FormSelect.tsx
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `Path<TFieldValues>` | Yes | - | Field name from the form schema |
| `control` | `Control<TFieldValues>` | Yes | - | React Hook Form control object |
| `label` | `string` | No | - | Label text displayed above select |
| `options` | `SelectOption<TValue>[]` | Yes | - | Array of select options |
| `error` | `string` | No | - | Error message to display |
| `placeholder` | `string` | No | `'Select an option'` | Placeholder text |
| `enabled` | `boolean` | No | `true` | Enable/disable the picker |

#### SelectOption Interface

```tsx
interface SelectOption<T = string> {
  label: string;  // Display text
  value: T;       // Value (can be any type)
}
```

#### Features

- Fully typed with TypeScript generics
- Support for custom value types (string, number, etc.)
- Automatic value binding with React Hook Form
- Error state styling
- Disabled state with opacity styling
- Placeholder support

#### Usage Example

```tsx
import { FormSelect } from '@/components/atoms/FormSelect';

const roleOptions = [
  { label: 'Engineer', value: 'engineer' },
  { label: 'Manager', value: 'manager' },
  { label: 'Admin', value: 'admin' },
];

<FormSelect
  name="role"
  control={control}
  label="Select Role"
  options={roleOptions}
  placeholder="Choose a role"
  error={errors.role?.message}
/>
```

---

### useFormWithValidation

A custom hook that wraps `useForm` with Zod validation resolver.

#### File Location
```
/Users/rohadimraja/Documents/mobile-netmanager/src/hooks/useFormWithValidation.ts
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `schema` | `ZodSchema<TFieldValues>` | Yes | - | Zod validation schema |
| `defaultValues` | `TFieldValues` | No | - | Initial form values |
| `mode` | `'onSubmit' \| 'onChange' \| 'onBlur' \| 'onTouched'` | No | `'onSubmit'` | Validation trigger mode |
| Additional props from `UseFormProps` | | | | |

#### Return Value

Returns all methods from `useForm` plus:

| Property | Type | Description |
|----------|------|-------------|
| `handleValidatedSubmit` | `(onValid: (data: TFieldValues) => void \| Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void>` | Validated submit handler |

#### Features

- Automatic Zod schema integration
- Type-safe form data
- Error handling wrapper
- Simplified submit handler
- Full access to React Hook Form methods

#### Usage Example

```tsx
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type LoginData = z.infer<typeof loginSchema>;

function LoginForm() {
  const {
    control,
    handleValidatedSubmit,
    formState: { errors, isSubmitting }
  } = useFormWithValidation({
    schema: loginSchema,
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = handleValidatedSubmit(async (data) => {
    // data is automatically typed and validated
    await loginAPI(data);
  });

  return (
    // Form JSX
  );
}
```

## Complete Form Example

Here's a complete example of a login form using all three components:

```tsx
import React from 'react';
import { View } from 'react-native';
import { z } from 'zod';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '@/components/atoms/FormInput';
import { Button } from '@/components/atoms/Button';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const {
    control,
    handleValidatedSubmit,
    formState: { errors, isSubmitting }
  } = useFormWithValidation({
    schema: loginSchema,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleValidatedSubmit(async (data) => {
    console.log('Validated data:', data);
    // API call here
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
```

## Advanced Usage

### Conditional Fields

```tsx
const userType = watch('userType');

{userType === 'company' && (
  <FormInput
    name="companyName"
    control={control}
    label="Company Name"
    placeholder="Enter company name"
    error={errors.companyName?.message}
  />
)}
```

### Custom Validation

```tsx
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### Reset Form

```tsx
const { reset } = useFormWithValidation({ schema, defaultValues });

// Reset to default values
reset();

// Reset to new values
reset({ email: 'new@email.com', password: '' });
```

### Watch Field Values

```tsx
const { watch } = useFormWithValidation({ schema, defaultValues });

const emailValue = watch('email');
const allValues = watch();
```

## Styling Customization

All components use `twrnc` for styling and follow the existing design system:

- Border radius: `rounded-xl`
- Input height: `h-12`
- Error color: `text-red-500`, `border-red-500`
- Background: `bg-gray-50`
- Border: `border-gray-300`

You can extend styles by passing custom styles through props.

## TypeScript Benefits

1. **Type Safety**: All form data is fully typed based on your Zod schema
2. **Autocompletion**: IDE provides autocomplete for field names
3. **Compile-time Errors**: Catch errors before runtime
4. **Inference**: `z.infer<typeof schema>` automatically creates TypeScript types

## Best Practices

1. **Define schema first**: Always create your Zod schema before the form
2. **Use z.infer**: Let Zod infer TypeScript types automatically
3. **Centralize validation**: Keep all validation logic in the Zod schema
4. **Error messages**: Provide clear, user-friendly error messages in schema
5. **Default values**: Always provide defaultValues to prevent uncontrolled component warnings
6. **Validation mode**: Use `mode: 'onSubmit'` for better UX (validate on submit, then on change)

## Examples File

See `/Users/rohadimraja/Documents/mobile-netmanager/FORM_COMPONENTS_EXAMPLES.tsx` for comprehensive examples including:

- Basic login form
- Registration form with selects
- Dynamic forms with conditional fields
- Multi-step forms
- Custom validation patterns

## Troubleshooting

### Input not updating
- Ensure `control` is passed correctly
- Check that `name` matches a field in your schema

### Validation not working
- Verify schema is defined correctly
- Check that zodResolver is being used (automatically handled by useFormWithValidation)

### TypeScript errors
- Ensure generic types match your schema
- Use `z.infer<typeof schema>` to generate types

## Migration from Regular Input

Replace this:
```tsx
const [email, setEmail] = useState('');

<Input
  value={email}
  onChangeText={setEmail}
  label="Email"
/>
```

With this:
```tsx
const schema = z.object({ email: z.string().email() });
const { control } = useFormWithValidation({ schema, defaultValues: { email: '' } });

<FormInput
  name="email"
  control={control}
  label="Email"
/>
```

## Additional Resources

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [React Native Picker](https://github.com/react-native-picker/picker)

## Support

For issues or questions, refer to the example files or check the inline TypeScript documentation in the component files.
