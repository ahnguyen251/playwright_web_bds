export const ROUTES = Object.freeze({
  home: '/',
  sales: '/sales',
  rent: '/rent',
  pricing: '/pricing',
  profile: '/profile',
  favorites: '/profile?tab=favorites',
  viewedListings: '/profile?tab=viewed',
  postListing: '/post-listing',
  myListings: '/profile?tab=listings',
  appointments: '/profile?tab=appointments',
  transactions: '/profile?tab=transactions',
  listingDetail: (listingId: string | number): string => `/listings/${String(listingId)}`,
});
