// Debug script to check AppContext state and assets query condition
// Run this in the browser console at http://localhost:3001

console.log('=== ASSETS QUERY DEBUG ===');

// Check if React DevTools or AppContext is available
const checkAppContext = () => {
  // Try to find the AppContext from React DevTools or global state
  const reactRoot = document.querySelector('#__next');
  if (reactRoot && reactRoot._reactInternalFiber) {
    console.log('React root found, checking for AppContext...');
  }
  
  // Check localStorage for any stored auth data
  console.log('Auth session:', localStorage.getItem('sb-xijoybubtrgbrhquwrx-auth-token'));
  
  // Check if supabase client is available
  if (window.supabase) {
    console.log('Supabase client available');
    window.supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session);
      if (session) {
        console.log('User metadata:', session.user.user_metadata);
        console.log('App metadata:', session.user.app_metadata);
      }
    });
  }
};

// Check current URL and page
console.log('Current URL:', window.location.href);
console.log('Current pathname:', window.location.pathname);

// Run the check
checkAppContext();

// Also check for any React Query cache
if (window.__REACT_QUERY_STATE__) {
  console.log('React Query state:', window.__REACT_QUERY_STATE__);
}

console.log('=== END DEBUG ===');