# Quick Reference: React Hook Form Components

## Quick Start (Copy & Paste)

### 1. Basic Login Form

```tsx
import { z } from 'zod';
import { FormInput } from '@/components/atoms/FormInput';
import { Button } from '@/components/atoms/Button';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

function MyForm() {
  const { control, handleValidatedSubmit, formState: { errors } } = useFormWithValidation({
    schema,
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = handleValidatedSubmit(async (data) => {
    console.log(data); // Typed and validated!
  });

  return (
    <>
      <FormInput name="email" control={control} label="Email" error={errors.email?.message} />
      <FormInput name="password" control={control} label="Password" secureTextEntry error={errors.password?.message} />
      <Button title="Submit" onPress={onSubmit} />
    </>
  );
}
```

### 2. Form with Select/Dropdown

```tsx
import { FormSelect } from '@/components/atoms/FormSelect';

const schema = z.object({
  role: z.string().min(1, 'Please select a role'),
});

const options = [
  { label: 'Engineer', value: 'engineer' },
  { label: 'Manager', value: 'manager' },
];

<FormSelect
  name="role"
  control={control}
  label="Role"
  options={options}
  error={errors.role?.message}
/>
```

### 3. Form with Icons

```tsx
import { Ionicons } from '@expo/vector-icons';

<FormInput
  name="email"
  control={control}
  label="Email"
  leftIcon={<Ionicons name="mail-outline" size={20} color="#6B7280" />}
  error={errors.email?.message}
/>
```

## Common Patterns

### Password Confirmation

```tsx
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### Conditional Fields

```tsx
const userType = watch('userType');

{userType === 'company' && (
  <FormInput name="companyName" control={control} label="Company" />
)}
```

### Custom Keyboard Types

```tsx
// Email
<FormInput name="email" keyboardType="email-address" />

// Phone
<FormInput name="phone" keyboardType="phone-pad" />

// Number
<FormInput name="age" keyboardType="numeric" />
```

### Reset Form

```tsx
const { reset } = useFormWithValidation({ schema, defaultValues });

// Reset to defaults
reset();

// Reset with new values
reset({ email: 'new@email.com' });
```

## Validation Examples

```tsx
// Email
z.string().email('Invalid email')

// Min/Max Length
z.string().min(8, 'Too short').max(50, 'Too long')

// Phone (10-13 digits)
z.string().regex(/^[0-9]{10,13}$/, 'Invalid phone')

// Required
z.string().min(1, 'Required field')

// Optional
z.string().optional()

// Enum
z.enum(['option1', 'option2'])

// Number
z.number().min(0).max(100)

// Date
z.date()
```

## Keyboard Types

| Type | Use Case |
|------|----------|
| `default` | Standard text |
| `email-address` | Email input |
| `phone-pad` | Phone numbers |
| `numeric` | Numbers only |
| `decimal-pad` | Decimal numbers |
| `url` | URLs |

## Props Cheat Sheet

### FormInput
```tsx
<FormInput
  name="fieldName"              // Required: field name
  control={control}             // Required: form control
  label="Label"                 // Optional: label text
  placeholder="Placeholder"     // Optional: placeholder
  error={errors.field?.message} // Optional: error message
  secureTextEntry               // Optional: hide text (password)
  keyboardType="email-address"  // Optional: keyboard type
  leftIcon={<Icon />}           // Optional: left icon
  rightIcon={<Icon />}          // Optional: right icon
/>
```

### FormSelect
```tsx
<FormSelect
  name="fieldName"              // Required: field name
  control={control}             // Required: form control
  options={[                    // Required: options array
    { label: 'Display', value: 'val' }
  ]}
  label="Label"                 // Optional: label text
  placeholder="Select..."       // Optional: placeholder
  error={errors.field?.message} // Optional: error message
  enabled={true}                // Optional: enable/disable
/>
```

### useFormWithValidation
```tsx
const {
  control,                      // Pass to FormInput/FormSelect
  handleValidatedSubmit,        // Wrap your submit function
  formState: { errors },        // Access errors
  watch,                        // Watch field values
  reset,                        // Reset form
  setValue,                     // Set field value
  getValues,                    // Get all values
} = useFormWithValidation({
  schema,                       // Required: Zod schema
  defaultValues,                // Recommended: initial values
  mode: 'onSubmit',            // Optional: validation mode
});
```

## File Locations

```
Components:
  /Users/rohadimraja/Documents/mobile-netmanager/src/components/atoms/FormInput.tsx
  /Users/rohadimraja/Documents/mobile-netmanager/src/components/atoms/FormSelect.tsx

Hook:
  /Users/rohadimraja/Documents/mobile-netmanager/src/hooks/useFormWithValidation.ts

Documentation:
  /Users/rohadimraja/Documents/mobile-netmanager/FORM_COMPONENTS_README.md
  /Users/rohadimraja/Documents/mobile-netmanager/FORM_COMPONENTS_EXAMPLES.tsx
```

## Common Issues

### "Control is undefined"
Make sure you're calling `useFormWithValidation` and destructuring `control`:
```tsx
const { control } = useFormWithValidation({ schema, defaultValues });
```

### "Field name doesn't exist"
Ensure the `name` prop matches a field in your schema:
```tsx
const schema = z.object({ email: z.string() }); // field is 'email'
<FormInput name="email" /> // ✅ Correct
<FormInput name="mail" />  // ❌ Wrong
```

### Input not updating
Make sure you're using the form's `control`:
```tsx
<FormInput name="email" control={control} /> // ✅
```

## Tips

1. Define schema before component
2. Use `z.infer<typeof schema>` for types
3. Always provide `defaultValues`
4. Use `handleValidatedSubmit` for type-safe submission
5. Access errors via `formState.errors`
6. Use `watch()` for conditional fields
