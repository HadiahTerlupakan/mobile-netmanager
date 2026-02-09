import { useForm, UseFormProps, UseFormReturn, FieldValues, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

type UseFormWithValidationProps<TFieldValues extends FieldValues> = Omit<UseFormProps<TFieldValues>, 'resolver'> & {
  schema: ZodType<TFieldValues>;
};

type UseFormWithValidationReturn<TFieldValues extends FieldValues> = UseFormReturn<TFieldValues> & {
  handleValidatedSubmit: (onValid: SubmitHandler<TFieldValues>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
};

/**
 * Custom hook that wraps react-hook-form's useForm with Zod validation
 *
 * @template TFieldValues - The shape of the form data
 * @param schema - Zod schema for form validation
 * @param defaultValues - Default values for the form fields
 * @param options - Additional useForm options (mode, reValidateMode, etc.)
 * @returns Form methods plus a validated submit handler
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * const { control, handleValidatedSubmit, formState: { errors } } = useFormWithValidation({
 *   schema,
 *   defaultValues: { email: '', password: '' }
 * });
 *
 * const onSubmit = handleValidatedSubmit(async (data) => {
 *   // data is typed and validated
 *   await login(data);
 * });
 * ```
 */
export function useFormWithValidation<TFieldValues extends FieldValues>({
  schema,
  defaultValues,
  mode = 'onSubmit',
  ...options
}: UseFormWithValidationProps<TFieldValues>): UseFormWithValidationReturn<TFieldValues> {
  const formMethods = useForm<TFieldValues>({
    resolver: zodResolver(schema as any) as Resolver<TFieldValues>,
    defaultValues,
    mode,
    ...options,
  });

  const handleValidatedSubmit = (onValid: SubmitHandler<TFieldValues>) => {
    return formMethods.handleSubmit(async (data) => {
      try {
        await onValid(data);
      } catch (error) {
        // Error handling can be done by the caller
        // or you can add global error handling here
        console.error('Form submission error:', error);
        throw error;
      }
    });
  };

  return {
    ...formMethods,
    handleValidatedSubmit,
  };
}
