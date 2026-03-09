import { extractApiErrorMessage, getUserFriendlyError } from './errorHandling'

interface CustomerSearchFeedbackState {
  showSearchResults: boolean
  searching: boolean
  searchQuery: string
  customersCount: number
  searchError: string | null
}

export const getCustomerSearchFailureMessage = (error: unknown): string => {
  const genericMessage = 'Pencarian pelanggan sedang bermasalah. Coba lagi.'

  const responseData = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: unknown } }).response?.data
    : undefined

  const backendMessage = extractApiErrorMessage(responseData)
  if (backendMessage) {
    return backendMessage
  }

  const presentation = getUserFriendlyError(error)
  if (
    presentation.kind === 'validation'
    || presentation.kind === 'auth'
    || presentation.kind === 'permission'
    || presentation.kind === 'update_required'
  ) {
    return presentation.message
  }

  return genericMessage
}

export const shouldShowCustomerSearchEmptyState = ({
  showSearchResults,
  searching,
  searchQuery,
  customersCount,
  searchError,
}: CustomerSearchFeedbackState): boolean => (
  showSearchResults
  && !searching
  && searchQuery.length >= 2
  && customersCount === 0
  && !searchError
)

export const shouldShowCustomerSearchErrorState = ({
  searching,
  searchQuery,
  searchError,
}: Pick<CustomerSearchFeedbackState, 'searching' | 'searchQuery' | 'searchError'>): boolean => (
  !searching
  && searchQuery.length >= 2
  && Boolean(searchError)
)
