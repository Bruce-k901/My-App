// Debug script for contractors and assets pages
// Run this in the browser console to check AppContext state and debug logs

console.log("=== DEBUGGING CONTRACTORS & ASSETS PAGES ===");

// Check if we're on the right page
const currentPath = window.location.pathname;
console.log("Current path:", currentPath);

// Check AppContext state
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  const fiber = document.querySelector('#__next')._reactInternalFiber || 
                document.querySelector('#__next')._reactInternals;
  
  if (fiber) {
    console.log("React fiber found, checking for AppContext...");
    
    // Try to find AppContext in the component tree
    let current = fiber;
    let appContextValue = null;
    
    while (current && !appContextValue) {
      if (current.memoizedProps && current.memoizedProps.value) {
        const value = current.memoizedProps.value;
        if (value && (value.companyId !== undefined || value.profile !== undefined)) {
          appContextValue = value;
          break;
        }
      }
      current = current.child || current.sibling || current.return;
    }
    
    if (appContextValue) {
      console.log("AppContext found:", appContextValue);
      console.log("- companyId:", appContextValue.companyId);
      console.log("- profile:", appContextValue.profile);
      console.log("- profile.company_id:", appContextValue.profile?.company_id);
      console.log("- loading:", appContextValue.loading);
    } else {
      console.log("AppContext not found in component tree");
    }
  }
}

// Check Supabase auth
if (window.supabase) {
  window.supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (error) {
      console.error("Supabase auth error:", error);
    } else if (user) {
      console.log("Supabase user:", user);
      console.log("- user.id:", user.id);
      console.log("- user.email:", user.email);
      console.log("- user.app_metadata:", user.app_metadata);
      console.log("- user.user_metadata:", user.user_metadata);
    } else {
      console.log("No Supabase user found");
    }
  });
} else {
  console.log("Supabase not found on window");
}

// Check local storage
console.log("=== LOCAL STORAGE ===");
const authKeys = Object.keys(localStorage).filter(key => key.includes('auth') || key.includes('supabase'));
authKeys.forEach(key => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    console.log(`${key}:`, value);
  } catch (e) {
    console.log(`${key}:`, localStorage.getItem(key));
  }
});

console.log("=== DEBUG SCRIPT COMPLETE ===");
console.log("Check the console logs above for any debug messages from the pages");