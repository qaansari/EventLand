import { BASE_URL } from './api';
import { getStoredToken, clearStoredSession } from '../utils/auth';

/**
 * Standard HTTP helper for PayPro Module endpoints.
 */
async function payProRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eventland:auth-expired'));
      }
    }

    let errorMessage = `PayPro API request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.description || errorMessage;
    } catch {
      // Non-JSON response
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return await response.json();
}

/**
 * PayPro Service APIs for React Frontend
 */
export const payProApi = {
  /**
   * Create an invoice / order with PayPro (cco / cmo).
   * @param {Object} orderData 
   */
  createOrder: async (orderData) => {
    return payProRequest('/paypro/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  /**
   * Live status inquiry (ggos / ggosboi).
   * @param {string} orderNumber 
   */
  getOrderStatus: async (orderNumber) => {
    return payProRequest(`/paypro/orders/${encodeURIComponent(orderNumber)}/status`);
  },

  /**
   * Admin: Mark orders as Paid in PayPro (moap).
   * @param {string[]} orderNumbers 
   */
  markOrdersPaid: async (orderNumbers) => {
    return payProRequest('/paypro/orders/mark-paid', {
      method: 'POST',
      body: JSON.stringify(orderNumbers)
    });
  },

  /**
   * Admin: Mark orders as Blocked in PayPro (moab).
   * @param {string[]} orderNumbers 
   */
  markOrdersBlocked: async (orderNumbers) => {
    return payProRequest('/paypro/orders/mark-blocked', {
      method: 'POST',
      body: JSON.stringify(orderNumbers)
    });
  },

  /**
   * Admin: Get Paid Orders report with pagination (gpo).
   * @param {string} [startDate] ISO string or YYYY-MM-DD
   * @param {string} [endDate] ISO string or YYYY-MM-DD
   * @param {number} [pageNumber=1]
   * @param {number} [pageSize=15]
   */
  getPaidOrdersReport: async (startDate, endDate, pageNumber = 1, pageSize = 15) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('pageNumber', pageNumber);
    params.append('pageSize', pageSize);

    return payProRequest(`/paypro/reports/paid-orders?${params.toString()}`);
  },

  /**
   * Admin: Get registered consumers with optional search term.
   * @param {string} [search]
   */
  getConsumers: async (search = '') => {
    const params = new URLSearchParams();
    if (search && search.trim()) params.append('search', search.trim());
    return payProRequest(`/paypro/consumers?${params.toString()}`);
  },

  /**
   * Admin: Create single consumer (cc).
   * @param {Object} consumerData
   */
  createConsumer: async (consumerData) => {
    return payProRequest('/paypro/consumers', {
      method: 'POST',
      body: JSON.stringify(consumerData)
    });
  },

  /**
   * Admin: Create batch consumers (cmc).
   * @param {Array<Object>} consumers
   */
  createBatchConsumers: async (consumers) => {
    return payProRequest('/paypro/consumers/batch', {
      method: 'POST',
      body: JSON.stringify({ consumers })
    });
  },

  /**
   * Admin: Update existing consumer (uc).
   * @param {string} consumerId
   * @param {Object} consumerData
   */
  updateConsumer: async (consumerId, consumerData) => {
    return payProRequest(`/paypro/consumers/${encodeURIComponent(consumerId)}`, {
      method: 'PUT',
      body: JSON.stringify(consumerData)
    });
  },

  /**
   * Admin: Manually trigger reconciliation sweep.
   * @param {number} [olderThanMinutes]
   */
  reconcile: async (olderThanMinutes = null) => {
    const params = new URLSearchParams();
    if (olderThanMinutes !== null && olderThanMinutes !== undefined) {
      params.append('olderThanMinutes', olderThanMinutes);
    }
    return payProRequest(`/paypro/reconcile?${params.toString()}`, {
      method: 'POST'
    });
  }
};

export default payProApi;
