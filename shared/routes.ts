export const API_ROUTES = {
  RACKETS_SEARCH: '/api/rackets/search',
  RACKET_BY_ID: (id: number) => `/api/rackets/${id}`,
  RECOMMEND: '/api/recommend',
  RECOMMENDATION_RUN: (id: number) => `/api/recommendation-runs/${id}`,
  FEEDBACK: '/api/feedback',
  STRINGERS_SEARCH: '/api/stringers/search',
  CONVERSATIONS: '/api/conversations',
  MESSAGES: (id: number) => `/api/conversations/${id}/messages`,
} as const;
