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

interface RawCustomerSearchResult {
  id?: string
  member_id?: string
  username?: string
  fullname?: string
  address?: string
  phonenumber?: string
  plan_name?: string
  auth_status?: string
  owner_name?: string
  online?: boolean
}

export interface CustomerSearchResult {
  id: string
  memberId: string
  username: string
  fullname: string
  phone: string
  address: string
  planName: string
  status: string
  ownerName: string
  isOnline: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const readRawCustomerSearchResults = (payload: unknown): RawCustomerSearchResult[] => {
  if (Array.isArray(payload)) {
    return payload as RawCustomerSearchResult[]
  }

  if (!isRecord(payload)) {
    return []
  }

  const firstLayer = payload.data
  if (Array.isArray(firstLayer)) {
    return firstLayer as RawCustomerSearchResult[]
  }

  if (!isRecord(firstLayer) || !Array.isArray(firstLayer.data)) {
    return []
  }

  return firstLayer.data as RawCustomerSearchResult[]
}

const mapCustomerSearchResult = (
  customer: RawCustomerSearchResult,
): CustomerSearchResult => ({
  id: customer.id || '',
  memberId: customer.member_id || '',
  username: customer.username || '',
  fullname: customer.fullname || customer.username || '-',
  phone: customer.phonenumber || '',
  address: customer.address || '',
  planName: customer.plan_name || '',
  status: customer.auth_status || '',
  ownerName: customer.owner_name || '',
  isOnline: Boolean(customer.online),
})

export const readCustomerSearchResults = (payload: unknown): CustomerSearchResult[] => (
  readRawCustomerSearchResults(payload).map(mapCustomerSearchResult)
)

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
